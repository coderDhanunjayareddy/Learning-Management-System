import { query as dbQuery, getClient } from "../repositories/db.repository.js"; // or your db connection
import { AppError } from "../utils/errors.js";

let enrollmentsUserColumnCache = null;

const ensureCourseExamsTable = async () => {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS course_exams (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(course_id, exam_id)
    )
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id)`);
};

const resolveEnrollmentUserColumn = async () => {
  if (enrollmentsUserColumnCache) return enrollmentsUserColumnCache;

  const columnResult = await dbQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'enrollments'
        AND column_name IN ('user_id', 'student_id')
      ORDER BY CASE WHEN column_name = 'user_id' THEN 0 ELSE 1 END
      LIMIT 1
    `
  );

  const columnName = columnResult.rows[0]?.column_name;
  if (!columnName) {
    throw new AppError('Enrollments table is missing user linkage column', 500);
  }

  enrollmentsUserColumnCache = columnName;
  return enrollmentsUserColumnCache;
};

const getStudentCourseIds = async (studentId) => {
  const enrollmentUserColumn = await resolveEnrollmentUserColumn();
  const courseRes = await dbQuery(
    `SELECT course_id FROM enrollments WHERE ${enrollmentUserColumn} = $1`,
    [studentId]
  );
  return courseRes.rows.map((r) => Number(r.course_id)).filter((courseId) => Number.isInteger(courseId) && courseId > 0);
};

const assertStudentCanAccessExam = async ({ examId, courseIds }) => {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return false;
  }

  const accessRes = await dbQuery(
    `
      SELECT 1
      FROM course_exams ce
      WHERE ce.exam_id = $1
        AND ce.course_id = ANY($2::int[])
      LIMIT 1
    `,
    [examId, courseIds]
  );

  return accessRes.rows.length > 0;
};

const computeRemainingSeconds = ({ startedAtRaw, totalDurationMinutes }) => {
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : null;
  const durationSeconds = totalDurationMinutes ? Number(totalDurationMinutes) * 60 : null;
  if (!startedAt || durationSeconds === null || durationSeconds < 0) return null;

  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
  return Math.max(0, durationSeconds - elapsed);
};

const maybeAutoSubmitExpiredAttempt = async (attempt) => {
  if (!attempt || attempt.status !== 'in_progress') return attempt;

  const remainingSeconds = computeRemainingSeconds({
    startedAtRaw: attempt.started_at,
    totalDurationMinutes: attempt.total_duration_minutes,
  });
  if (remainingSeconds === null || remainingSeconds > 0) {
    return attempt;
  }

  const updateResult = await dbQuery(
    `UPDATE exam_attempts
     SET status = 'submitted',
         submitted_at = COALESCE(submitted_at, NOW()),
         auto_submitted = TRUE
     WHERE id = $1
     RETURNING *`,
    [attempt.id]
  );
  const updatedAttempt = updateResult.rows[0];

  return {
    ...attempt,
    ...updatedAttempt,
  };
};

const getAttemptQuestionsAndSections = async (examId) => {
  const result = await dbQuery(
    `
      SELECT
        es.id AS section_id,
        es.title AS section_title,
        es.order_index AS section_order,
        es.instructions AS section_instructions,
        eq.question_id,
        eq.order_index AS question_order,
        q.question_type,
        q.question_text,
        q.options,
        q.marks_positive,
        q.marks_negative
      FROM exam_sections es
      JOIN exam_questions eq ON eq.section_id = es.id
      JOIN questions q ON q.id = eq.question_id
      WHERE es.exam_id = $1
      ORDER BY es.order_index, eq.order_index, eq.id
    `,
    [examId]
  );

  const sectionMap = new Map();
  const questions = [];

  result.rows.forEach((row, index) => {
    const sectionId = Number(row.section_id);
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        id: sectionId,
        title: row.section_title,
        order_index: row.section_order,
        instructions: row.section_instructions ?? null,
        question_count: 0,
      });
    }

    const section = sectionMap.get(sectionId);
    section.question_count += 1;

    questions.push({
      id: Number(row.question_id),
      question_id: Number(row.question_id),
      section_id: sectionId,
      section_order: row.section_order,
      section_title: row.section_title,
      question_order: row.question_order,
      sequence: index + 1,
      question_type: row.question_type,
      question_text: row.question_text,
      options: row.options,
      marks_positive: row.marks_positive,
      marks_negative: row.marks_negative,
    });
  });

  const sections = Array.from(sectionMap.values()).sort((a, b) => {
    if (a.order_index === b.order_index) return a.id - b.id;
    return a.order_index - b.order_index;
  });

  return { sections, questions };
};

