import { query as dbQuery, getClient } from '../repositories/db.repository.js';
import { AppError, handleServiceError } from '../utils/errors.js';
import { parseNullableInt, parseRequiredInt, requireString } from '../schemas/questions.schema.js';
import { getAttemptResultPayloadByAttemptId } from './student.service.js';

const VALID_EXAM_STATUSES = ['draft', 'published', 'active', 'completed'];
let examResultColumnsEnsured = false;
let examInstructionsColumnKnown = null;

const isSuperAdmin = (role) => role === 'super_admin';
const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';
const isClientAdmin = (role) => role === 'client_admin';
const isSchoolOwner = (role) => role === 'school_owner';
const isTeacher = (role) => role === 'teacher';

const parseBoolean = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  throw new AppError(`${fieldName} must be a boolean`, 400);
};

const parseDateTime = (value, fieldName) => {
  if (!value) throw new AppError(`${fieldName} is required`, 400);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid datetime`, 400);
  }
  return parsed.toISOString();
};

const parseOptionalNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new AppError(`${fieldName} must be a number`, 400);
  return parsed;
};

const parsePagination = (query) => {
  const page = Math.max(parseInt(query?.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(query?.page_size || '20', 10), 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const ensureExamResultConfigColumns = async () => {
  if (examResultColumnsEnsured) return;
  await dbQuery(`
    ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS show_score BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_pass_or_fail BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_solutions_to_user BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS instructions TEXT
  `);
  examInstructionsColumnKnown = true;
  examResultColumnsEnsured = true;
};

const hasExamInstructionsColumn = async () => {
  if (examInstructionsColumnKnown !== null) return examInstructionsColumnKnown;

  const result = await dbQuery(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exams'
        AND column_name = 'instructions'
      LIMIT 1
    `
  );

  examInstructionsColumnKnown = result.rows.length > 0;
  return examInstructionsColumnKnown;
};

const ensureClientScope = (clientId, role) => {
  if (isPlatformAdmin(role)) return null;
  if (!clientId) {
    throw new AppError('client_id is required for this role', 400);
  }
  return clientId;
};

