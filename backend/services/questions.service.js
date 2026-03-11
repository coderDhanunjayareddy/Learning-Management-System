import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError, handleServiceError } from '../utils/errors.js';
import AdmZip from 'adm-zip';
import {
  parseNullableInt,
  parseRequiredInt,
  requireString,
  parseStringArray,
  parseStringArrayParam,
} from '../schemas/questions.schema.js';
import mammoth from 'mammoth';
import { load as loadHtml } from 'cheerio';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
} from 'docx';

const VALID_QUESTION_TYPES = [
  'mcq_single',
  'mcq_multiple',
  'numerical',
  'true_false',
  'short_answer',
  'match_following',
  'fill_in_blank',
  'comprehensive',
];
const VALID_DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
const VALID_STATUSES = ['draft', 'approved', 'rejected', 'archived'];
const VALID_SCORING_MODES = ['all_or_nothing', 'partial', 'mixed'];

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

const ensureCurriculumScope = async ({
  programId = null,
  gradeId = null,
  subjectId,
  chapterId,
  topicId,
  clientId,
}) => {
  if (!programId && !gradeId && !subjectId && !chapterId && !topicId) return;
  if (programId && !gradeId) {
    throw new AppError('grade_id is required when program_id is provided', 400);
  }
  if (gradeId && !subjectId) {
    throw new AppError('subject_id is required when grade_id is provided', 400);
  }
  if (chapterId && !subjectId) {
    throw new AppError('subject_id is required when chapter_id is provided', 400);
  }
  if (topicId && !chapterId) {
    throw new AppError('chapter_id is required when topic_id is provided', 400);
  }
  const subjectResult = await dbQuery(
    `
    SELECT s.id, s.client_id, s.grade_id, g.program_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE s.id = $1
    `,
    [subjectId]
  );
  if (subjectResult.rows.length === 0) throw new AppError('Subject not found', 404);
  if (clientId && subjectResult.rows[0].client_id !== clientId) {
    throw new AppError('Subject does not belong to this client', 403);
  }
  if (gradeId && Number(subjectResult.rows[0].grade_id) !== Number(gradeId)) {
    throw new AppError('Subject does not belong to the grade', 400);
  }
  if (programId && Number(subjectResult.rows[0].program_id) !== Number(programId)) {
    throw new AppError('Grade does not belong to the program', 400);
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

  const gradeId = parseNullableInt(query.grade_id, 'grade_id');
  if (gradeId) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM subjects s
        WHERE s.id = q.subject_id AND s.grade_id = ${addParam(gradeId)}
      )`
    );
  }

  const programId = parseNullableInt(query.program_id, 'program_id');
  if (programId) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM subjects s
        JOIN grades g ON g.id = s.grade_id
        WHERE s.id = q.subject_id AND g.program_id = ${addParam(programId)}
      )`
    );
  }

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

const coerceLooseValue = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch (err) {
      return value;
    }
  }

  if (!Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  return value;
};

const parseExamTagsInput = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return parseStringArray(value, 'exam_tags');
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  throw new AppError('exam_tags must be an array or comma-separated string', 400);
};

const parseOptionsInput = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const coerced = coerceLooseValue(value);
    if (Array.isArray(coerced)) return coerced;

    return value
      .split('|')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry, index) => ({
        id: `opt-${index + 1}`,
        text: entry,
      }));
  }

  throw new AppError('options must be an array or pipe-delimited string', 400);
};

const parseNumberField = (value, fieldName, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new AppError(`${fieldName} must be a number`, 400);
  }
  return parsed;
};

const toDbJsonParam = (value) => {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const decodeXmlEntities = (value) =>
  String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
};

const parseCsvContent = (csvText) => {
  const lines = String(csvText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new AppError('CSV must include a header row and at least one data row', 400);
  }

  const headers = parseCsvLine(lines[0]).map((header, index) => {
    const trimmed = header.trim().toLowerCase();
    if (index === 0) {
      return trimmed.replace(/^\uFEFF/, '');
    }
    return trimmed;
  });
  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });
    rows.push(row);
  }

  return rows;
};

const BULK_CSV_HEADER_ALIASES = {
  question: 'question_text',
  questiontext: 'question_text',
  'question text': 'question_text',
  type: 'question_type',
  questiontype: 'question_type',
  'question type': 'question_type',
  ans: 'correct_answer',
  answer: 'correct_answer',
  'correct answer': 'correct_answer',
  correctanswer: 'correct_answer',
  'correct option': 'correct_answer',
  correctoption: 'correct_answer',
  subject: 'subject_id',
  'subject id': 'subject_id',
  program: 'program_id',
  'program id': 'program_id',
  grade: 'grade_id',
  'grade id': 'grade_id',
  chapter: 'chapter_id',
  'chapter id': 'chapter_id',
  topic: 'topic_id',
  'topic id': 'topic_id',
  school: 'school_id',
  'school id': 'school_id',
  difficulty: 'difficulty_level',
  'difficulty level': 'difficulty_level',
  tags: 'exam_tags',
  'exam tags': 'exam_tags',
  category: 'category',
  catagory: 'category',
  comprehensive_subquestions: 'category',
  'option a': 'option_a',
  'option b': 'option_b',
  'option c': 'option_c',
  'option d': 'option_d',
  'option e': 'option_e',
  'option f': 'option_f',
  'option g': 'option_g',
  'option h': 'option_h',
  option1: 'option_1',
  option2: 'option_2',
  option3: 'option_3',
  option4: 'option_4',
  option5: 'option_5',
  option6: 'option_6',
  option7: 'option_7',
  option8: 'option_8',
};

const normalizeBulkHeaderKey = (key) =>
  String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/[-\s]+/g, '_');

const normalizeBulkQuestionType = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (!raw) return '';

  if (VALID_QUESTION_TYPES.includes(raw)) return raw;
  if (['mcq', 'single', 'single_choice', 'singlechoice', 'single_select'].includes(raw)) {
    return 'mcq_single';
  }
  if (['multiple', 'multiple_choice', 'multiplechoice', 'multi_select', 'mcq_multi'].includes(raw)) {
    return 'mcq_multiple';
  }
  if (['numeric', 'integer', 'float'].includes(raw)) {
    return 'numerical';
  }
  if (['truefalse', 'tf', 'boolean'].includes(raw)) {
    return 'true_false';
  }

  return raw;
};

const getFileExtension = (filename = '') => {
  const normalized = String(filename || '').toLowerCase();
  const parts = normalized.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1];
};

const getImageMimeType = (filename = '') => {
  const ext = getFileExtension(filename);
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
};

const normalizeBulkDefaults = (source) => {
  const defaults = {};
  if (source?.default_program_id !== undefined && source.default_program_id !== '') {
    defaults.program_id = source.default_program_id;
  } else if (source?.program_id !== undefined && source.program_id !== '') {
    defaults.program_id = source.program_id;
  }

  if (source?.default_grade_id !== undefined && source.default_grade_id !== '') {
    defaults.grade_id = source.default_grade_id;
  } else if (source?.grade_id !== undefined && source.grade_id !== '') {
    defaults.grade_id = source.grade_id;
  }

  if (source?.default_subject_id !== undefined && source.default_subject_id !== '') {
    defaults.subject_id = source.default_subject_id;
  } else if (source?.subject_id !== undefined && source.subject_id !== '') {
    defaults.subject_id = source.subject_id;
  }

  if (source?.default_chapter_id !== undefined && source.default_chapter_id !== '') {
    defaults.chapter_id = source.default_chapter_id;
  } else if (source?.chapter_id !== undefined && source.chapter_id !== '') {
    defaults.chapter_id = source.chapter_id;
  }

  if (source?.default_topic_id !== undefined && source.default_topic_id !== '') {
    defaults.topic_id = source.default_topic_id;
  } else if (source?.topic_id !== undefined && source.topic_id !== '') {
    defaults.topic_id = source.topic_id;
  }

  if (source?.school_id !== undefined && source.school_id !== '') {
    defaults.school_id = source.school_id;
  }

  return defaults;
};