const getAttemptStateInternal = async ({ attemptId, studentId }) => {
  const attemptResult = await dbQuery(
    `SELECT ea.*, e.total_duration_minutes, e.start_datetime, e.end_datetime, e.title AS exam_title
     FROM exam_attempts ea
     JOIN exams e ON e.id = ea.exam_id
     WHERE ea.id = $1`,
    [attemptId]
  );

  if (attemptResult.rows.length === 0) {
    throw new AppError('Attempt not found', 404);
  }

  const rawAttempt = attemptResult.rows[0];
  if (Number(rawAttempt.student_id) !== Number(studentId)) {
    throw new AppError('Access denied', 403);
  }

  const attempt = await maybeAutoSubmitExpiredAttempt(rawAttempt);

  const [responsesResult, questionBundle] = await Promise.all([
    dbQuery(
      `SELECT id, question_id, section_id, student_answer, is_marked_for_review, is_attempted, answered_at
       FROM exam_responses
       WHERE attempt_id = $1
       ORDER BY id ASC`,
      [attemptId]
    ),
    getAttemptQuestionsAndSections(attempt.exam_id),
  ]);

  const remainingSeconds = computeRemainingSeconds({
    startedAtRaw: attempt.started_at,
    totalDurationMinutes: attempt.total_duration_minutes,
  });

  return {
    attempt,
    exam: {
      id: attempt.exam_id,
      title: attempt.exam_title,
      total_duration_minutes: attempt.total_duration_minutes,
      start_datetime: attempt.start_datetime,
      end_datetime: attempt.end_datetime,
    },
    sections: questionBundle.sections,
    questions: questionBundle.questions,
    responses: responsesResult.rows,
    remaining_seconds: remainingSeconds,
    status: attempt.status,
    is_read_only: attempt.status !== 'in_progress',
  };
};

export const getStudentContentById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    const clientId = req.user?.client_id;

    try {
        if (!userId || !role) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const isSuperAdmin = role === "super_admin";
        const adminRoles = ["client_admin", "school_owner", "content_authorizer"];
        const isAdminRole = adminRoles.includes(role) || isSuperAdmin;
        const shouldScope = Boolean(clientId) && !isSuperAdmin;

        const params = [id];
        let query = `
            SELECT ci.*
            FROM content_items ci
            JOIN courses c ON ci.course_id = c.id
        `;

        if (!isAdminRole) {
            query += `
                JOIN enrollments e
                  ON e.course_id = c.id
                 AND e.user_id = $2
            `;
            params.push(userId);
        }

        if (shouldScope) {
            query += `WHERE ci.id = $1 AND c.client_id = $${params.length + 1}`;
            params.push(clientId);
        } else {
            query += `WHERE ci.id = $1`;
        }

        const result = await dbQuery(query, params);

        // result.rows is always an array
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Content not found" });
        }

        const content = result.rows[0];

        res.json(content);
    } catch (err) {
        console.error("Error fetching content:", err);
        res.status(500).json({ message: "Error fetching content" });
    }
};