const fetchUserSchoolIds = async (userId) => {
  const result = await dbQuery(
    `SELECT school_id FROM school_memberships WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  return result.rows.map((row) => Number(row.school_id));
};

const resolveSchoolScope = async ({ schoolId, user, clientId }) => {
  if (!schoolId) return { schoolId: null, resolvedClientId: clientId };

  const schoolResult = await dbQuery(`SELECT id, client_id FROM schools WHERE id = $1`, [schoolId]);
  if (schoolResult.rows.length === 0) {
    throw new AppError('School not found', 404);
  }
  const school = schoolResult.rows[0];

  if (clientId && Number(school.client_id) !== Number(clientId)) {
    throw new AppError('School does not belong to this client', 403);
  }

  const resolvedClientId = clientId || Number(school.client_id);
  if (!resolvedClientId) {
    throw new AppError('client_id is required', 400);
  }

  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (!schoolIds.includes(Number(schoolId))) {
      throw new AppError('Access denied for this school', 403);
    }
  }

  return { schoolId: Number(schoolId), resolvedClientId };
};

const ensureValidStatus = (status) => {
  if (!VALID_EXAM_STATUSES.includes(status)) {
    throw new AppError('Invalid status', 400);
  }
};

const buildExamWhere = async ({ user, query }) => {
  const params = [];
  const conditions = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const explicitClientId = parseNullableInt(query?.client_id, 'client_id');
  const clientId = isPlatformAdmin(user?.role) ? explicitClientId : (user?.client_id ?? null);

  if (clientId) {
    conditions.push(`e.client_id = ${addParam(clientId)}`);
  }

  let schoolIds = [];
  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(e.school_id IS NULL OR e.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`e.school_id IS NULL`);
    }
  }

  const schoolIdFilter = parseNullableInt(query?.school_id, 'school_id');
  if (schoolIdFilter) {
    if ((isSchoolOwner(user?.role) || isTeacher(user?.role)) && !schoolIds.includes(schoolIdFilter)) {
      throw new AppError('Access denied for this school', 403);
    }
    conditions.push(`e.school_id = ${addParam(schoolIdFilter)}`);
  }

  if (query?.status) {
    const status = String(query.status).trim();
    ensureValidStatus(status);
    conditions.push(`e.status = ${addParam(status)}`);
  }

  const mine = (() => {
    if (query?.mine === undefined || query?.mine === null || query?.mine === '') return false;
    const val = String(query.mine).trim().toLowerCase();
    return ['1', 'true', 'yes'].includes(val);
  })();

  const createdBy = parseNullableInt(query?.created_by, 'created_by');
  if (isTeacher(user?.role)) {
    conditions.push(`e.created_by = ${addParam(user.id)}`);
  } else if (mine) {
    conditions.push(`e.created_by = ${addParam(user.id)}`);
  } else if (createdBy) {
    conditions.push(`e.created_by = ${addParam(createdBy)}`);
  }

  if (query?.q) {
    const q = String(query.q).trim();
    if (q.length > 0) {
      conditions.push(`(e.title ILIKE ${addParam(`%${q}%`)} OR COALESCE(e.description, '') ILIKE $${params.length})`);
    }
  }

  return { conditions, params };
};

const getExamByIdForAccess = async ({ examId, user, requireOwner = false }) => {
  const id = parseRequiredInt(examId, 'id');
  const result = await dbQuery(`SELECT * FROM exams WHERE id = $1`, [id]);
  if (result.rows.length === 0) {
    throw new AppError('Exam not found', 404);
  }
  const exam = result.rows[0];

  if (!isPlatformAdmin(user?.role)) {
    const clientId = user?.client_id;
    if (!clientId || Number(exam.client_id) !== Number(clientId)) {
      throw new AppError('Exam not found', 404);
    }
  }

  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (exam.school_id && !schoolIds.includes(Number(exam.school_id))) {
      throw new AppError('Access denied', 403);
    }
  }

  if (requireOwner && Number(exam.created_by) !== Number(user.id) && !isPlatformAdmin(user?.role) && !isClientAdmin(user?.role) && !isSchoolOwner(user?.role)) {
    throw new AppError('Access denied', 403);
  }

  return exam;
};

const getSectionByIdForAccess = async ({ examId, sectionId, user, requireOwner = false }) => {
  const parsedExamId = parseRequiredInt(examId, 'id');
  const parsedSectionId = parseRequiredInt(sectionId, 'sectionId');
  const result = await dbQuery(
    `
    SELECT es.*, e.client_id, e.school_id, e.created_by, e.status
    FROM exam_sections es
    JOIN exams e ON e.id = es.exam_id
    WHERE es.id = $1 AND es.exam_id = $2
    `,
    [parsedSectionId, parsedExamId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Section not found', 404);
  }

  const row = result.rows[0];
  await getExamByIdForAccess({ examId: row.exam_id, user, requireOwner });
  return row;
};

const ensureExamEditable = (exam) => {
  if (!exam) {
    throw new AppError('Exam not found', 404);
  }
  if (exam.status !== 'draft') {
    throw new AppError('Exam is locked and cannot be modified', 403);
  }
};

const ensureExamDeletable = (exam) => {
  if (!exam) {
    throw new AppError('Exam not found', 404);
  }

  if (!VALID_EXAM_STATUSES.includes(String(exam.status))) {
    throw new AppError('Exam status is invalid and cannot be deleted', 409);
  }
};

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

const parseCourseIds = (value) => {
  if (!Array.isArray(value)) {
    throw new AppError('course_ids must be an array', 400);
  }

  const normalized = [...new Set(value.map((item) => Number(item)).filter((id) => Number.isInteger(id) && id > 0))];
  if (normalized.length !== value.length) {
    throw new AppError('course_ids must contain unique positive integers', 400);
  }
  return normalized;
};

const listAssignedCoursesForExam = async (examId) => {
  const assignedResult = await dbQuery(
    `
      SELECT c.id, c.title, c.description, c.published, c.created_at, ce.assigned_at, ce.assigned_by
      FROM course_exams ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.exam_id = $1
      ORDER BY c.title ASC, c.id ASC
    `,
    [examId]
  );
  return assignedResult.rows;
};

const validateCoursesForExamAssignment = async ({ courseIds, exam, user }) => {
  if (courseIds.length === 0) return;

  const courseResult = await dbQuery(
    `SELECT id, client_id, school_id FROM courses WHERE id = ANY($1::int[])`,
    [courseIds]
  );

  if (courseResult.rows.length !== courseIds.length) {
    throw new AppError('One or more course_ids are invalid', 404);
  }

  let scopedSchoolIds = null;
  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    scopedSchoolIds = await fetchUserSchoolIds(user.id);
  }

  for (const course of courseResult.rows) {
    if (Number(course.client_id) !== Number(exam.client_id)) {
      throw new AppError('Course does not belong to the same client as the exam', 403);
    }

    if (exam.school_id && Number(course.school_id) !== Number(exam.school_id)) {
      throw new AppError('Course does not belong to the same school as the exam', 403);
    }

    if (scopedSchoolIds && course.school_id && !scopedSchoolIds.includes(Number(course.school_id))) {
      throw new AppError('Access denied for one or more courses', 403);
    }
  }
};

export const addQuestionToSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: examId, sectionId } = req.params;
    const questionId = parseRequiredInt(req.body?.question_id, 'question_id');

    const section = await getSectionByIdForAccess({ examId, sectionId, user: req.user, requireOwner: isTeacher(req.user.role) });
    const exam = await getExamByIdForAccess({ examId, user: req.user, requireOwner: isTeacher(req.user.role) });
    ensureExamEditable(exam);

    const questionResult = await dbQuery('SELECT * FROM questions WHERE id = $1', [questionId]);
    if (questionResult.rows.length === 0) {
      throw new AppError('Question not found', 404);
    }

    const question = questionResult.rows[0];
    if (String(question.status).toLowerCase() !== 'approved') {
      throw new AppError('Only approved questions can be added', 400);
    }

    if (question.client_id && Number(question.client_id) !== Number(exam.client_id)) {
      throw new AppError('Question does not belong to the same client scope as the exam', 403);
    }

    if (question.school_id && exam.school_id && Number(question.school_id) !== Number(exam.school_id)) {
      throw new AppError('Question does not belong to the same school scope as the exam', 403);
    }

    const duplicateCheck = await dbQuery(
      'SELECT 1 FROM exam_questions WHERE section_id = $1 AND question_id = $2',
      [sectionId, questionId]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new AppError('Question already exists in this section', 409);
    }

    let orderIndex = req.body?.order_index !== undefined ? parseRequiredInt(req.body.order_index, 'order_index') : null;
    if (orderIndex !== null) {
      if (orderIndex <= 0) throw new AppError('order_index must be greater than 0', 400);
    } else {
      const nextResult = await dbQuery(
        'SELECT COALESCE(MAX(order_index), 0) + 1 AS next_index FROM exam_questions WHERE section_id = $1',
        [sectionId]
      );
      orderIndex = Number(nextResult.rows[0].next_index);
    }

    const insertResult = await dbQuery(
      `INSERT INTO exam_questions (section_id, question_id, order_index)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sectionId, questionId, orderIndex]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to add question to section');
  }
};

