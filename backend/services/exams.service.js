import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError, handleServiceError } from '../utils/errors.js';
import { parseNullableInt, parseRequiredInt, requireString } from '../schemas/questions.schema.js';

const VALID_EXAM_STATUSES = ['draft', 'published', 'active', 'completed'];

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

const ensureClientScope = (user, sourceClientId = null) => {
  if (isPlatformAdmin(user?.role)) {
    const clientId = parseNullableInt(sourceClientId, 'client_id');
    return clientId;
  }
  const clientId = user?.client_id ?? null;
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
  const clientId = ensureClientScope(user, explicitClientId);

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
    const clientId = ensureClientScope(user);
    if (Number(exam.client_id) !== Number(clientId)) {
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

export const listExams = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
        COALESCE(COUNT(DISTINCT es.id), 0)::int AS section_count,
        COALESCE(COUNT(eq.id), 0)::int AS question_count
      FROM exams e
      LEFT JOIN exam_sections es ON es.exam_id = e.id
      LEFT JOIN exam_questions eq ON eq.section_id = es.id
      ${whereClause}
      GROUP BY e.id
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

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user, requireOwner: isTeacher(req.user.role) });

    const examResult = await dbQuery(
      `
      SELECT
        e.*,
        COALESCE(COUNT(DISTINCT es.id), 0)::int AS section_count,
        COALESCE(COUNT(eq.id), 0)::int AS question_count
      FROM exams e
      LEFT JOIN exam_sections es ON es.exam_id = e.id
      LEFT JOIN exam_questions eq ON eq.section_id = es.id
      WHERE e.id = $1
      GROUP BY e.id
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

    res.json({
      ...examResult.rows[0],
      sections: sectionsResult.rows,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exam');
  }
};

export const createExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const title = requireString(req.body?.title, 'title');
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const totalDuration = parseRequiredInt(req.body?.total_duration_minutes, 'total_duration_minutes');
    if (totalDuration <= 0) throw new AppError('total_duration_minutes must be greater than 0', 400);

    const startDateTime = parseDateTime(req.body?.start_datetime, 'start_datetime');
    const endDateTime = parseDateTime(req.body?.end_datetime, 'end_datetime');
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      throw new AppError('end_datetime must be after start_datetime', 400);
    }

    const initialClientId = ensureClientScope(req.user, req.body?.client_id);
    const schoolIdInput = parseNullableInt(req.body?.school_id, 'school_id');
    const { schoolId, resolvedClientId } = await resolveSchoolScope({
      schoolId: schoolIdInput,
      user: req.user,
      clientId: initialClientId,
    });

    const clientId = resolvedClientId;
    if (!clientId) throw new AppError('client_id is required', 400);

    const shuffleQuestions = parseBoolean(req.body?.shuffle_questions, 'shuffle_questions');
    const shuffleOptions = parseBoolean(req.body?.shuffle_options, 'shuffle_options');
    const showResultImmediately = parseBoolean(req.body?.show_result_immediately, 'show_result_immediately');

    const maxAttempts = req.body?.max_attempts === undefined || req.body?.max_attempts === null || req.body?.max_attempts === ''
      ? 1
      : parseRequiredInt(req.body?.max_attempts, 'max_attempts');
    if (maxAttempts <= 0) throw new AppError('max_attempts must be greater than 0', 400);

    const statusInput = req.body?.status ? requireString(req.body.status, 'status') : 'draft';
    ensureValidStatus(statusInput);
    const status = isTeacher(req.user.role) ? 'draft' : statusInput;

    const result = await dbQuery(
      `
      INSERT INTO exams
        (client_id, school_id, title, description, total_duration_minutes, start_datetime, end_datetime,
         shuffle_questions, shuffle_options, show_result_immediately, max_attempts, status, created_by)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, FALSE), COALESCE($9, FALSE), COALESCE($10, TRUE), $11, $12, $13)
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

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
      requireOwner: isTeacher(req.user.role),
    });

    if (isTeacher(req.user.role) && exam.status !== 'draft') {
      throw new AppError('Teachers can only update draft exams', 403);
    }

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

    if (isTeacher(req.user.role) && exam.status !== 'draft') {
      throw new AppError('Teachers can only delete draft exams', 403);
    }

    const result = await dbQuery(`DELETE FROM exams WHERE id = $1 RETURNING id`, [exam.id]);
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
    if (isTeacher(req.user.role) && exam.status !== 'draft') {
      throw new AppError('Teachers can only modify sections for draft exams', 403);
    }

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
    if (isTeacher(req.user.role) && section.status !== 'draft') {
      throw new AppError('Teachers can only modify sections for draft exams', 403);
    }

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
    if (isTeacher(req.user.role) && section.status !== 'draft') {
      throw new AppError('Teachers can only modify sections for draft exams', 403);
    }

    await dbQuery(`DELETE FROM exam_sections WHERE id = $1`, [section.id]);
    res.json({ success: true, id: Number(section.id) });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete exam section');
  }
};