const applyBulkDefaults = (row, defaults) => {
  const merged = { ...row };
  if (
    (merged.program_id === undefined || merged.program_id === null || merged.program_id === '') &&
    defaults.program_id !== undefined
  ) {
    merged.program_id = defaults.program_id;
  }
  if (
    (merged.grade_id === undefined || merged.grade_id === null || merged.grade_id === '') &&
    defaults.grade_id !== undefined
  ) {
    merged.grade_id = defaults.grade_id;
  }
  if (
    (merged.subject_id === undefined || merged.subject_id === null || merged.subject_id === '') &&
    defaults.subject_id !== undefined
  ) {
    merged.subject_id = defaults.subject_id;
  }
  if (
    (merged.chapter_id === undefined || merged.chapter_id === null || merged.chapter_id === '') &&
    defaults.chapter_id !== undefined
  ) {
    merged.chapter_id = defaults.chapter_id;
  }
  if (
    (merged.topic_id === undefined || merged.topic_id === null || merged.topic_id === '') &&
    defaults.topic_id !== undefined
  ) {
    merged.topic_id = defaults.topic_id;
  }
  if (
    (merged.school_id === undefined || merged.school_id === null || merged.school_id === '') &&
    defaults.school_id !== undefined
  ) {
    merged.school_id = defaults.school_id;
  }
  return merged;
};

const normalizeCsvRowInput = (rawRow, defaults) => {
  const normalized = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    const originalKey = String(key).trim();
    const normalizedKey = normalizeBulkHeaderKey(originalKey);
    const compactKey = normalizedKey.replace(/_/g, ' ');
    const canonicalKey =
      BULK_CSV_HEADER_ALIASES[originalKey.toLowerCase()] ||
      BULK_CSV_HEADER_ALIASES[compactKey] ||
      BULK_CSV_HEADER_ALIASES[normalizedKey] ||
      normalizedKey;
    normalized[canonicalKey] = typeof value === 'string' ? value.trim() : value;
  });

  const optionKeys = [
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'option_e',
    'option_f',
    'option_g',
    'option_h',
    'option_1',
    'option_2',
    'option_3',
    'option_4',
    'option_5',
    'option_6',
    'option_7',
    'option_8',
  ];
  if (normalized.options === undefined || normalized.options === null || normalized.options === '') {
    const optionValues = optionKeys
      .map((optionKey) => normalized[optionKey])
      .filter((entry) => entry !== undefined && entry !== null && String(entry).trim().length > 0)
      .map((entry) => String(entry).trim());

    if (optionValues.length > 0) {
      const options = optionValues.map((text, index) => ({
        id: `opt-${index + 1}`,
        text,
      }));
      normalized.options = options;

      if (normalized.correct_answer !== undefined && normalized.correct_answer !== null) {
        const answerValue = String(normalized.correct_answer).trim();
        if (answerValue.length > 0) {
          const questionType = normalizeBulkQuestionType(normalized.question_type || 'mcq_single');
          if (questionType === 'mcq_multiple') {
            const tokens = answerValue
              .split(/[|,;]/)
              .map((token) => token.trim())
              .filter((token) => token.length > 0);
            normalized.correct_answer = tokens
              .map((token) => mapAnswerTokenToOptionId(token, options) ?? token)
              .filter((token) => token !== null);
          } else {
            normalized.correct_answer = mapAnswerTokenToOptionId(answerValue, options) ?? answerValue;
          }
        }
      }
    }
  }

  if (!normalized.question_type || String(normalized.question_type).trim().length === 0) {
    normalized.question_type = 'mcq_single';
  } else {
    normalized.question_type = normalizeBulkQuestionType(normalized.question_type);
  }

  optionKeys.forEach((optionKey) => {
    delete normalized[optionKey];
  });

  return applyBulkDefaults(normalized, defaults);
};

const BULK_DOCX_TABLE_HEADER_ALIASES = {
  type: 'question_type',
  question_type: 'question_type',
  question: 'question_text',
  question_text: 'question_text',
  options: 'options',
  answer: 'correct_answer',
  ans: 'correct_answer',
  correct_answer: 'correct_answer',
  correct_option: 'correct_answer',
  match_pairs: 'match_pairs',
  blanks: 'blanks',
  solution: 'solution',
  difficulty: 'difficulty_level',
  difficulty_level: 'difficulty_level',
  'marks+': 'marks_positive',
  marks_positive: 'marks_positive',
  marksplus: 'marks_positive',
  'marks-': 'marks_negative',
  marks_negative: 'marks_negative',
  marksminus: 'marks_negative',
  tags: 'exam_tags',
  exam_tags: 'exam_tags',
  subject: 'subject',
  subject_id: 'subject_id',
  program: 'program',
  program_id: 'program_id',
  grade: 'grade',
  grade_id: 'grade_id',
  chapter: 'chapter',
  chapter_id: 'chapter_id',
  topic: 'topic',
  topic_id: 'topic_id',
  school_id: 'school_id',
  status: 'status',
  comprehensive_passage: 'comprehension_passage',
  comprehension_passage: 'comprehension_passage',
  comprehensive_subquestions: 'category',
  comprehension_questions: 'comprehension_questions',
  category: 'category',
  catagory: 'category',
};

const BULK_PLACEHOLDER_VALUES = new Set(['-', '--', 'n/a', 'na', 'none', 'nil']);

const normalizeBulkTextValue = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toHtmlTextWithBreaks = (value) => {
  const html = String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/li>\s*<li[^>]*>/gi, '\n')
    .replace(/<\/tr>\s*<tr[^>]*>/gi, '\n');
  const $ = loadHtml(`<div>${html}</div>`);
  return $('div').text();
};

const toPlainBulkText = (value) => {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (raw.includes('<')) {
    return normalizeBulkTextValue(toHtmlTextWithBreaks(raw));
  }
  return normalizeBulkTextValue(raw);
};

const isPlaceholderBulkValue = (value) => {
  const normalized = toPlainBulkText(value).toLowerCase();
  if (!normalized) return true;
  return BULK_PLACEHOLDER_VALUES.has(normalized);
};

const normalizeDocxCellHtml = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();

const toRichHtmlValue = (value) => {
  const html = normalizeDocxCellHtml(value);
  if (!html) return null;
  if (isPlaceholderBulkValue(html)) return null;
  return html;
};

const parseBulkOptionText = (value) => {
  if (isPlaceholderBulkValue(value)) return null;

  const entries = toHtmlTextWithBreaks(value)
    .split(/[\n;]+/)
    .map((entry) => normalizeBulkTextValue(entry))
    .map((entry) => entry.replace(/^[A-H0-9]+[\).:-]\s*/i, ''))
    .filter((entry) => entry.length > 0)
    .filter((entry) => !BULK_PLACEHOLDER_VALUES.has(entry.toLowerCase()));

  if (entries.length === 0) return null;
  return entries.map((text, index) => ({
    id: `opt-${index + 1}`,
    text,
  }));
};