export const publishExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user, requireOwner: isTeacher(req.user.role) });

    if (exam.status === 'published' || exam.status === 'active' || exam.status === 'completed') {
      throw new AppError('Exam is already published or locked', 409);
    }

    const sectionCountRes = await dbQuery('SELECT COUNT(*)::int AS count FROM exam_sections WHERE exam_id = $1', [exam.id]);
    const sectionCount = Number(sectionCountRes.rows[0]?.count || 0);
    if (sectionCount === 0) {
      throw new AppError('Exam must have at least one section before publishing', 400);
    }

    const questionCountRes = await dbQuery(
      `SELECT COUNT(eq.*)::int AS count
       FROM exam_sections es
       JOIN exam_questions eq ON eq.section_id = es.id
       WHERE es.exam_id = $1`,
      [exam.id]
    );
    const questionCount = Number(questionCountRes.rows[0]?.count || 0);
    if (questionCount === 0) {
      throw new AppError('Exam must have at least one question before publishing', 400);
    }

    const attemptCheck = await dbQuery('SELECT COUNT(*)::int AS count FROM exam_attempts WHERE exam_id = $1', [exam.id]);
    if (Number(attemptCheck.rows[0]?.count || 0) > 0) {
      throw new AppError('Cannot publish exam after attempts have been made', 403);
    }

    if (!exam.start_datetime || !exam.end_datetime || new Date(exam.end_datetime) <= new Date(exam.start_datetime)) {
      throw new AppError('Exam must have valid start and end datetimes before publishing', 400);
    }

    const updateResult = await dbQuery(
      `UPDATE exams
       SET status = 'published', updated_at = NOW()
       WHERE id = $1
         AND status = 'draft'
         AND NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id = $1)
       RETURNING *`,
      [exam.id]
    );
    if (updateResult.rows.length === 0) {
      throw new AppError('Exam status changed. Please refresh and try again.', 409);
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to publish exam');
  }
};

