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
  if ((merged.subject_id === undefined || merged.subject_id === '') && defaults.subject_id !== undefined) {
    merged.subject_id = defaults.subject_id;
  }
  if ((merged.chapter_id === undefined || merged.chapter_id === '') && defaults.chapter_id !== undefined) {
    merged.chapter_id = defaults.chapter_id;
  }
  if ((merged.topic_id === undefined || merged.topic_id === '') && defaults.topic_id !== undefined) {
    merged.topic_id = defaults.topic_id;
  }
  if ((merged.school_id === undefined || merged.school_id === '') && defaults.school_id !== undefined) {
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
      /^(subject_id|chapter_id|topic_id|difficulty_level|marks_positive|marks_negative|exam_tags|status|school_id)\s*:\s*(.+)$/i
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

const extractBulkRowsFromFile = (file, defaults) => {
  const extension = getFileExtension(file?.originalname || '');
  if (extension === 'csv') {
    const csvText = file.buffer.toString('utf8');
    const parsedRows = parseCsvContent(csvText);
    return parsedRows.map((row) => normalizeCsvRowInput(row, defaults));
  }

  if (extension === 'docx') {
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

  const correctAnswerRaw = coerceLooseValue(input.correct_answer);
  if (
    correctAnswerRaw === undefined ||
    correctAnswerRaw === null ||
    (typeof correctAnswerRaw === 'string' && !correctAnswerRaw.trim())
  ) {
    throw new AppError('correct_answer is required', 400);
  }

  const subjectId = parseRequiredInt(input.subject_id, 'subject_id');
  const chapterId = parseRequiredInt(input.chapter_id, 'chapter_id');
  const topicId = parseNullableInt(input.topic_id, 'topic_id');
  await ensureCurriculumScope({ subjectId, chapterId, topicId, clientId });

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

  return {
    client_id: clientId,
    school_id: schoolId,
    question_type: questionType,
    question_text: questionText,
    options,
    correct_answer: correctAnswerRaw,
    solution: input.solution ?? null,
    solution_video_url: input.solution_video_url ?? null,
    subject_id: subjectId,
    chapter_id: chapterId,
    topic_id: topicId,
    difficulty_level: difficulty,
    exam_tags: parseExamTagsInput(input.exam_tags),
    marks_positive: parseNumberField(input.marks_positive, 'marks_positive', 4),
    marks_negative: parseNumberField(input.marks_negative, 'marks_negative', 0),
    status,
    created_by: user.id,
  };
};

const insertQuestion = async (payload) => {
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

  return insertResult.rows[0];
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
    const payload = await buildQuestionInsertPayload({
      input: req.body ?? {},
      user: req.user,
      role,
      clientId,
    });
    const created = await insertQuestion(payload);

    res.status(201).json(created);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create question');
  }
};

let ensureQuestionFoldersTablePromise = null;

const ensureQuestionFoldersTable = async () => {
  if (!ensureQuestionFoldersTablePromise) {
    ensureQuestionFoldersTablePromise = (async () => {
      await dbQuery(
        `
        CREATE TABLE IF NOT EXISTS question_folders (
          id SERIAL PRIMARY KEY,
          client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
          school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        `
      );
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_question_folders_client ON question_folders(client_id)`
      );
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_question_folders_school ON question_folders(school_id)`
      );
    })().catch((err) => {
      ensureQuestionFoldersTablePromise = null;
      throw err;
    });
  }

  return ensureQuestionFoldersTablePromise;
};