const parseBulkNumericId = (value) => {
  const text = toPlainBulkText(value);
  if (!text || BULK_PLACEHOLDER_VALUES.has(text.toLowerCase())) return null;
  if (!/^\d+$/.test(text)) return null;
  return Number.parseInt(text, 10);
};

const normalizeDocxTableAnswer = ({
  questionType,
  answerValue,
  options,
  matchPairsValue,
  blanksValue,
  subQuestionsValue,
  rowNumber,
}) => {
  let resolvedAnswer = answerValue;
  if (isPlaceholderBulkValue(resolvedAnswer)) {
    if (questionType === 'match_following' && !isPlaceholderBulkValue(matchPairsValue)) {
      resolvedAnswer = toPlainBulkText(matchPairsValue);
    } else if (questionType === 'fill_in_blank' && !isPlaceholderBulkValue(blanksValue)) {
      resolvedAnswer = toPlainBulkText(blanksValue);
    } else if (questionType === 'comprehensive' && !isPlaceholderBulkValue(subQuestionsValue)) {
      resolvedAnswer = toPlainBulkText(subQuestionsValue);
    }
  }

  if (questionType === 'true_false') {
    const normalized = toPlainBulkText(resolvedAnswer).toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    throw new AppError(`Row ${rowNumber}: Correct Answer must be true or false`, 400);
  }

  if (questionType === 'numerical') {
    const parsed = Number(toPlainBulkText(resolvedAnswer));
    if (Number.isNaN(parsed)) {
      throw new AppError(`Row ${rowNumber}: Correct Answer must be a number for numerical questions`, 400);
    }
    return parsed;
  }

  if (questionType === 'mcq_single') {
    const token = toPlainBulkText(resolvedAnswer);
    if (!token) {
      throw new AppError(`Row ${rowNumber}: Correct Answer is required for MCQ single`, 400);
    }
    return mapAnswerTokenToOptionId(token, options || []) ?? token;
  }

  if (questionType === 'mcq_multiple') {
    const tokens = toPlainBulkText(resolvedAnswer)
      .split(/[|,;]/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    if (tokens.length === 0) {
      throw new AppError(`Row ${rowNumber}: Correct Answer is required for MCQ multiple`, 400);
    }
    const mapped = tokens
      .map((token) => mapAnswerTokenToOptionId(token, options || []))
      .filter(Boolean);
    return mapped.length > 0 ? mapped : tokens;
  }

  return toPlainBulkText(resolvedAnswer);
};

const normalizeDocxTableRowInput = (rawRow, defaults, rowNumber) => {
  const hasAnyValue = Object.values(rawRow || {}).some((value) => !isPlaceholderBulkValue(value));
  if (!hasAnyValue) {
    return null;
  }

  const questionType = normalizeBulkQuestionType(rawRow.question_type || 'mcq_single');
  if (!VALID_QUESTION_TYPES.includes(questionType)) {
    throw new AppError(`Row ${rowNumber}: Invalid question type "${toPlainBulkText(rawRow.question_type)}"`, 400);
  }

  const baseQuestionHtml = toRichHtmlValue(rawRow.question_text);
  if (!baseQuestionHtml) {
    throw new AppError(`Row ${rowNumber}: Question text is required`, 400);
  }

  const passageHtml = toRichHtmlValue(rawRow.comprehension_passage);

  const options = parseBulkOptionText(rawRow.options);
  if (questionType.startsWith('mcq') && (!options || options.length === 0)) {
    throw new AppError(`Row ${rowNumber}: Options are required for MCQ questions`, 400);
  }

  const answerValue = toPlainBulkText(rawRow.correct_answer);
  const correctAnswer = normalizeDocxTableAnswer({
    questionType,
    answerValue,
    options,
    matchPairsValue: rawRow.match_pairs,
    blanksValue: rawRow.blanks,
    subQuestionsValue: rawRow.comprehensive_subquestions,
    rowNumber,
  });

  const prepared = applyBulkDefaults(
    {
      question_type: questionType,
      question_text: baseQuestionHtml,
      options: options || null,
      correct_answer: correctAnswer,
      program_id: toPlainBulkText(rawRow.program_id ?? rawRow.program) || null,
      grade_id: toPlainBulkText(rawRow.grade_id ?? rawRow.grade) || null,
      subject_id: toPlainBulkText(rawRow.subject_id ?? rawRow.subject) || null,
      chapter_id: toPlainBulkText(rawRow.chapter_id ?? rawRow.chapter) || null,
      topic_id: toPlainBulkText(rawRow.topic_id ?? rawRow.topic) || null,
      difficulty_level: toPlainBulkText(rawRow.difficulty_level) || 'medium',
      exam_tags:
        toPlainBulkText(rawRow.exam_tags || rawRow.tags || rawRow.category || rawRow.catagory) || '',
      category: toPlainBulkText(rawRow.category || rawRow.catagory) || null,
      comprehension_passage: passageHtml,
      comprehension_questions: rawRow.comprehension_questions ?? null,
      marks_positive: toPlainBulkText(rawRow.marks_positive),
      marks_negative: toPlainBulkText(rawRow.marks_negative),
      solution: toRichHtmlValue(rawRow.solution),
      solution_video_url: toPlainBulkText(rawRow.solution_video_url) || null,
      school_id: parseBulkNumericId(rawRow.school_id),
      status: toPlainBulkText(rawRow.status) || undefined,
    },
    defaults
  );

  if (!prepared.subject_id || !prepared.chapter_id) {
    throw new AppError(
      `Row ${rowNumber}: subject and chapter are required (IDs or names supported)`,
      400
    );
  }

  return prepared;
};

const extractDocxTableRows = async (buffer, defaults) => {
  const result = await mammoth.convertToHtml({ buffer });
  const html = String(result?.value || '').trim();
  if (!html.includes('<table')) {
    return [];
  }

  const $ = loadHtml(html);
  const rows = [];

  $('table').each((_tableIndex, tableElement) => {
    const tableRows = $(tableElement).find('tr');
    if (tableRows.length < 2) return;

    const headers = [];
    $(tableRows[0])
      .find('th,td')
      .each((_headerIndex, headerCell) => {
        const normalizedKey = normalizeBulkHeaderKey($(headerCell).text());
        const canonicalKey = BULK_DOCX_TABLE_HEADER_ALIASES[normalizedKey] || normalizedKey;
        headers.push(canonicalKey);
      });

    if (!headers.includes('question_text')) {
      return;
    }

    tableRows.each((rowIndex, rowElement) => {
      if (rowIndex === 0) return;
      const row = {};

      $(rowElement)
        .find('td,th')
        .each((cellIndex, cell) => {
          const key = headers[cellIndex];
          if (!key) return;
          const cellHtml = normalizeDocxCellHtml($(cell).html());
          if (
            key === 'question_text' ||
            key === 'options' ||
            key === 'solution' ||
            key === 'comprehension_passage'
          ) {
            row[key] = cellHtml;
          } else {
            row[key] = normalizeBulkTextValue($(cell).text());
          }
        });

      try {
        const normalized = normalizeDocxTableRowInput(row, defaults, rowIndex + 1);
        if (normalized) {
          rows.push(normalized);
        }
      } catch (err) {
        const message = err instanceof AppError ? err.message : 'Failed to parse row';
        rows.push({ _bulk_error: message, _bulk_row_number: rowIndex + 1 });
      }
    });
  });

  return rows;
};

const mapAnswerTokenToOptionId = (token, options) => {
  const normalized = String(token || '').trim().toUpperCase();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const index = Number.parseInt(normalized, 10) - 1;
    return options[index]?.id ?? null;
  }

  if (/^[A-Z]$/.test(normalized)) {
    const index = normalized.charCodeAt(0) - 65;
    return options[index]?.id ?? null;
  }

  const byText = options.find(
    (option) => String(option.text || '').trim().toLowerCase() === String(token).trim().toLowerCase()
  );
  return byText?.id ?? null;
};