export const getExamAssignedCourses = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureCourseExamsTable();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });

    const courses = await listAssignedCoursesForExam(exam.id);
    res.json({
      exam_id: Number(exam.id),
      assigned_count: courses.length,
      courses,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load assigned courses');
  }
};

export const assignExamCourses = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureCourseExamsTable();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });

    const courseIds = parseCourseIds(req.body?.course_ids);
    await validateCoursesForExamAssignment({ courseIds, exam, user: req.user });

    const tx = await getClient();
    try {
      await tx.query('BEGIN');
      await tx.query('DELETE FROM course_exams WHERE exam_id = $1', [exam.id]);

      if (courseIds.length > 0) {
        await tx.query(
          `
            INSERT INTO course_exams (course_id, exam_id, assigned_by)
            SELECT UNNEST($1::int[]), $2, $3
            ON CONFLICT (course_id, exam_id) DO UPDATE
            SET assigned_by = EXCLUDED.assigned_by,
                assigned_at = NOW()
          `,
          [courseIds, exam.id, req.user.id]
        );
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const courses = await listAssignedCoursesForExam(exam.id);
    res.json({
      exam_id: Number(exam.id),
      assigned_count: courses.length,
      courses,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to assign exam courses');
  }
};

export const listExams = async (req, res) => {

  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();
    await ensureCourseExamsTable();

    const { page, pageSize, offset } = parsePagination(req.query);
    const { conditions, params } = await buildExamWhere({ user: req.user, query: req.query });
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await dbQuery(`SELECT COUNT(*)::int AS total FROM exams e ${whereClause}`, params);
    const total = Number(countResult.rows[0]?.total || 0);

    const listParams = [...params, pageSize, offset];
    const result = await dbQuery(
      `
      SELECT
        e.*,
        COALESCE(course_stats.course_count, 0)::int AS course_count,
        COALESCE(course_stats.course_names, ARRAY[]::text[]) AS course_names,
        COALESCE(section_stats.section_count, 0)::int AS section_count,
        COALESCE(section_stats.question_count, 0)::int AS question_count,
        COALESCE(attempt_stats.attempts_count, 0)::int AS attempts_count,
        COALESCE(NULLIF(TRIM(u.full_name), ''), u.email, NULL) AS created_by_name
      FROM exams e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT ce.course_id) AS course_count,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.title ORDER BY c.title), NULL) AS course_names
        FROM course_exams ce
        LEFT JOIN courses c ON c.id = ce.course_id
        WHERE ce.exam_id = e.id
      ) course_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT es.id) AS section_count,
          COUNT(eq.id) AS question_count
        FROM exam_sections es
        LEFT JOIN exam_questions eq ON eq.section_id = es.id
        WHERE es.exam_id = e.id
      ) section_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS attempts_count
        FROM exam_attempts ea
        WHERE ea.exam_id = e.id
      ) attempt_stats ON TRUE
      ${whereClause}
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
      `,
      listParams
    );

    res.json({
      data: result.rows,
      page,
      page_size: pageSize,
      total,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exams');
  }
};

export const getExamById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();
    await ensureCourseExamsTable();

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user, requireOwner: isTeacher(req.user.role) });

    const examResult = await dbQuery(
      `
      SELECT
        e.*,
        COALESCE(course_stats.course_count, 0)::int AS course_count,
        COALESCE(course_stats.course_names, ARRAY[]::text[]) AS course_names,
        COALESCE(section_stats.section_count, 0)::int AS section_count,
        COALESCE(section_stats.question_count, 0)::int AS question_count,
        COALESCE(attempt_stats.attempts_count, 0)::int AS attempts_count,
        COALESCE(NULLIF(TRIM(u.full_name), ''), u.email, NULL) AS created_by_name
      FROM exams e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT ce.course_id) AS course_count,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.title ORDER BY c.title), NULL) AS course_names
        FROM course_exams ce
        LEFT JOIN courses c ON c.id = ce.course_id
        WHERE ce.exam_id = e.id
      ) course_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT es.id) AS section_count,
          COUNT(eq.id) AS question_count
        FROM exam_sections es
        LEFT JOIN exam_questions eq ON eq.section_id = es.id
        WHERE es.exam_id = e.id
      ) section_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS attempts_count
        FROM exam_attempts ea
        WHERE ea.exam_id = e.id
      ) attempt_stats ON TRUE
      WHERE e.id = $1
      `,
      [exam.id]
    );

    const sectionsResult = await dbQuery(
      `
      SELECT
        es.*,
        COALESCE(COUNT(eq.id), 0)::int AS question_count
      FROM exam_sections es
      LEFT JOIN exam_questions eq ON eq.section_id = es.id
      WHERE es.exam_id = $1
      GROUP BY es.id
      ORDER BY es.order_index, es.id
      `,
      [exam.id]
    );

    const assignedCourses = await listAssignedCoursesForExam(exam.id);

    res.json({
      ...examResult.rows[0],
      sections: sectionsResult.rows,
      assigned_courses: assignedCourses,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exam');
  }
};

export const getExamResults = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });

    const { page, pageSize, offset } = parsePagination(req.query);

    const countResult = await dbQuery(
      `SELECT COUNT(*)::int AS total FROM exam_attempts WHERE exam_id = $1`,
      [exam.id]
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const attemptsResult = await dbQuery(
      `
      SELECT
        ea.id,
        ea.student_id,
        ea.attempt_number,
        ea.status,
        ea.started_at,
        ea.submitted_at,
        ea.auto_submitted,
        u.full_name,
        u.email
      FROM exam_attempts ea
      LEFT JOIN users u ON u.id = ea.student_id
      WHERE ea.exam_id = $1
      ORDER BY ea.started_at DESC, ea.id DESC
      LIMIT $2 OFFSET $3
      `,
      [exam.id, pageSize, offset]
    );

    const results = await Promise.all(
      attemptsResult.rows.map(async (attemptRow) => {
        try {
          const payload = await getAttemptResultPayloadByAttemptId({
            attemptId: Number(attemptRow.id),
            allowUnreleased: true,
          });
          return {
            ...payload,
            student: {
              id: Number(attemptRow.student_id),
              name: attemptRow.full_name || attemptRow.email || null,
              email: attemptRow.email || null,
            },
          };
        } catch (err) {
          if (err instanceof AppError && err.status === 409) {
            return {
              attempt: {
                id: Number(attemptRow.id),
                exam_id: Number(exam.id),
                student_id: Number(attemptRow.student_id),
                attempt_number: attemptRow.attempt_number,
                status: attemptRow.status,
                started_at: attemptRow.started_at,
                submitted_at: attemptRow.submitted_at,
                auto_submitted: attemptRow.auto_submitted,
              },
              student: {
                id: Number(attemptRow.student_id),
                name: attemptRow.full_name || attemptRow.email || null,
                email: attemptRow.email || null,
              },
              summary: null,
              responses: [],
            };
          }
          throw err;
        }
      })
    );

    return res.json({
      exam_id: Number(exam.id),
      page,
      page_size: pageSize,
      total,
      results,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exam results');
  }
};

export const createExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();

    const title = requireString(req.body?.title, 'title');
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const instructions = req.body?.instructions ? String(req.body.instructions).trim() : null;
    const supportsExamInstructions = await hasExamInstructionsColumn();
    const totalDuration = parseRequiredInt(req.body?.total_duration_minutes, 'total_duration_minutes');
    if (totalDuration <= 0) throw new AppError('total_duration_minutes must be greater than 0', 400);

    const startDateTime = parseDateTime(req.body?.start_datetime, 'start_datetime');
    const endDateTime = parseDateTime(req.body?.end_datetime, 'end_datetime');
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      throw new AppError('end_datetime must be after start_datetime', 400);
    }

    const clientId = isPlatformAdmin(req.user.role) ? parseRequiredInt(req.body?.client_id, 'client_id') : (req.clientId || req.user.client_id);
    if (!clientId) throw new AppError('client_id is required', 400);

    const schoolIdInput = parseNullableInt(req.body?.school_id, 'school_id');
    if (schoolIdInput) {
      const schoolResult = await dbQuery(`SELECT id, client_id FROM schools WHERE id = $1`, [schoolIdInput]);
      if (schoolResult.rows.length === 0) {
        throw new AppError('School not found', 404);
      }
      const school = schoolResult.rows[0];
      if (Number(school.client_id) !== Number(clientId)) {
        throw new AppError('School does not belong to this client', 403);
      }
    }
    const schoolId = schoolIdInput;

    const shuffleQuestions = parseBoolean(req.body?.shuffle_questions, 'shuffle_questions');
    const shuffleOptions = parseBoolean(req.body?.shuffle_options, 'shuffle_options');
    const showResultImmediately = parseBoolean(req.body?.show_result_immediately, 'show_result_immediately');
    const showScore = parseBoolean(req.body?.show_score, 'show_score');
    const showPassOrFail = parseBoolean(req.body?.show_pass_or_fail, 'show_pass_or_fail');
    const showSolutionsToUser = parseBoolean(req.body?.show_solutions_to_user, 'show_solutions_to_user');

    const maxAttempts = req.body?.max_attempts === undefined || req.body?.max_attempts === null || req.body?.max_attempts === ''
      ? 1
      : parseRequiredInt(req.body?.max_attempts, 'max_attempts');
    if (maxAttempts <= 0) throw new AppError('max_attempts must be greater than 0', 400);

    const statusInput = req.body?.status ? requireString(req.body.status, 'status') : 'draft';
    ensureValidStatus(statusInput);
    const status = isTeacher(req.user.role) ? 'draft' : statusInput;

    const result = supportsExamInstructions
      ? await dbQuery(
        `
        INSERT INTO exams
          (client_id, school_id, title, description, instructions, total_duration_minutes, start_datetime, end_datetime,
           shuffle_questions, shuffle_options, show_result_immediately, show_score, show_pass_or_fail, show_solutions_to_user,
           max_attempts, status, created_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, FALSE), COALESCE($10, FALSE), COALESCE($11, TRUE),
           COALESCE($12, TRUE), COALESCE($13, TRUE), COALESCE($14, FALSE), $15, $16, $17)
        RETURNING *
        `,
        [
          clientId,
          schoolId,
          title,
          description,
          instructions,
          totalDuration,
          startDateTime,
          endDateTime,
          shuffleQuestions,
          shuffleOptions,
          showResultImmediately,
          showScore,
          showPassOrFail,
          showSolutionsToUser,
          maxAttempts,
          status,
          req.user.id,
        ]
      )
      : await dbQuery(
        `
        INSERT INTO exams
          (client_id, school_id, title, description, total_duration_minutes, start_datetime, end_datetime,
           shuffle_questions, shuffle_options, show_result_immediately, show_score, show_pass_or_fail, show_solutions_to_user,
           max_attempts, status, created_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, FALSE), COALESCE($9, FALSE), COALESCE($10, TRUE),
           COALESCE($11, TRUE), COALESCE($12, TRUE), COALESCE($13, FALSE), $14, $15, $16)
        RETURNING *
        `,
        [
          clientId,
          schoolId,
          title,
          description,
          totalDuration,
          startDateTime,
          endDateTime,
          shuffleQuestions,
          shuffleOptions,
          showResultImmediately,
          showScore,
          showPassOrFail,
          showSolutionsToUser,
          maxAttempts,
          status,
          req.user.id,
        ]
      );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create exam');
  }
};