export const getStudentExams = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const studentId = req.user.id;
    await ensureCourseExamsTable();
    const courseIds = await getStudentCourseIds(studentId);
    if (courseIds.length === 0) {
      return res.json([]);
    }

    const examsResult = await dbQuery(
      `
        SELECT
          e.*,
          MIN(ce.course_id)::int AS course_id,
          COALESCE(a.attempt_count, 0) AS attempt_count,
          COALESCE(a.completed, false) AS has_completed,
          MAX(ip.id)::int AS in_progress_attempt_id
        FROM course_exams ce
        JOIN exams e ON e.id = ce.exam_id
        LEFT JOIN (
          SELECT exam_id,
            COUNT(*)::int AS attempt_count,
            MAX(CASE WHEN status IN ('submitted', 'graded') THEN 1 ELSE 0 END)::boolean AS completed
          FROM exam_attempts
          WHERE student_id = $1
          GROUP BY exam_id
        ) a ON a.exam_id = e.id
        LEFT JOIN LATERAL (
          SELECT ea.id
          FROM exam_attempts ea
          WHERE ea.exam_id = e.id
            AND ea.student_id = $1
            AND ea.status = 'in_progress'
          ORDER BY ea.started_at DESC, ea.id DESC
          LIMIT 1
        ) ip ON TRUE
        WHERE ce.course_id = ANY($2::int[])
          AND e.status IN ('published', 'active', 'completed')
        GROUP BY e.id, a.attempt_count, a.completed
        ORDER BY e.start_datetime DESC, e.id DESC
      `,
      [studentId, courseIds]
    );

    const now = new Date();
    const exams = examsResult.rows.map((item) => {
      let computed_status = item.status || 'draft';
      const startDt = item.start_datetime ? new Date(item.start_datetime) : null;
      const endDt = item.end_datetime ? new Date(item.end_datetime) : null;

      if (item.has_completed) {
        computed_status = 'completed';
      } else if (item.attempt_count >= (item.max_attempts || 1)) {
        computed_status = 'max_attempts_reached';
      } else if (startDt && now < startDt) {
        computed_status = 'upcoming';
      } else if (startDt && endDt && now >= startDt && now <= endDt) {
        computed_status = 'ongoing';
      } else if (endDt && now > endDt) {
        computed_status = 'expired';
      } else if (item.status) {
        computed_status = item.status;
      }

      return {
        ...item,
        course_id: item.course_id || null,
        computed_status,
        in_progress_attempt_id: item.in_progress_attempt_id ? Number(item.in_progress_attempt_id) : null,
        has_in_progress_attempt: Boolean(item.in_progress_attempt_id),
      };
    });

    res.json(exams);
  } catch (err) {
    console.error('Error fetching student exams:', err);
    res.status(500).json({ message: 'Error fetching student exams' });
  }
};

export const getAttemptState = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const attemptId = Number(req.params.aid);
    if (!attemptId || Number.isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt id' });
    }

    const state = await getAttemptStateInternal({ attemptId, studentId: req.user.id });
    res.json(state);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Error fetching attempt state:', err);
    res.status(500).json({ message: 'Error fetching attempt state' });
  }
};

export const startExamAttempt = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const examId = Number(req.params.id);
    if (!examId || Number.isNaN(examId)) {
      return res.status(400).json({ message: 'Invalid exam id' });
    }

    const examResult = await dbQuery('SELECT * FROM exams WHERE id = $1', [examId]);
    if (examResult.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    await ensureCourseExamsTable();
    const enrolledCourseIds = await getStudentCourseIds(req.user.id);
    const hasAccess = await assertStudentCanAccessExam({
      examId,
      courseIds: enrolledCourseIds,
    });
    if (!hasAccess) {
      return res.status(403).json({ message: 'Exam is not assigned to your enrolled courses' });
    }

    const exam = examResult.rows[0];
    const now = new Date();
    const startDt = new Date(exam.start_datetime);
    const endDt = new Date(exam.end_datetime);

    if (!['published', 'active'].includes(exam.status)) {
      return res.status(403).json({ message: 'Exam is not available for attempt' });
    }
    if (now < startDt) {
      return res.status(403).json({ message: 'Exam has not started yet' });
    }
    if (now > endDt) {
      return res.status(403).json({ message: 'Exam has already ended' });
    }

    const existingAttemptResult = await dbQuery(
      `SELECT id
       FROM exam_attempts
       WHERE exam_id = $1
         AND student_id = $2
         AND status = 'in_progress'
       ORDER BY started_at DESC, id DESC
       LIMIT 1`,
      [examId, req.user.id]
    );
    const existingAttemptId = existingAttemptResult.rows[0]?.id;
    if (existingAttemptId) {
      const runtimeState = await getAttemptStateInternal({
        attemptId: existingAttemptId,
        studentId: req.user.id,
      });
      return res.json(runtimeState);
    }

    const previousAttempts = await dbQuery(
      'SELECT COUNT(*)::int AS count FROM exam_attempts WHERE exam_id = $1 AND student_id = $2',
      [examId, req.user.id]
    );
    const attemptCount = Number(previousAttempts.rows[0]?.count || 0);

    const maxAttempts = exam.max_attempts ? Number(exam.max_attempts) : 1;
    if (attemptCount >= maxAttempts) {
      return res.status(403).json({ message: 'Max attempts reached' });
    }

    const attemptNumber = attemptCount + 1;

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const insertAttemptRes = await client.query(
        `INSERT INTO exam_attempts
         (exam_id, student_id, attempt_number, started_at, status)
         VALUES ($1, $2, $3, NOW(), 'in_progress')
         RETURNING *`,
        [examId, req.user.id, attemptNumber]
      );

      const attempt = insertAttemptRes.rows[0];

      const questionsRes = await client.query(
        `SELECT eq.question_id, eq.section_id, eq.order_index AS question_order, es.order_index AS section_order
         FROM exam_questions eq
         JOIN exam_sections es ON es.id = eq.section_id
         WHERE es.exam_id = $1
         ORDER BY es.order_index, eq.order_index`,
        [examId]
      );

      const questionRows = questionsRes.rows;

      for (const q of questionRows) {
        await client.query(
          `INSERT INTO exam_responses (attempt_id, question_id, section_id, is_marked_for_review, is_attempted)
           VALUES ($1, $2, $3, FALSE, FALSE)
           ON CONFLICT (attempt_id, question_id) DO NOTHING`,
          [attempt.id, q.question_id, q.section_id]
        );
      }

      await client.query('COMMIT');
      const runtimeState = await getAttemptStateInternal({
        attemptId: attempt.id,
        studentId: req.user.id,
      });
      return res.json(runtimeState);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Error starting exam attempt:', err);
    res.status(500).json({ message: 'Error starting exam attempt' });
  }
};