const isBlankValue = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);

const parseBulkEntityReference = (value) => {
  if (isBlankValue(value)) {
    return { provided: false, id: null, text: null };
  }

  const normalized = String(value).trim();
  if (/^\d+$/.test(normalized)) {
    return { provided: true, id: Number.parseInt(normalized, 10), text: null };
  }

  return { provided: true, id: null, text: normalized };
};

const parseGradeNumberToken = (value) => {
  if (isBlankValue(value)) return null;
  const match = String(value).trim().match(/(\d+)/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
};

const resolveProgramReference = async ({ value, clientId }) => {
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    return null;
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `SELECT id FROM programs WHERE id = $1`;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND client_id = $2`;
    }
    const byId = await dbQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Program not found for value "${value}"`, 404);
    }
    return byId.rows[0].id;
  }

  const nameParams = [parsed.text];
  let nameSql = `
    SELECT id
    FROM programs
    WHERE (LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1))
  `;
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND client_id = $2`;
  }
  nameSql += ` ORDER BY id LIMIT 2`;

  const byName = await dbQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Program not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(`Multiple programs match "${value}". Use program_id to disambiguate`, 400);
  }

  return byName.rows[0].id;
};

const resolveGradeReference = async ({ value, programId, clientId }) => {
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    return { id: null, programId: programId ?? null };
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT g.id, g.program_id
      FROM grades g
      JOIN programs p ON p.id = g.program_id
      WHERE g.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND p.client_id = $2`;
    }
    const byId = await dbQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Grade not found for value "${value}"`, 404);
    }
    const grade = byId.rows[0];
    if (programId && Number(grade.program_id) !== Number(programId)) {
      throw new AppError('Grade does not belong to the provided program', 400);
    }
    return { id: grade.id, programId: grade.program_id };
  }

  const parsedGradeNumber = parseGradeNumberToken(parsed.text);
  if (parsedGradeNumber === null) {
    throw new AppError(`Grade "${value}" must be a grade number (for example: 6 or Grade 6)`, 400);
  }

  const nameParams = [parsedGradeNumber];
  let nameSql = `
    SELECT g.id, g.program_id
    FROM grades g
    JOIN programs p ON p.id = g.program_id
    WHERE g.grade_number = $1
  `;
  if (programId) {
    nameParams.push(programId);
    nameSql += ` AND g.program_id = $${nameParams.length}`;
  }
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND p.client_id = $${nameParams.length}`;
  }
  nameSql += ` ORDER BY g.id LIMIT 2`;

  const byName = await dbQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Grade not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(
      `Multiple grades match "${value}". Provide program/program_id or exact grade_id`,
      400
    );
  }

  return { id: byName.rows[0].id, programId: byName.rows[0].program_id };
};

const resolveSubjectReference = async ({ value, gradeId, programId, clientId, required = false }) => {
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    if (required) {
      throw new AppError('subject_id (or subject name) is required', 400);
    }
    return { id: null, gradeId: gradeId ?? null, programId: programId ?? null };
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT s.id, s.grade_id, g.program_id, s.client_id
      FROM subjects s
      LEFT JOIN grades g ON g.id = s.grade_id
      WHERE s.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND s.client_id = $2`;
    }
    const byId = await dbQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Subject not found for value "${value}"`, 404);
    }
    const subject = byId.rows[0];
    if (gradeId && Number(subject.grade_id) !== Number(gradeId)) {
      throw new AppError('Subject does not belong to the provided grade', 400);
    }
    if (programId && Number(subject.program_id) !== Number(programId)) {
      throw new AppError('Subject does not belong to the provided program', 400);
    }
    return { id: subject.id, gradeId: subject.grade_id ?? gradeId ?? null, programId: subject.program_id ?? programId ?? null };
  }

  const nameParams = [parsed.text];
  let nameSql = `
    SELECT s.id, s.grade_id, g.program_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE (LOWER(s.name) = LOWER($1) OR LOWER(s.code) = LOWER($1))
  `;
  if (gradeId) {
    nameParams.push(gradeId);
    nameSql += ` AND s.grade_id = $${nameParams.length}`;
  }
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND s.client_id = $${nameParams.length}`;
  }
  nameSql += ` ORDER BY s.id LIMIT 2`;

  const byName = await dbQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Subject not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(
      `Multiple subjects match "${value}". Provide grade/grade_id or exact subject_id`,
      400
    );
  }

  const subject = byName.rows[0];
  if (programId && Number(subject.program_id) !== Number(programId)) {
    throw new AppError('Subject does not belong to the provided program', 400);
  }
  return { id: subject.id, gradeId: subject.grade_id ?? gradeId ?? null, programId: subject.program_id ?? programId ?? null };
};

const resolveChapterReference = async ({ value, subjectId, clientId, required = false }) => {
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    if (required) {
      throw new AppError('chapter_id (or chapter name/number) is required', 400);
    }
    return { id: null, subjectId: subjectId ?? null };
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT c.id, c.subject_id, s.client_id
      FROM chapters c
      JOIN subjects s ON s.id = c.subject_id
      WHERE c.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND s.client_id = $2`;
    }
    const byId = await dbQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Chapter not found for value "${value}"`, 404);
    }
    const chapter = byId.rows[0];
    if (subjectId && Number(chapter.subject_id) !== Number(subjectId)) {
      throw new AppError('Chapter does not belong to the provided subject', 400);
    }
    return { id: chapter.id, subjectId: chapter.subject_id };
  }

  if (!subjectId) {
    throw new AppError('subject_id is required when chapter is provided by name/number', 400);
  }

  const parsedChapterNumber = parseGradeNumberToken(parsed.text);
  const nameParams = [subjectId, parsed.text];
  let nameSql = `
    SELECT c.id, c.subject_id
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    WHERE c.subject_id = $1
      AND LOWER(c.name) = LOWER($2)
  `;
  if (parsedChapterNumber !== null) {
    nameParams.push(parsedChapterNumber);
    nameSql = `
      SELECT c.id, c.subject_id
      FROM chapters c
      JOIN subjects s ON s.id = c.subject_id
      WHERE c.subject_id = $1
        AND (LOWER(c.name) = LOWER($2) OR c.chapter_number = $3)
    `;
  }
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND s.client_id = $${nameParams.length}`;
  }
  nameSql += ` ORDER BY c.id LIMIT 2`;

  const byName = await dbQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Chapter not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(`Multiple chapters match "${value}". Use chapter_id to disambiguate`, 400);
  }
  return { id: byName.rows[0].id, subjectId: byName.rows[0].subject_id };
};