export const updateExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });
    const supportsExamInstructions = await hasExamInstructionsColumn();

    ensureExamEditable(exam);

    const nextStartDateTime = req.body?.start_datetime !== undefined
      ? parseDateTime(req.body.start_datetime, 'start_datetime')
      : new Date(exam.start_datetime).toISOString();
    const nextEndDateTime = req.body?.end_datetime !== undefined
      ? parseDateTime(req.body.end_datetime, 'end_datetime')
      : new Date(exam.end_datetime).toISOString();
    if (new Date(nextEndDateTime) <= new Date(nextStartDateTime)) {
      throw new AppError('end_datetime must be after start_datetime', 400);
    }

    const updates = [];
    const values = [];
    const addUpdate = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (req.body?.title !== undefined) addUpdate('title', requireString(req.body.title, 'title'));
    if (req.body?.description !== undefined) {
      addUpdate('description', req.body.description ? String(req.body.description).trim() : null);
    }
    if (supportsExamInstructions && req.body?.instructions !== undefined) {
      addUpdate('instructions', req.body.instructions ? String(req.body.instructions).trim() : null);
    }
    if (req.body?.total_duration_minutes !== undefined) {
      const total = parseRequiredInt(req.body.total_duration_minutes, 'total_duration_minutes');
      if (total <= 0) throw new AppError('total_duration_minutes must be greater than 0', 400);
      addUpdate('total_duration_minutes', total);
    }
    if (req.body?.start_datetime !== undefined) addUpdate('start_datetime', nextStartDateTime);
    if (req.body?.end_datetime !== undefined) addUpdate('end_datetime', nextEndDateTime);
    if (req.body?.shuffle_questions !== undefined) {
      addUpdate('shuffle_questions', parseBoolean(req.body.shuffle_questions, 'shuffle_questions'));
    }
    if (req.body?.shuffle_options !== undefined) {
      addUpdate('shuffle_options', parseBoolean(req.body.shuffle_options, 'shuffle_options'));
    }
    if (req.body?.show_result_immediately !== undefined) {
      addUpdate('show_result_immediately', parseBoolean(req.body.show_result_immediately, 'show_result_immediately'));
    }
    if (req.body?.show_score !== undefined) {
      addUpdate('show_score', parseBoolean(req.body.show_score, 'show_score'));
    }
    if (req.body?.show_pass_or_fail !== undefined) {
      addUpdate('show_pass_or_fail', parseBoolean(req.body.show_pass_or_fail, 'show_pass_or_fail'));
    }
    if (req.body?.show_solutions_to_user !== undefined) {
      addUpdate('show_solutions_to_user', parseBoolean(req.body.show_solutions_to_user, 'show_solutions_to_user'));
    }
    if (req.body?.max_attempts !== undefined) {
      const attempts = parseRequiredInt(req.body.max_attempts, 'max_attempts');
      if (attempts <= 0) throw new AppError('max_attempts must be greater than 0', 400);
      addUpdate('max_attempts', attempts);
    }
    if (req.body?.status !== undefined) {
      const status = requireString(req.body.status, 'status');
      ensureValidStatus(status);
      if (isTeacher(req.user.role) && status !== 'draft' && status !== 'published') {
        throw new AppError('Teachers can only set status to draft or published', 403);
      }
      addUpdate('status', status);
    }
    if (req.body?.school_id !== undefined) {
      const schoolId = parseNullableInt(req.body.school_id, 'school_id');
      const scoped = await resolveSchoolScope({
        schoolId,
        user: req.user,
        clientId: Number(exam.client_id),
      });
      addUpdate('school_id', scoped.schoolId);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(exam.id);
    const result = await dbQuery(
      `
      UPDATE exams
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
      `,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update exam');
  }
};