const buildQuestionFolderWhere = async ({ user, paramsStartAt = 1 }) => {
  const role = user?.role;
  const clientId = ensureClientScope(user?.client_id ?? null, role);
  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${paramsStartAt + params.length - 1}`;
  };

  if (clientId) {
    conditions.push(`f.client_id = ${addParam(clientId)}`);
  }

  if (isTeacher(role) || isSchoolOwner(role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(f.school_id IS NULL OR f.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`f.school_id IS NULL`);
    }
  }

  return { conditions, params };
};

const normalizeFolder = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  question_count: Number(row.question_count ?? 0),
  questionCount: Number(row.question_count ?? 0),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const bulkUploadQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const defaults = normalizeBulkDefaults(req.body ?? {});
    let questions = [];

    if (req.file) {
      questions = extractBulkRowsFromFile(req.file, defaults);
    } else if (Array.isArray(req.body?.questions)) {
      questions = req.body.questions.map((row) => applyBulkDefaults(row, defaults));
    } else if (typeof req.body?.questions === 'string') {
      try {
        const parsed = JSON.parse(req.body.questions);
        if (!Array.isArray(parsed)) {
          throw new AppError('questions must be an array', 400);
        }
        questions = parsed.map((row) => applyBulkDefaults(row, defaults));
      } catch (err) {
        throw new AppError('questions must be a valid JSON array', 400);
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new AppError('questions must be a non-empty array', 400);
    }

    if (questions.length > 500) {
      throw new AppError('A maximum of 500 questions can be uploaded at once', 400);
    }

    const created = [];
    const failed = [];

    for (let index = 0; index < questions.length; index += 1) {
      const row = questions[index];
      try {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new AppError('Row must be an object', 400);
        }

        const payload = await buildQuestionInsertPayload({
          input: row,
          user: req.user,
          role,
          clientId,
        });
        const inserted = await insertQuestion(payload);
        created.push({
          index,
          row_number: index + 2,
          id: inserted.id,
          status: inserted.status,
        });
      } catch (err) {
        if (err instanceof AppError) {
          failed.push({ index, row_number: index + 2, error: err.message });
        } else {
          console.error(`Bulk upload failed at row ${index}:`, err);
          failed.push({
            index,
            row_number: index + 2,
            error: 'Unexpected error while creating question',
          });
        }
      }
    }

    const responsePayload = {
      total: questions.length,
      created_count: created.length,
      failed_count: failed.length,
      created,
      failed,
    };

    if (created.length === 0 && failed.length > 0) {
      return res.status(400).json({
        error: failed[0].error,
        ...responsePayload,
      });
    }

    const successStatus = created.length > 0 ? 201 : 400;
    res.status(successStatus).json(responsePayload);
  } catch (err) {
    handleServiceError(res, err, 'Failed to bulk upload questions');
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

    if (req.body.status !== undefined) {
      const nextStatus = requireString(req.body.status, 'status');
      if (nextStatus !== 'draft') {
        throw new AppError('Only status "draft" is allowed', 400);
      }
      if (question.status !== 'rejected') {
        throw new AppError('Only rejected questions can be moved to draft', 400);
      }
      updates.status = 'draft';
    }

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

export const listQuestionFolders = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureQuestionFoldersTable();
    const { conditions, params } = await buildQuestionFolderWhere({ user: req.user });
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await dbQuery(
      `
      SELECT
        f.id,
        f.name,
        f.description,
        f.created_at,
        f.updated_at,
        0::INT AS question_count
      FROM question_folders f
      ${whereClause}
      ORDER BY f.created_at DESC
      `,
      params
    );

    res.json(result.rows.map(normalizeFolder));
  } catch (err) {
    handleServiceError(res, err, 'Failed to load folders');
  }
};

export const getQuestionFolderById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureQuestionFoldersTable();
    const id = parseRequiredInt(req.params.id, 'id');
    const { conditions, params } = await buildQuestionFolderWhere({
      user: req.user,
      paramsStartAt: 2,
    });

    const whereParts = [`f.id = $1`, ...conditions];
    const result = await dbQuery(
      `
      SELECT
        f.id,
        f.name,
        f.description,
        f.created_at,
        f.updated_at,
        0::INT AS question_count
      FROM question_folders f
      WHERE ${whereParts.join(' AND ')}
      LIMIT 1
      `,
      [id, ...params]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json(normalizeFolder(result.rows[0]));
  } catch (err) {
    handleServiceError(res, err, 'Failed to load folder');
  }
};

export const createQuestionFolder = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureQuestionFoldersTable();
    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const name = requireString(req.body?.name, 'name');
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const schoolId = parseNullableInt(req.body?.school_id, 'school_id');

    await ensureSchoolAccess({ schoolId, role, userId: req.user.id, clientId });

    const result = await dbQuery(
      `
      INSERT INTO question_folders (client_id, school_id, name, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, created_at, updated_at
      `,
      [clientId, schoolId, name, description, req.user.id]
    );

    res.status(201).json(normalizeFolder(result.rows[0]));
  } catch (err) {
    handleServiceError(res, err, 'Failed to create folder');
  }
};

export const updateQuestionFolder = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureQuestionFoldersTable();
    const id = parseRequiredInt(req.params.id, 'id');
    const { conditions, params } = await buildQuestionFolderWhere({
      user: req.user,
      paramsStartAt: 2,
    });
    const existingWhere = [`id = $1`, ...conditions];

    const existing = await dbQuery(
      `SELECT id, school_id FROM question_folders WHERE ${existingWhere.join(' AND ')} LIMIT 1`,
      [id, ...params]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const updates = {};
    if (req.body?.name !== undefined) {
      updates.name = requireString(req.body.name, 'name');
    }
    if (req.body?.description !== undefined) {
      updates.description =
        req.body.description === null ? null : String(req.body.description).trim();
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No updates provided', 400);
    }

    const setClauses = [];
    const values = [];
    let idx = 1;
    Object.entries(updates).forEach(([column, value]) => {
      setClauses.push(`${column} = $${idx++}`);
      values.push(value);
    });
    values.push(id);

    const result = await dbQuery(
      `
      UPDATE question_folders
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING id, name, description, created_at, updated_at
      `,
      values
    );

    res.json(normalizeFolder(result.rows[0]));
  } catch (err) {
    handleServiceError(res, err, 'Failed to update folder');
  }
};