const resolveTopicReference = async ({ value, chapterId, clientId }) => {
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    return { id: null, chapterId: chapterId ?? null };
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT t.id, t.chapter_id, s.client_id
      FROM topics t
      JOIN chapters c ON c.id = t.chapter_id
      JOIN subjects s ON s.id = c.subject_id
      WHERE t.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND s.client_id = $2`;
    }
    const byId = await dbQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Topic not found for value "${value}"`, 404);
    }
    const topic = byId.rows[0];
    if (chapterId && Number(topic.chapter_id) !== Number(chapterId)) {
      throw new AppError('Topic does not belong to the provided chapter', 400);
    }
    return { id: topic.id, chapterId: topic.chapter_id };
  }

  if (!chapterId) {
    throw new AppError('chapter_id is required when topic is provided by name/number', 400);
  }

  const parsedTopicNumber = parseGradeNumberToken(parsed.text);
  const nameParams = [chapterId, parsed.text];
  let nameSql = `
    SELECT t.id, t.chapter_id
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE t.chapter_id = $1
      AND LOWER(t.name) = LOWER($2)
  `;
  if (parsedTopicNumber !== null) {
    nameParams.push(parsedTopicNumber);
    nameSql = `
      SELECT t.id, t.chapter_id
      FROM topics t
      JOIN chapters c ON c.id = t.chapter_id
      JOIN subjects s ON s.id = c.subject_id
      WHERE t.chapter_id = $1
        AND (LOWER(t.name) = LOWER($2) OR t.topic_number = $3)
    `;
  }
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND s.client_id = $${nameParams.length}`;
  }
  nameSql += ` ORDER BY t.id LIMIT 2`;

  const byName = await dbQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Topic not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(`Multiple topics match "${value}". Use topic_id to disambiguate`, 400);
  }
  return { id: byName.rows[0].id, chapterId: byName.rows[0].chapter_id };
};

const finalizeDocxQuestion = (question, defaults, rowNumber) => {
  if (!question || !question.question_text) {
    return null;
  }

  const options = (question.options || []).map((option, index) => ({
    id: option.id || `opt-${index + 1}`,
    text: option.text,
  }));

  const questionType = normalizeBulkQuestionType(question.question_type || 'mcq_single');
  const answerRaw = question.correct_answer;
  let correctAnswer = answerRaw;
  if (questionType === 'true_false') {
    const answerValue = String(answerRaw || '').trim().toLowerCase();
    correctAnswer = answerValue === 'true';
  } else if (questionType === 'numerical') {
    correctAnswer = Number(answerRaw);
  } else if (questionType === 'mcq_single') {
    correctAnswer = mapAnswerTokenToOptionId(answerRaw, options) ?? String(answerRaw || '').trim();
  } else if (questionType === 'mcq_multiple') {
    const tokens = String(answerRaw || '')
      .split(/[|,;]/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    const mapped = tokens
      .map((token) => mapAnswerTokenToOptionId(token, options))
      .filter(Boolean);
    correctAnswer = mapped.length > 0 ? mapped : tokens;
  }

  const prepared = applyBulkDefaults(
    {
      question_type: questionType,
      question_text: question.question_text,
      options: options.length > 0 ? options : null,
      correct_answer: correctAnswer,
      program_id: question.program_id,
      grade_id: question.grade_id,
      subject_id: question.subject_id,
      chapter_id: question.chapter_id,
      topic_id: question.topic_id,
      difficulty_level: question.difficulty_level || 'medium',
      exam_tags: question.exam_tags || [],
      marks_positive: question.marks_positive ?? 4,
      marks_negative: question.marks_negative ?? 0,
      solution: question.solution ?? null,
      solution_video_url: question.solution_video_url ?? null,
      school_id: question.school_id ?? null,
      status: question.status ?? undefined,
    },
    defaults
  );

  if (!prepared.subject_id || !prepared.chapter_id) {
    throw new AppError(
      `Row ${rowNumber}: subject_id and chapter_id are required (set in file or upload defaults)`,
      400
    );
  }
  return prepared;
};

const extractDocxRows = (buffer, defaults) => {
  const zip = new AdmZip(buffer);
  const documentEntry = zip.getEntry('word/document.xml');
  if (!documentEntry) {
    throw new AppError('Invalid Word file: document.xml missing', 400);
  }

  const relsEntry = zip.getEntry('word/_rels/document.xml.rels');
  const relationshipMap = {};
  if (relsEntry) {
    const relsXml = relsEntry.getData().toString('utf8');
    const relMatches = relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g);
    for (const match of relMatches) {
      relationshipMap[match[1]] = match[2];
    }
  }

  const documentXml = documentEntry.getData().toString('utf8');
  const paragraphMatches = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  if (paragraphMatches.length === 0) {
    throw new AppError('Word file has no readable paragraph content', 400);
  }

  const rows = [];
  let globalMeta = {};
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    const normalized = finalizeDocxQuestion(current, defaults, rows.length + 2);
    if (normalized) rows.push(normalized);
    current = null;
  };

  paragraphMatches.forEach((paragraphXml) => {
    const plainText = decodeXmlEntities(
      Array.from(paragraphXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g))
        .map((match) => match[1])
        .join('')
    ).trim();

    const htmlParts = [];
    if (plainText) {
      htmlParts.push(escapeHtml(plainText));
    }

    const equationText = decodeXmlEntities(
      Array.from(paragraphXml.matchAll(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g))
        .map((match) => match[1])
        .join('')
    ).trim();
    if (paragraphXml.includes('<m:oMath')) {
      htmlParts.push(`<span class="math-equation">${escapeHtml(equationText || '[Equation]')}</span>`);
    }

    const imageMatches = paragraphXml.matchAll(/r:embed="([^"]+)"/g);
    for (const imageMatch of imageMatches) {
      const relId = imageMatch[1];
      const target = relationshipMap[relId];
      if (!target) continue;
      const normalizedTarget = target.replace(/^\/+/, '');
      const imageEntry = zip.getEntry(`word/${normalizedTarget}`);
      if (!imageEntry) continue;
      const base64 = imageEntry.getData().toString('base64');
      const filename = normalizedTarget.split('/').pop() || 'image';
      const mimeType = getImageMimeType(filename);
      htmlParts.push(`<img src="data:${mimeType};base64,${base64}" alt="${escapeHtml(filename)}" />`);
    }

    const paragraphHtml = htmlParts.join(' ').trim();
    if (!plainText && !paragraphHtml) return;

    const metaMatch = plainText.match(
      /^(program_id|grade_id|subject_id|chapter_id|topic_id|difficulty_level|marks_positive|marks_negative|exam_tags|status|school_id)\s*:\s*(.+)$/i
    );
    if (!current && metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2].trim();
      if (key === 'exam_tags') {
        globalMeta.exam_tags = value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      } else {
        globalMeta[key] = value;
      }
      return;
    }

    const questionMatch =
      plainText.match(/^question(?:\s+\d+)?\s*[:.-]\s*(.*)$/i) ||
      plainText.match(/^q(?:\s+\d+)?\s*[:.-]\s*(.*)$/i) ||
      plainText.match(/^\d+\s*[\).:-]\s*(.+)$/i);
    if (questionMatch) {
      pushCurrent();
      current = {
        ...globalMeta,
        question_type: 'mcq_single',
        question_text: questionMatch[1] ? `<p>${escapeHtml(questionMatch[1])}</p>` : '',
        options: [],
      };
      if (!current.question_text && paragraphHtml) {
        current.question_text = `<p>${paragraphHtml}</p>`;
      }
      return;
    }

    if (!current) {
      return;
    }

    const typeMatch = plainText.match(/^type\s*:\s*(.+)$/i);
    if (typeMatch) {
      current.question_type = typeMatch[1].trim();
      return;
    }

    if (metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2].trim();
      if (key === 'exam_tags') {
        current.exam_tags = value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      } else {
        current[key] = value;
      }
      return;
    }

    const optionMatch = plainText.match(/^([A-H])[\).:-]\s*(.*)$/i);
    if (optionMatch) {
      const optionHtml = paragraphHtml.replace(/^[A-H][\).:-]\s*/i, '').trim();
      const optionText = optionHtml || escapeHtml(optionMatch[2] || '').trim();
      if (!optionText) return;
      current.options.push({
        id: `opt-${current.options.length + 1}`,
        text: optionText,
      });
      return;
    }

    const answerMatch = plainText.match(
      /^(answer|ans|correct_answer|correct answer|correct option)\s*[:.-]\s*(.+)$/i
    );
    if (answerMatch) {
      current.correct_answer = answerMatch[2].trim();
      return;
    }

    current.question_text = `${current.question_text || ''}<p>${paragraphHtml || escapeHtml(plainText)}</p>`;
  });

  pushCurrent();

  if (rows.length === 0) {
    throw new AppError(
      'No questions found in Word file. Use "Question:", option lines like "A) ...", and "Answer:"',
      400
    );
  }

  return rows;
};

const extractBulkRowsFromFile = async (file, defaults) => {
  const extension = getFileExtension(file?.originalname || '');
  if (extension === 'csv') {
    const csvText = file.buffer.toString('utf8');
    const parsedRows = parseCsvContent(csvText);
    return parsedRows.map((row) => normalizeCsvRowInput(row, defaults));
  }

  if (extension === 'docx') {
    const tableRows = await extractDocxTableRows(file.buffer, defaults);
    if (tableRows.length > 0) {
      return tableRows;
    }
    return extractDocxRows(file.buffer, defaults);
  }

  if (extension === 'doc') {
    throw new AppError('Legacy .doc is not supported. Please upload .docx instead.', 400);
  }

  throw new AppError('Unsupported file type. Allowed: .csv, .docx', 400);
};

const buildQuestionInsertPayload = async ({ input, user, role, clientId }) => {
  const questionType = requireString(input.question_type, 'question_type');
  if (!VALID_QUESTION_TYPES.includes(questionType)) {
    throw new AppError('Invalid question_type', 400);
  }

  const questionTextInput = input.question_text;
  if (
    questionTextInput === undefined ||
    questionTextInput === null ||
    (typeof questionTextInput === 'string' && !questionTextInput.trim())
  ) {
    throw new AppError('question_text is required', 400);
  }
  const questionText = typeof questionTextInput === 'string' ? questionTextInput.trim() : questionTextInput;

  let correctAnswerRaw = coerceLooseValue(input.correct_answer);
  const missingCorrectAnswer =
    correctAnswerRaw === undefined ||
    correctAnswerRaw === null ||
    (typeof correctAnswerRaw === 'string' && !correctAnswerRaw.trim());
  if (questionType === 'comprehensive' && missingCorrectAnswer) {
    correctAnswerRaw = {};
  } else if (missingCorrectAnswer) {
    throw new AppError('correct_answer is required', 400);
  }
  if (questionType === 'comprehensive' && typeof correctAnswerRaw === 'string' && isPlaceholderBulkValue(correctAnswerRaw)) {
    correctAnswerRaw = {};
  }

  const resolvedProgramId = await resolveProgramReference({
    value: input.program_id ?? input.program,
    clientId,
  });
  const resolvedGrade = await resolveGradeReference({
    value: input.grade_id ?? input.grade,
    programId: resolvedProgramId,
    clientId,
  });
  const resolvedSubject = await resolveSubjectReference({
    value: input.subject_id ?? input.subject,
    gradeId: resolvedGrade.id,
    programId: resolvedProgramId ?? resolvedGrade.programId,
    clientId,
    required: true,
  });
  const resolvedChapter = await resolveChapterReference({
    value: input.chapter_id ?? input.chapter,
    subjectId: resolvedSubject.id,
    clientId,
    required: true,
  });
  const resolvedTopic = await resolveTopicReference({
    value: input.topic_id ?? input.topic,
    chapterId: resolvedChapter.id,
    clientId,
  });

  const programId = resolvedProgramId ?? resolvedGrade.programId ?? resolvedSubject.programId ?? null;
  const gradeId = resolvedGrade.id ?? resolvedSubject.gradeId ?? null;
  const subjectId = resolvedSubject.id;
  const chapterId = resolvedChapter.id;
  const topicId = resolvedTopic.id;

  await ensureCurriculumScope({ programId, gradeId, subjectId, chapterId, topicId, clientId });

  const schoolId = parseNullableInt(input.school_id, 'school_id');
  await ensureSchoolAccess({ schoolId, role, userId: user.id, clientId });

  const difficulty = input.difficulty_level ? String(input.difficulty_level) : 'medium';
  if (!VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
    throw new AppError('Invalid difficulty_level', 400);
  }

  const statusInput = input.status ? String(input.status) : null;
  const status =
    isTeacher(role) ? 'draft' : statusInput && VALID_STATUSES.includes(statusInput) ? statusInput : 'draft';

  const options = parseOptionsInput(input.options);
  if (questionType.startsWith('mcq') && (!options || options.length === 0)) {
    throw new AppError('options are required for MCQ questions', 400);
  }

  const comprehensionPassage =
    questionType === 'comprehensive'
      ? input.comprehension_passage ?? input.comprehensive_passage ?? null
      : null;
  const comprehensionQuestions =
    questionType === 'comprehensive'
      ? Array.isArray(input.comprehension_questions)
        ? input.comprehension_questions
        : []
      : null;
  const hasComprehensionPassage =
    comprehensionPassage !== null &&
    comprehensionPassage !== undefined &&
    !(
      typeof comprehensionPassage === 'string' &&
      comprehensionPassage.trim().length === 0
    ) &&
    !(
      typeof comprehensionPassage === 'object' &&
      comprehensionPassage &&
      'html' in comprehensionPassage &&
      String(comprehensionPassage.html ?? '').trim().length === 0
    );
  if (questionType === 'comprehensive' && !hasComprehensionPassage) {
    throw new AppError('comprehension_passage is required for comprehensive questions', 400);
  }

  return {
    client_id: clientId,
    school_id: schoolId,
    question_type: questionType,
    question_text: questionText,
    options,
    correct_answer: correctAnswerRaw,
    solution: input.solution ?? null,
    solution_video_url: input.solution_video_url ?? null,
    comprehension_passage: comprehensionPassage,
    comprehension_questions: comprehensionQuestions,
    subject_id: subjectId,
    chapter_id: chapterId,
    topic_id: topicId,
    difficulty_level: difficulty,
    exam_tags: parseExamTagsInput(input.exam_tags ?? input.category ?? input.catagory),
    marks_positive: parseNumberField(input.marks_positive, 'marks_positive', 4),
    marks_negative: parseNumberField(input.marks_negative, 'marks_negative', 0),
    status,
    created_by: user.id,
  };
};

let questionSchemaSupportCache = null;

const getQuestionSchemaSupport = async () => {
  if (questionSchemaSupportCache) {
    return questionSchemaSupportCache;
  }

  const result = await dbQuery(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = ANY($1::text[])
    `,
    [['comprehension_passage', 'comprehension_questions']]
  );

  const existingColumns = new Set(result.rows.map((row) => row.column_name));
  questionSchemaSupportCache = {
    hasComprehensionPassage: existingColumns.has('comprehension_passage'),
    hasComprehensionQuestions: existingColumns.has('comprehension_questions'),
  };
  return questionSchemaSupportCache;
};