export const deleteExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });

    ensureExamDeletable(exam);

    const tx = await getClient();
    let result;

    try {
      await tx.query('BEGIN');

      await tx.query(`DELETE FROM exam_attempts WHERE exam_id = $1`, [exam.id]);
      result = await tx.query(`DELETE FROM exams WHERE id = $1 RETURNING id`, [exam.id]);

      if (result.rows.length === 0) {
        throw new AppError('Exam not found', 404);
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    res.json({ success: true, id: Number(result.rows[0].id) });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete exam');
  }
};

export const createExamSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });
    ensureExamEditable(exam);

    const title = requireString(req.body?.title, 'title');
    const instructions = req.body?.instructions ? String(req.body.instructions).trim() : null;
    const marksPerQuestion = parseOptionalNumber(req.body?.marks_per_question, 'marks_per_question');
    const negativeMarks = parseOptionalNumber(req.body?.negative_marks, 'negative_marks');

    let orderIndex = parseNullableInt(req.body?.order_index, 'order_index');
    if (!orderIndex) {
      const nextResult = await dbQuery(
        `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_index FROM exam_sections WHERE exam_id = $1`,
        [exam.id]
      );
      orderIndex = Number(nextResult.rows[0].next_index);
    }
    if (orderIndex <= 0) throw new AppError('order_index must be greater than 0', 400);

    const result = await dbQuery(
      `
      INSERT INTO exam_sections
        (exam_id, title, order_index, instructions, marks_per_question, negative_marks)
      VALUES
        ($1, $2, $3, $4, COALESCE($5, 4), COALESCE($6, 1))
      RETURNING *
      `,
      [exam.id, title, orderIndex, instructions, marksPerQuestion, negativeMarks]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create exam section');
  }
};