export const saveExamResponse = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const attemptId = Number(req.params.aid);
    if (!attemptId || Number.isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt id' });
    }

    const responses = req.body?.responses;
    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ message: 'responses must be a non-empty array' });
    }

    const attemptResult = await dbQuery(
      `SELECT ea.*, e.total_duration_minutes, e.start_datetime, e.end_datetime
       FROM exam_attempts ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.id = $1`,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attemptResult.rows[0];
    if (Number(attempt.student_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(409).json({ message: 'Cannot save responses for a non-active attempt' });
    }

    const durationSeconds = attempt.total_duration_minutes ? Number(attempt.total_duration_minutes) * 60 : null;
    if (durationSeconds !== null && durationSeconds >= 0) {
      const elapsed = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
      if (elapsed > durationSeconds) {
        await dbQuery(
          `UPDATE exam_attempts SET status = 'submitted', submitted_at = NOW(), auto_submitted = TRUE WHERE id = $1`,
          [attemptId]
        );
        return res.status(403).json({ message: 'Exam time expired' });
      }
    }

    if (req.body?.omr_lock) {
      return res.status(423).json({ message: 'OMR lock enabled, cannot save responses at this time' });
    }

    const questionIds = responses
      .map((item) => Number(item.question_id))
      .filter((id) => id && !Number.isNaN(id));

    if (questionIds.length === 0) {
      return res.status(400).json({ message: 'responses must include question_id values' });
    }

    const questionMetaRes = await dbQuery(
      `SELECT eq.question_id, eq.section_id
       FROM exam_questions eq
       JOIN exam_sections es ON es.id = eq.section_id
       WHERE es.exam_id = $1
         AND eq.question_id = ANY($2::int[])`,
      [attempt.exam_id, questionIds]
    );

    const questionMap = questionMetaRes.rows.reduce((acc, row) => {
      acc[row.question_id] = row.section_id;
      return acc;
    }, {});

    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const item of responses) {
        const questionId = Number(item.question_id);
        if (!questionId || Number.isNaN(questionId)) {
          continue;
        }

        const sectionId = questionMap[questionId];
        if (!sectionId) {
          continue;
        }

        const studentAnswer = item.student_answer === undefined ? null : item.student_answer;
        const isAttempted = item.is_attempted !== undefined
          ? Boolean(item.is_attempted)
          : !(studentAnswer === null || studentAnswer === '');
        const isMarkedForReview = Boolean(item.is_marked_for_review);

        await client.query(
          `INSERT INTO exam_responses
             (attempt_id, question_id, section_id, student_answer, is_attempted, answered_at, is_marked_for_review)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)
           ON CONFLICT (attempt_id, question_id)
           DO UPDATE SET student_answer = EXCLUDED.student_answer,
                         is_attempted = EXCLUDED.is_attempted,
                         answered_at = EXCLUDED.answered_at,
                         is_marked_for_review = EXCLUDED.is_marked_for_review`,
          [attemptId, questionId, sectionId, studentAnswer, isAttempted, isMarkedForReview]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const updatedState = await getAttemptStateInternal({ attemptId, studentId: req.user.id });
    res.json({ message: 'Responses saved', attemptState: updatedState });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Error saving exam response:', err);
    res.status(500).json({ message: 'Error saving exam response' });
  }
};

// ============================================
// TASK 1: Submit Exam API
// ============================================
export const submitExamAttempt = async (req, res) => {
  const attemptId = Number(req.params.aid);
  const studentId = req.user?.id;

  if (!attemptId || Number.isNaN(attemptId)) {
    return res.status(400).json({ error: 'Invalid attempt ID' });
  }

  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch attempt + exam window
    const attemptRes = await client.query(
      `SELECT ea.*, e.end_datetime, e.start_datetime
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       WHERE ea.id = $1 AND ea.student_id = $2`,
      [attemptId, studentId]
    );

    if (attemptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Attempt not found or access denied' });
    }

    const attempt = attemptRes.rows[0];
    const now = new Date();
    const startDt = new Date(attempt.start_datetime);
    const endDt = new Date(attempt.end_datetime);

    // Validate exam window
    if (now < startDt) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Exam has not started yet' });
    }

    const isLate = now > endDt;

    // Validate attempt not already submitted
    if (attempt.status !== 'in_progress') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Attempt already submitted or graded' });
    }

    // 2. Atomic status transition (WHERE status='in_progress')
    const updateRes = await client.query(
      `UPDATE exam_attempts
       SET status = 'submitted', submitted_at = $1, auto_submitted = $2
       WHERE id = $3 AND status = 'in_progress'
       RETURNING id`,
      [now, isLate, attemptId]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Attempt already submitted (race condition)' });
    }

    // 3. Trigger grading
    await gradeAttempt(client, attemptId);

    await client.query('COMMIT');

    // Return attempt summary
    const finalAttempt = await dbQuery(
      `SELECT id, exam_id, student_id, attempt_number, status, submitted_at, total_score, 
              total_correct, total_wrong, total_unattempted
       FROM exam_attempts WHERE id = $1`,
      [attemptId]
    );

    return res.status(200).json({
      message: 'Exam submitted and graded successfully',
      attempt: finalAttempt.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit exam error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// ============================================
// TASK 2 & 3: Grading Functions by Question Type
// ============================================

// Grade single MCQ - exact match
const gradeMCQSingle = (studentAnswer, correctAnswer) => {
  if (studentAnswer === null || studentAnswer === '' || studentAnswer === undefined) {
    return { isCorrect: false, isUnattempted: true };
  }
  // Normalize to string for comparison
  const normalizedStudent = String(studentAnswer).trim();
  const normalizedCorrect = String(correctAnswer).trim();
  return {
    isCorrect: normalizedStudent === normalizedCorrect,
    isUnattempted: false
  };
};

// Grade multiple MCQ - exact full set match
const gradeMCQMultiple = (studentAnswer, correctAnswer) => {
  if (!studentAnswer || (Array.isArray(studentAnswer) && studentAnswer.length === 0)) {
    return { isCorrect: false, isUnattempted: true };
  }

  const studentArray = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
  const correctArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

  // Normalize and sort for comparison
  const studentNorm = studentArray.map(s => String(s).trim()).sort();
  const correctNorm = correctArray.map(c => String(c).trim()).sort();

  const isExactMatch = studentNorm.length === correctNorm.length &&
    studentNorm.every((val, idx) => val === correctNorm[idx]);

  return {
    isCorrect: isExactMatch,
    isUnattempted: false
  };
};

// Grade numerical - tolerance check (default 0.01)
const gradeNumerical = (studentAnswer, correctAnswer, tolerance = 0.01) => {
  if (studentAnswer === null || studentAnswer === '' || studentAnswer === undefined) {
    return { isCorrect: false, isUnattempted: true };
  }

  try {
    const studentNum = parseFloat(studentAnswer);
    const correctNum = parseFloat(correctAnswer);

    if (Number.isNaN(studentNum) || Number.isNaN(correctNum)) {
      return { isCorrect: false, isUnattempted: false };
    }

    const diff = Math.abs(studentNum - correctNum);
    return {
      isCorrect: diff <= tolerance,
      isUnattempted: false
    };
  } catch (e) {
    return { isCorrect: false, isUnattempted: false };
  }
};

// Grade true/false - exact match
const gradeTrueFalse = (studentAnswer, correctAnswer) => {
  if (studentAnswer === null || studentAnswer === '' || studentAnswer === undefined) {
    return { isCorrect: false, isUnattempted: true };
  }

  // Normalize to lowercase string
  const normalizedStudent = String(studentAnswer).toLowerCase().trim();
  const normalizedCorrect = String(correctAnswer).toLowerCase().trim();

  return {
    isCorrect: normalizedStudent === normalizedCorrect,
    isUnattempted: false
  };
};

// Grade integer - exact match after parsing
const gradeInteger = (studentAnswer, correctAnswer) => {
  if (studentAnswer === null || studentAnswer === '' || studentAnswer === undefined) {
    return { isCorrect: false, isUnattempted: true };
  }

  try {
    const studentInt = parseInt(studentAnswer, 10);
    const correctInt = parseInt(correctAnswer, 10);

    if (Number.isNaN(studentInt) || Number.isNaN(correctInt)) {
      return { isCorrect: false, isUnattempted: false };
    }

    return {
      isCorrect: studentInt === correctInt,
      isUnattempted: false
    };
  } catch (e) {
    return { isCorrect: false, isUnattempted: false };
  }
};

// ============================================
// Task 4: Grading Orchestrator + Totals
// ============================================

const gradeAttempt = async (client, attemptId) => {
  // Fetch all responses with question/section scoring metadata
  const responsesRes = await client.query(
    `SELECT 
       er.id,
       er.question_id,
       er.section_id,
       er.student_answer,
       q.question_type,
       q.correct_answer,
       q.marks_positive,
       q.marks_negative,
       eq.marks_override,
       eq.negative_override,
       es.marks_per_question,
       es.negative_marks
     FROM exam_responses er
     JOIN questions q ON er.question_id = q.id
     JOIN exam_questions eq ON er.question_id = eq.question_id AND er.section_id = eq.section_id
     JOIN exam_sections es ON er.section_id = es.id
     WHERE er.attempt_id = $1`,
    [attemptId]
  );

  const responses = responsesRes.rows;
  let totalScore = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnattempted = 0;

  // Grade each response
  for (const response of responses) {
    const {
      id: responseId,
      question_type: questionType,
      student_answer: studentAnswer,
      correct_answer: correctAnswer,
      marks_positive: markPositive,
      marks_negative: markNegative,
      marks_override: marksOverride,
      negative_override: negativeOverride,
      marks_per_question: markPerQuestion,
      negative_marks: negativeMarks
    } = response;

    // Mark source resolution: override → section default → question default
    const posMarks = marksOverride !== null ? Number(marksOverride) :
      (markPerQuestion !== null ? Number(markPerQuestion) :
        (markPositive !== null ? Number(markPositive) : 0));

    const negMarks = negativeOverride !== null ? Number(negativeOverride) :
      (negativeMarks !== null ? Number(negativeMarks) :
        (markNegative !== null ? Number(markNegative) : 0));

    let isCorrect = false;
    let isUnattempted = false;
    let marksAwarded = 0;

    // Grade based on question type
    switch (questionType) {
      case 'mcq_single': {
        const result = gradeMCQSingle(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        break;
      }
      case 'mcq_multiple': {
        const result = gradeMCQMultiple(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        break;
      }
      case 'numerical': {
        const result = gradeNumerical(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        break;
      }
      case 'true_false': {
        const result = gradeTrueFalse(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        break;
      }
      case 'integer': {
        const result = gradeInteger(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        break;
      }
      default:
        // Skip unsupported types for MVP
        continue;
    }

    // Calculate marks awarded
    if (isUnattempted) {
      marksAwarded = 0;
      totalUnattempted++;
    } else if (isCorrect) {
      marksAwarded = posMarks;
      totalCorrect++;
    } else {
      // Negative marking only on wrong (not unattempted)
      marksAwarded = -negMarks;
      totalWrong++;
    }

    totalScore += marksAwarded;

    // Update response with grading results
    await client.query(
      `UPDATE exam_responses
       SET is_correct = $1, marks_awarded = $2
       WHERE id = $3`,
      [isCorrect, marksAwarded, responseId]
    );
  }

  // Round final score to 2 decimal places
  const finalScore = Math.round(totalScore * 100) / 100;

  // Calculate pass/fail: 50% threshold for MVP
  const totalPossibleMarks = responses.length * 4; // Default marks if all had default 4 marks
  const isPassed = finalScore >= (totalPossibleMarks * 0.5);

  // Update attempt with final totals
  await client.query(
    `UPDATE exam_attempts
     SET status = 'graded',
         total_score = $1,
         total_correct = $2,
         total_wrong = $3,
         total_unattempted = $4
     WHERE id = $5`,
    [finalScore, totalCorrect, totalWrong, totalUnattempted, attemptId]
  );
};