const insertQuestion = async (payload) => {
  const schemaSupport = await getQuestionSchemaSupport();
  const columns = [
    'client_id',
    'school_id',
    'question_type',
    'question_text',
    'options',
    'correct_answer',
    'solution',
    'solution_video_url',
  ];
  const values = [
    payload.client_id,
    payload.school_id,
    payload.question_type,
    toDbJsonParam(payload.question_text),
    toDbJsonParam(payload.options),
    toDbJsonParam(payload.correct_answer),
    toDbJsonParam(payload.solution),
    payload.solution_video_url,
  ];

  if (schemaSupport.hasComprehensionPassage) {
    columns.push('comprehension_passage');
    values.push(toDbJsonParam(payload.comprehension_passage));
  }
  if (schemaSupport.hasComprehensionQuestions) {
    columns.push('comprehension_questions');
    values.push(toDbJsonParam(payload.comprehension_questions));
  }

  columns.push(
    'subject_id',
    'chapter_id',
    'topic_id',
    'difficulty_level',
    'exam_tags',
    'marks_positive',
    'marks_negative',
    'status',
    'created_by'
  );
  values.push(
    payload.subject_id,
    payload.chapter_id,
    payload.topic_id,
    payload.difficulty_level,
    payload.exam_tags,
    payload.marks_positive,
    payload.marks_negative,
    payload.status,
    payload.created_by
  );

  const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
  const insertResult = await dbQuery(
    `
    INSERT INTO questions (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING id
    `,
    values
  );

  const insertedId = insertResult.rows[0].id;
  const fullResult = await dbQuery(
    `
    SELECT q.*, s.grade_id, g.program_id
    FROM questions q
    LEFT JOIN subjects s ON s.id = q.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE q.id = $1
    `,
    [insertedId]
  );
  return fullResult.rows[0];
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
      SELECT q.*, s.grade_id, g.program_id
      FROM questions q
      LEFT JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN grades g ON g.id = s.grade_id
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
      SELECT q.*, s.grade_id, g.program_id
      FROM questions q
      LEFT JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN grades g ON g.id = s.grade_id
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
    const payload = await buildQuestionInsertPayload({
      input: req.body,
      user: req.user,
      role,
      clientId,
    });
    const inserted = await insertQuestion(payload);
    res.status(201).json(inserted);
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

    if (req.body.question_text !== undefined) updates.question_text = toDbJsonParam(req.body.question_text);
    if (req.body.options !== undefined) updates.options = toDbJsonParam(req.body.options ?? null);
    if (req.body.correct_answer !== undefined) updates.correct_answer = toDbJsonParam(req.body.correct_answer);
    if (req.body.solution !== undefined) updates.solution = toDbJsonParam(req.body.solution ?? null);
    if (req.body.solution_video_url !== undefined) updates.solution_video_url = req.body.solution_video_url ?? null;
    if (req.body.comprehension_passage !== undefined) {
      updates.comprehension_passage = toDbJsonParam(req.body.comprehension_passage ?? null);
    } else if (req.body.comprehensive_passage !== undefined) {
      updates.comprehension_passage = toDbJsonParam(req.body.comprehensive_passage ?? null);
    }
    if (req.body.comprehension_questions !== undefined) {
      updates.comprehension_questions = toDbJsonParam(req.body.comprehension_questions ?? null);
    } else if (req.body.comprehensive_subquestions !== undefined) {
      updates.comprehension_questions = toDbJsonParam(req.body.comprehensive_subquestions ?? null);
    }
    const schemaSupport = await getQuestionSchemaSupport();
    if (!schemaSupport.hasComprehensionPassage) {
      delete updates.comprehension_passage;
    }
    if (!schemaSupport.hasComprehensionQuestions) {
      delete updates.comprehension_questions;
    }

    if (
      req.body.program_id !== undefined ||
      req.body.grade_id !== undefined ||
      req.body.subject_id !== undefined ||
      req.body.chapter_id !== undefined ||
      req.body.topic_id !== undefined
    ) {
      const programId = req.body.program_id !== undefined
        ? parseNullableInt(req.body.program_id, 'program_id')
        : null;
      const gradeId = req.body.grade_id !== undefined
        ? parseNullableInt(req.body.grade_id, 'grade_id')
        : null;
      const subjectId = req.body.subject_id ? parseRequiredInt(req.body.subject_id, 'subject_id') : question.subject_id;
      const chapterId = req.body.chapter_id ? parseRequiredInt(req.body.chapter_id, 'chapter_id') : question.chapter_id;
      const topicId = req.body.topic_id !== undefined ? parseNullableInt(req.body.topic_id, 'topic_id') : question.topic_id;
      await ensureCurriculumScope({ programId, gradeId, subjectId, chapterId, topicId, clientId });
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
      `UPDATE questions SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id`,
      values
    );

    const fullResult = await dbQuery(
      `
      SELECT q.*, s.grade_id, g.program_id
      FROM questions q
      LEFT JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN grades g ON g.id = s.grade_id
      WHERE q.id = $1
      `,
      [updateResult.rows[0].id]
    );
    res.json(fullResult.rows[0]);
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

    if (question.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft questions can be approved' });
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

    if (question.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft questions can be rejected' });
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

const parseBooleanParam = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  throw new AppError(`${fieldName} must be a boolean`, 400);
};

const buildFolderAccess = async ({ user, clientId, schoolIdFilter, includeInactive }) => {
  const role = user?.role;
  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (clientId) {
    conditions.push(`f.client_id = ${addParam(clientId)}`);
  }

  if (!includeInactive) {
    conditions.push(`f.is_active = TRUE`);
  }

  const isScopedBySchool = isTeacher(role) || isSchoolOwner(role);
  let schoolIds = [];
  if (isScopedBySchool) {
    schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(f.school_id IS NULL OR f.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`f.school_id IS NULL`);
    }
  }

  if (schoolIdFilter !== null && schoolIdFilter !== undefined) {
    conditions.push(`f.school_id = ${addParam(schoolIdFilter)}`);
  }

  return { conditions, params, addParam };
};

export const listQuestionFolders = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const schoolIdFilter = parseNullableInt(req.query.school_id, 'school_id');
    const includeInactive = parseBooleanParam(req.query.include_inactive, 'include_inactive') ?? false;
    await ensureSchoolAccess({ schoolId: schoolIdFilter, role, userId: req.user.id, clientId });

    const { conditions, params, addParam } = await buildFolderAccess({
      user: req.user,
      clientId,
      schoolIdFilter,
      includeInactive,
    });

    const questionJoinConditions = [
      `q.folder_id = f.id`,
      `q.status <> 'archived'`,
      `q.client_id = f.client_id`,
    ];
    if (isTeacher(role)) {
      questionJoinConditions.push(`(q.status = 'approved' OR q.created_by = ${addParam(req.user.id)})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await dbQuery(
      `
      SELECT f.*, COUNT(q.id) AS question_count
      FROM question_folders f
      LEFT JOIN questions q ON ${questionJoinConditions.join(' AND ')}
      ${whereClause}
      GROUP BY f.id
      ORDER BY f.created_at DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load question folders');
  }
};

export const getQuestionFolderById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const id = parseRequiredInt(req.params.id, 'id');
    const includeInactive = parseBooleanParam(req.query.include_inactive, 'include_inactive') ?? false;

    const { conditions, params, addParam } = await buildFolderAccess({
      user: req.user,
      clientId,
      schoolIdFilter: null,
      includeInactive,
    });

    conditions.push(`f.id = ${addParam(id)}`);

    const questionJoinConditions = [
      `q.folder_id = f.id`,
      `q.status <> 'archived'`,
      `q.client_id = f.client_id`,
    ];
    if (isTeacher(role)) {
      questionJoinConditions.push(`(q.status = 'approved' OR q.created_by = ${addParam(req.user.id)})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await dbQuery(
      `
      SELECT f.*, COUNT(q.id) AS question_count
      FROM question_folders f
      LEFT JOIN questions q ON ${questionJoinConditions.join(' AND ')}
      ${whereClause}
      GROUP BY f.id
      LIMIT 1
      `,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load folder');
  }
};

export const createQuestionFolder = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    let clientId = ensureClientScope(req.user.client_id ?? null, role);
    if (!clientId) {
      clientId = parseNullableInt(req.body.client_id, 'client_id');
      if (!clientId) {
        throw new AppError('client_id is required for this role', 400);
      }
    }

    const name = requireString(req.body?.name, 'name');
    const descriptionInput = req.body?.description;
    const description =
      descriptionInput === undefined || descriptionInput === null
        ? null
        : String(descriptionInput).trim() || null;

    const schoolId = parseNullableInt(req.body?.school_id, 'school_id');
    await ensureSchoolAccess({ schoolId, role, userId: req.user.id, clientId });

    const insertResult = await dbQuery(
      `
      INSERT INTO question_folders (client_id, school_id, name, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [clientId, schoolId, name, description, req.user.id]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create folder');
  }
};

export const updateQuestionFolder = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const id = parseRequiredInt(req.params.id, 'id');

    const existing = await dbQuery(`SELECT * FROM question_folders WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    const folder = existing.rows[0];

    if (clientId && folder.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isTeacher(role) || isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (folder.school_id && !schoolIds.includes(folder.school_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updates = {};

    if (req.body?.name !== undefined) {
      updates.name = requireString(req.body.name, 'name');
    }

    if (req.body?.description !== undefined) {
      const descriptionInput = req.body.description;
      updates.description =
        descriptionInput === undefined || descriptionInput === null
          ? null
          : String(descriptionInput).trim() || null;
    }

    if (req.body?.school_id !== undefined) {
      const schoolId = parseNullableInt(req.body.school_id, 'school_id');
      await ensureSchoolAccess({ schoolId, role, userId: req.user.id, clientId });
      updates.school_id = schoolId;
    }

    if (req.body?.is_active !== undefined) {
      updates.is_active = parseBooleanParam(req.body.is_active, 'is_active');
    }

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
      `UPDATE question_folders SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update folder');
  }
};

const buildTemplateRow = (cells) =>
  new TableRow({
    children: cells.map(
      (value) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun(String(value ?? ''))] })],
        })
    ),
  });