export const updateExamSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });
    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user, requireOwner: isTeacher(req.user.role) });
    ensureExamEditable(exam);

    const updates = [];
    const values = [];
    const addUpdate = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (req.body?.title !== undefined) addUpdate('title', requireString(req.body.title, 'title'));
    if (req.body?.order_index !== undefined) {
      const orderIndex = parseRequiredInt(req.body.order_index, 'order_index');
      if (orderIndex <= 0) throw new AppError('order_index must be greater than 0', 400);
      addUpdate('order_index', orderIndex);
    }
    if (req.body?.instructions !== undefined) {
      addUpdate('instructions', req.body.instructions ? String(req.body.instructions).trim() : null);
    }
    if (req.body?.marks_per_question !== undefined) {
      addUpdate('marks_per_question', parseOptionalNumber(req.body.marks_per_question, 'marks_per_question'));
    }
    if (req.body?.negative_marks !== undefined) {
      addUpdate('negative_marks', parseOptionalNumber(req.body.negative_marks, 'negative_marks'));
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(section.id);
    const result = await dbQuery(
      `
      UPDATE exam_sections
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
      `,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update exam section');
  }
};

export const deleteExamSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });
    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user, requireOwner: isTeacher(req.user.role) });
    ensureExamEditable(exam);

    await dbQuery(`DELETE FROM exam_sections WHERE id = $1`, [section.id]);
    res.json({ success: true, id: Number(section.id) });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete exam section');
  }
};

