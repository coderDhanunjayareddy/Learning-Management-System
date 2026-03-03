import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError, handleServiceError } from '../utils/errors.js';
import {
  parseNullableInt,
  parseRequiredInt,
  requireString,
  parseStringArray,
  parseStringArrayParam,
} from '../schemas/questions.schema.js';

const VALID_QUESTION_TYPES = ['mcq_single', 'mcq_multiple', 'numerical', 'true_false'];
const VALID_DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
const VALID_STATUSES = ['draft', 'approved', 'rejected', 'archived'];

const isSuperAdmin = (role) => role === 'super_admin';
const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';
const isClientAdmin = (role) => role === 'client_admin';
const isSchoolOwner = (role) => role === 'school_owner';
const isTeacher = (role) => role === 'teacher';

const fetchUserSchoolIds = async (userId) => {
  const result = await dbQuery(
    `SELECT school_id FROM school_memberships WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  return result.rows.map((row) => row.school_id);
};

const ensureClientScope = (clientId, role) => {
  if (isPlatformAdmin(role)) return null;
  if (!clientId) {
    throw new AppError('client_id is required for this role', 400);
  }
  return clientId;
};

const ensureSchoolAccess = async ({ schoolId, role, userId, clientId }) => {
  if (!schoolId) return null;
  const school = await dbQuery(`SELECT id, client_id FROM schools WHERE id = $1`, [schoolId]);
  if (school.rows.length === 0) {
    throw new AppError('School not found', 404);
  }
  if (clientId && school.rows[0].client_id !== clientId) {
    throw new AppError('School does not belong to this client', 403);
  }
  if (isPlatformAdmin(role) || isClientAdmin(role)) return schoolId;

  const memberships = await fetchUserSchoolIds(userId);
  if (!memberships.includes(schoolId)) {
    throw new AppError('Access denied for this school', 403);
  }
  return schoolId;
};

const ensureCurriculumScope = async ({ subjectId, chapterId, topicId, clientId }) => {
  const subjectResult = await dbQuery(`SELECT id, client_id FROM subjects WHERE id = $1`, [subjectId]);
  if (subjectResult.rows.length === 0) throw new AppError('Subject not found', 404);
  if (clientId && subjectResult.rows[0].client_id !== clientId) {
    throw new AppError('Subject does not belong to this client', 403);
  }

  const chapterResult = await dbQuery(
    `SELECT c.id, c.subject_id, s.client_id
     FROM chapters c
     JOIN subjects s ON s.id = c.subject_id
     WHERE c.id = $1`,
    [chapterId]
  );
  if (chapterResult.rows.length === 0) throw new AppError('Chapter not found', 404);
  if (chapterResult.rows[0].subject_id !== subjectId) {
    throw new AppError('Chapter does not belong to the subject', 400);
  }
  if (clientId && chapterResult.rows[0].client_id !== clientId) {
    throw new AppError('Chapter does not belong to this client', 403);
  }

  if (topicId) {
    const topicResult = await dbQuery(
      `SELECT t.id, t.chapter_id, s.client_id
       FROM topics t
       JOIN chapters c ON c.id = t.chapter_id
       JOIN subjects s ON s.id = c.subject_id
       WHERE t.id = $1`,
      [topicId]
    );
    if (topicResult.rows.length === 0) throw new AppError('Topic not found', 404);
    if (topicResult.rows[0].chapter_id !== chapterId) {
      throw new AppError('Topic does not belong to the chapter', 400);
    }
    if (clientId && topicResult.rows[0].client_id !== clientId) {
      throw new AppError('Topic does not belong to this client', 403);
    }
  }
};

const buildQuestionWhere = async ({ user, query, includeArchived = false }) => {
  const role = user?.role;
  const clientId = ensureClientScope(user?.client_id ?? null, role);
  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (clientId) {
    conditions.push(`q.client_id = ${addParam(clientId)}`);
  }

  const isScopedBySchool = isTeacher(role) || isSchoolOwner(role);
  let schoolIds = [];
  if (isScopedBySchool) {
    schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(q.school_id IS NULL OR q.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`q.school_id IS NULL`);
    }
  }

  const schoolIdFilter = parseNullableInt(query.school_id, 'school_id');
  if (schoolIdFilter) {
    if (isScopedBySchool && !schoolIds.includes(schoolIdFilter)) {
      throw new AppError('Access denied for this school', 403);
    }
    conditions.push(`q.school_id = ${addParam(schoolIdFilter)}`);
  }

  if (isTeacher(role)) {
    conditions.push(`(q.status = 'approved' OR q.created_by = ${addParam(user.id)})`);
  }

  const statusFilter = query.status ? String(query.status) : null;
  if (statusFilter) {
    if (!VALID_STATUSES.includes(statusFilter)) {
      throw new AppError('Invalid status filter', 400);
    }
    if (statusFilter === 'archived' && isTeacher(role)) {
      throw new AppError('Teachers cannot access archived questions', 403);
    }
    conditions.push(`q.status = ${addParam(statusFilter)}`);
  } else if (!includeArchived) {
    conditions.push(`q.status <> 'archived'`);
  }

  const subjectId = parseNullableInt(query.subject_id, 'subject_id');
  if (subjectId) conditions.push(`q.subject_id = ${addParam(subjectId)}`);

  const chapterId = parseNullableInt(query.chapter_id, 'chapter_id');
  if (chapterId) conditions.push(`q.chapter_id = ${addParam(chapterId)}`);

  const topicId = parseNullableInt(query.topic_id, 'topic_id');
  if (topicId) conditions.push(`q.topic_id = ${addParam(topicId)}`);

  if (query.question_type) {
    const type = String(query.question_type);
    if (!VALID_QUESTION_TYPES.includes(type)) {
      throw new AppError('Invalid question type filter', 400);
    }
    conditions.push(`q.question_type = ${addParam(type)}`);
  }

  if (query.difficulty_level) {
    const difficulty = String(query.difficulty_level);
    if (!VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
      throw new AppError('Invalid difficulty filter', 400);
    }
    conditions.push(`q.difficulty_level = ${addParam(difficulty)}`);
  }

  const createdBy = parseNullableInt(query.created_by, 'created_by');
  if (createdBy) conditions.push(`q.created_by = ${addParam(createdBy)}`);

  if (query.q) {
    const search = String(query.q).trim();
    if (search.length > 0) {
      conditions.push(
        `to_tsvector('simple', coalesce(q.question_text::text,'') || ' ' || coalesce(q.options::text,'')) @@ plainto_tsquery('simple', ${addParam(search)})`
      );
    }
  }

  const examTags = parseStringArrayParam(query.exam_tags, 'exam_tags');
  if (examTags.length > 0) {
    conditions.push(`q.exam_tags && ${addParam(examTags)}::text[]`);
  }

  return { conditions, params };
};

export const listQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.page_size || '20', 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const { conditions, params } = await buildQuestionWhere({
      user: req.user,
      query: req.query,
    });

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await dbQuery(
      `SELECT COUNT(*) AS total FROM questions q ${whereClause}`,
      params
    );

    const total = Number(countResult.rows[0]?.total || 0);
    const listParams = [...params, pageSize, offset];
    const listResult = await dbQuery(
      `
      SELECT q.*
      FROM questions q
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
      `,
      listParams
    );

    res.json({
      data: listResult.rows,
      page,
      page_size: pageSize,
      total,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load questions');
  }
};

export const getQuestionById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const conditions = ['q.id = $1'];
    const params = [id];

    if (clientId) {
      conditions.push(`q.client_id = $${params.length + 1}`);
      params.push(clientId);
    }

    if (isTeacher(role) || isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (schoolIds.length > 0) {
        conditions.push(`(q.school_id IS NULL OR q.school_id = ANY($${params.length + 1}))`);
        params.push(schoolIds);
      } else {
        conditions.push(`q.school_id IS NULL`);
      }
    }

    if (isTeacher(role)) {
      conditions.push(`(q.status = 'approved' OR q.created_by = $${params.length + 1})`);
      params.push(req.user.id);
    }

    conditions.push(`q.status <> 'archived'`);

    const query = `
      SELECT q.*
      FROM questions q
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `;

    const result = await dbQuery(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load question');
  }
};

export const createQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const questionType = requireString(req.body.question_type, 'question_type');
    if (!VALID_QUESTION_TYPES.includes(questionType)) {
      throw new AppError('Invalid question_type', 400);
    }

    const questionText = req.body.question_text;
    if (!questionText) {
      throw new AppError('question_text is required', 400);
    }

    const correctAnswer = req.body.correct_answer;
    if (!correctAnswer) {
      throw new AppError('correct_answer is required', 400);
    }

    const subjectId = parseRequiredInt(req.body.subject_id, 'subject_id');
    const chapterId = parseRequiredInt(req.body.chapter_id, 'chapter_id');
    const topicId = parseNullableInt(req.body.topic_id, 'topic_id');

    await ensureCurriculumScope({ subjectId, chapterId, topicId, clientId });

    const schoolId = parseNullableInt(req.body.school_id, 'school_id');
    await ensureSchoolAccess({ schoolId, role, userId: req.user.id, clientId });

    const difficulty = req.body.difficulty_level || 'medium';
    if (!VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
      throw new AppError('Invalid difficulty_level', 400);
    }

    const statusInput = req.body.status ? String(req.body.status) : null;
    const status =
      isTeacher(role) ? 'draft' : statusInput && VALID_STATUSES.includes(statusInput) ? statusInput : 'draft';

    const payload = {
      client_id: clientId,
      school_id: schoolId,
      question_type: questionType,
      question_text: questionText,
      options: req.body.options ?? null,
      correct_answer: correctAnswer,
      solution: req.body.solution ?? null,
      solution_video_url: req.body.solution_video_url ?? null,
      subject_id: subjectId,
      chapter_id: chapterId,
      topic_id: topicId,
      difficulty_level: difficulty,
      exam_tags: parseStringArray(req.body.exam_tags, 'exam_tags'),
      marks_positive: req.body.marks_positive ?? 4,
      marks_negative: req.body.marks_negative ?? 0,
      status,
      created_by: req.user.id,
    };

    if (questionType.startsWith('mcq') && (!payload.options || payload.options.length === 0)) {
      throw new AppError('options are required for MCQ questions', 400);
    }

    const insertResult = await dbQuery(
      `
      INSERT INTO questions
      (client_id, school_id, question_type, question_text, options, correct_answer, solution,
       solution_video_url, subject_id, chapter_id, topic_id, difficulty_level, exam_tags,
       marks_positive, marks_negative, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
      `,
      [
        payload.client_id,
        payload.school_id,
        payload.question_type,
        payload.question_text,
        payload.options,
        payload.correct_answer,
        payload.solution,
        payload.solution_video_url,
        payload.subject_id,
        payload.chapter_id,
        payload.topic_id,
        payload.difficulty_level,
        payload.exam_tags,
        payload.marks_positive,
        payload.marks_negative,
        payload.status,
        payload.created_by,
      ]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create question');
  }
};

export const updateQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const existing = await dbQuery(`SELECT * FROM questions WHERE id = $1`, [id]);
    if (existing.rows.length === 0 || existing.rows[0].status === 'archived') {
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = existing.rows[0];

    if (clientId && question.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isTeacher(role)) {
      if (question.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!['draft', 'rejected'].includes(question.status)) {
        return res.status(403).json({ error: 'Only draft or rejected questions can be edited' });
      }
    }

    if (isTeacher(role) || isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (question.school_id && !schoolIds.includes(question.school_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updates = {};

    if (req.body.question_type) {
      if (!VALID_QUESTION_TYPES.includes(req.body.question_type)) {
        throw new AppError('Invalid question_type', 400);
      }
      updates.question_type = req.body.question_type;
    }

    if (req.body.question_text) updates.question_text = req.body.question_text;
    if (req.body.options !== undefined) updates.options = req.body.options ?? null;
    if (req.body.correct_answer) updates.correct_answer = req.body.correct_answer;
    if (req.body.solution !== undefined) updates.solution = req.body.solution ?? null;
    if (req.body.solution_video_url !== undefined) updates.solution_video_url = req.body.solution_video_url ?? null;

    if (req.body.subject_id || req.body.chapter_id || req.body.topic_id !== undefined) {
      const subjectId = req.body.subject_id ? parseRequiredInt(req.body.subject_id, 'subject_id') : question.subject_id;
      const chapterId = req.body.chapter_id ? parseRequiredInt(req.body.chapter_id, 'chapter_id') : question.chapter_id;
      const topicId = req.body.topic_id !== undefined ? parseNullableInt(req.body.topic_id, 'topic_id') : question.topic_id;
      await ensureCurriculumScope({ subjectId, chapterId, topicId, clientId });
      updates.subject_id = subjectId;
      updates.chapter_id = chapterId;
      updates.topic_id = topicId;
    }

    if (req.body.difficulty_level) {
      if (!VALID_DIFFICULTY_LEVELS.includes(req.body.difficulty_level)) {
        throw new AppError('Invalid difficulty_level', 400);
      }
      updates.difficulty_level = req.body.difficulty_level;
    }

    if (req.body.exam_tags !== undefined) {
      updates.exam_tags = parseStringArray(req.body.exam_tags, 'exam_tags');
    }

    if (req.body.marks_positive !== undefined) updates.marks_positive = req.body.marks_positive;
    if (req.body.marks_negative !== undefined) updates.marks_negative = req.body.marks_negative;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;
    Object.entries(updates).forEach(([column, value]) => {
      setClauses.push(`${column} = $${idx++}`);
      values.push(value);
    });
    values.push(id);

    const updateResult = await dbQuery(
      `UPDATE questions SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update question');
  }
};

export const softDeleteQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    if (isTeacher(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const existing = await dbQuery(`SELECT * FROM questions WHERE id = $1`, [id]);
    if (existing.rows.length === 0 || existing.rows[0].status === 'archived') {
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = existing.rows[0];
    if (clientId && question.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (question.school_id && !schoolIds.includes(question.school_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await dbQuery(
      `UPDATE questions SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING id, status`,
      [id]
    );

    res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete question');
  }
};

export const approveQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    if (isTeacher(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const existing = await dbQuery(`SELECT * FROM questions WHERE id = $1`, [id]);
    if (existing.rows.length === 0 || existing.rows[0].status === 'archived') {
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = existing.rows[0];

    if (clientId && question.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (question.school_id && !schoolIds.includes(question.school_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await dbQuery(
      `
      UPDATE questions
      SET status = 'approved',
          approved_by = $2,
          approved_at = NOW(),
          rejection_reason = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to approve question');
  }
};

export const rejectQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    if (isTeacher(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const reason = requireString(req.body?.reason, 'reason');

    const existing = await dbQuery(`SELECT * FROM questions WHERE id = $1`, [id]);
    if (existing.rows.length === 0 || existing.rows[0].status === 'archived') {
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = existing.rows[0];

    if (clientId && question.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (question.school_id && !schoolIds.includes(question.school_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await dbQuery(
      `
      UPDATE questions
      SET status = 'rejected',
          approved_by = $2,
          approved_at = NOW(),
          rejection_reason = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, req.user.id, reason]
    );

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to reject question');
  }
};