const TEMPLATE_HEADERS = [
  'Type',
  'Question',
  'Options',
  'Correct Answer',
  'Match Pairs',
  'Blanks',
  'Solution',
  'Difficulty',
  'Marks+',
  'Marks-',
  'Tags',
  'Program',
  'Grade',
  'Subject',
  'Chapter',
  'Topic',
  'Comprehensive Passage',
  'Category',
];

export const bulkUploadTemplate = async (_req, res) => {
  try {
    const table = new Table({
      rows: [
        buildTemplateRow(TEMPLATE_HEADERS),
        buildTemplateRow([
          'mcq_single',
          'What is 2 + 2?',
          '2;3;4;5',
          'C',
          '-',
          '-',
          '2 + 2 = 4.',
          'easy',
          '4',
          '1',
          'math,arithmetic',
          'Catalyst',
          '6',
          'Math',
          'Basics',
          'Addition',
          '-',
          'direct question',
        ]),
      ],
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Question Bank Bulk Upload Template', bold: true })],
            }),
            new Paragraph(''),
            table,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="question-bank-template.docx"');
    res.send(buffer);
  } catch (err) {
    handleServiceError(res, err, 'Failed to generate bulk upload template');
  }
};

let hasQuestionsFolderIdColumn = null;

const checkQuestionsFolderIdColumn = async () => {
  if (hasQuestionsFolderIdColumn !== null) {
    return hasQuestionsFolderIdColumn;
  }

  const columnResult = await dbQuery(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'folder_id'
    LIMIT 1
    `
  );

  hasQuestionsFolderIdColumn = columnResult.rows.length > 0;
  return hasQuestionsFolderIdColumn;
};

const ensureBulkFolderAccess = async ({ folderId, user, role, clientId }) => {
  if (!folderId) return null;

  const result = await dbQuery(
    `SELECT id, client_id, school_id, is_active FROM question_folders WHERE id = $1 LIMIT 1`,
    [folderId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Folder not found', 404);
  }

  const folder = result.rows[0];
  if (!folder.is_active) {
    throw new AppError('Folder is inactive', 400);
  }

  if (clientId && folder.client_id !== clientId) {
    throw new AppError('Access denied for folder', 403);
  }

  if (isTeacher(role) || isSchoolOwner(role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (folder.school_id && !schoolIds.includes(folder.school_id)) {
      throw new AppError('Access denied for folder', 403);
    }
  }

  return folder.id;
};

export const bulkUploadQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'File is required for bulk upload.' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const defaults = normalizeBulkDefaults(req.body || {});
    const folderId = parseNullableInt(req.body?.folder_id, 'folder_id');

    let selectedFolderId = null;
    let canAssignFolder = false;
    if (folderId) {
      selectedFolderId = await ensureBulkFolderAccess({
        folderId,
        user: req.user,
        role,
        clientId,
      });
      canAssignFolder = await checkQuestionsFolderIdColumn();
      if (!canAssignFolder) {
        throw new AppError('This database does not support folder assignment on questions yet', 400);
      }
    }

    const rows = await extractBulkRowsFromFile(req.file, defaults);
    if (rows.length === 0) {
      throw new AppError('No valid question rows found in the uploaded file', 400);
    }

    const inserted = [];
    const errors = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      if (row && typeof row === 'object' && row._bulk_error) {
        const parsedRowNumber = Number(row._bulk_row_number || rowNumber);
        errors.push({
          row: parsedRowNumber,
          message: String(row._bulk_error),
        });
        continue;
      }

      try {
        const payload = await buildQuestionInsertPayload({
          input: row,
          user: req.user,
          role,
          clientId,
        });
        const created = await insertQuestion(payload);

        if (selectedFolderId && canAssignFolder) {
          await dbQuery(`UPDATE questions SET folder_id = $1 WHERE id = $2`, [selectedFolderId, created.id]);
        }

        inserted.push(created);
      } catch (err) {
        const message = err instanceof AppError ? err.message : 'Failed to insert question';
        errors.push({
          row: rowNumber,
          message: `Row ${rowNumber}: ${message}`,
        });
      }
    }

    return res.json({
      inserted: inserted.length,
      total: rows.length,
      errors,
      data: inserted,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to bulk upload questions');
  }
};
