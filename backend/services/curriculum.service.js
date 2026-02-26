// backend/services/curriculum.service.js
import { AppError } from '../utils/errors.js';
import {
  parseNullableInt,
  parseRequiredInt,
  parseBoolean,
  requireString,
} from '../schemas/curriculum.schema.js';
import * as curriculumRepo from '../repositories/curriculum.repository.js';

const resolveClientId = (user, sourceClientId) => {
  if (user?.role === 'super_admin') {
    return parseNullableInt(sourceClientId, 'client_id');
  }
  const clientId = user?.client_id ?? null;
  if (!clientId) {
    throw new AppError('client_id is required', 400);
  }
  return clientId;
};

const ensureClientAccess = (ownerClientId, requester) => {
  if (requester?.role === 'super_admin') return;
  if (!requester?.client_id || requester.client_id !== ownerClientId) {
    throw new AppError('Access denied', 403);
  }
};

export const listSubjects = async ({ user, query }) => {
  const clientId = resolveClientId(user, query?.client_id);
  const result = await curriculumRepo.fetchSubjects(clientId || null);
  return result.rows;
};

export const getSubject = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const result = await curriculumRepo.fetchSubjectById(id, clientId || null);
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return result.rows[0];
};

export const createSubject = async ({ user, body }) => {
  const name = requireString(body?.name, 'name');
  const code = requireString(body?.code, 'code');
  const clientId = resolveClientId(user, body?.client_id);
  const displayOrder = body?.display_order ?? 0;
  const isActive = parseBoolean(body?.is_active, 'is_active');

  const result = await curriculumRepo.insertSubject({
    clientId,
    name,
    code,
    description: body?.description ?? null,
    display_order: displayOrder,
    is_active: isActive ?? true,
  });

  return result.rows[0];
};

export const updateSubject = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.code !== undefined) updates.code = requireString(body?.code, 'code');
  if (body?.description !== undefined) updates.description = body?.description ?? null;
  if (body?.display_order !== undefined) {
    updates.display_order = parseRequiredInt(body?.display_order, 'display_order');
  }
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  if (!clientId && user?.role !== 'super_admin') {
    throw new AppError('client_id is required', 400);
  }

  const result = await curriculumRepo.updateSubject({ id, clientId, updates });
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return result.rows[0];
};

export const deleteSubject = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  if (!clientId && user?.role !== 'super_admin') {
    throw new AppError('client_id is required', 400);
  }
  const result = await curriculumRepo.deleteSubject({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listChapters = async ({ user, params }) => {
  const subjectId = parseRequiredInt(params?.subjectId, 'subjectId');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const result = await curriculumRepo.fetchChaptersBySubject({ subjectId, clientId });
  return result.rows;
};

export const getChapter = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const result = await curriculumRepo.fetchChapterById({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  return result.rows[0];
};

export const createChapter = async ({ user, params, body }) => {
  const subjectId = parseRequiredInt(params?.subjectId, 'subjectId');
  const name = requireString(body?.name, 'name');
  const chapterNumber = parseRequiredInt(body?.chapter_number, 'chapter_number');
  const active = parseBoolean(body?.is_active, 'is_active');

  const subjectContext = await curriculumRepo.fetchSubjectContext(subjectId);
  if (subjectContext.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  ensureClientAccess(subjectContext.rows[0].client_id, user);

  const result = await curriculumRepo.insertChapter({
    subjectId,
    name,
    chapter_number: chapterNumber,
    description: body?.description ?? null,
    is_active: active ?? true,
  });
  return result.rows[0];
};

export const updateChapter = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.chapter_number !== undefined) {
    updates.chapter_number = parseRequiredInt(body?.chapter_number, 'chapter_number');
  }
  if (body?.description !== undefined) updates.description = body?.description ?? null;
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const chapterContext = await curriculumRepo.fetchChapterContext(id);
  if (chapterContext.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  ensureClientAccess(chapterContext.rows[0].client_id, user);

  const result = await curriculumRepo.updateChapter({ id, updates });
  return result.rows[0];
};

export const deleteChapter = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const chapterContext = await curriculumRepo.fetchChapterContext(id);
  if (chapterContext.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  ensureClientAccess(chapterContext.rows[0].client_id, user);

  const result = await curriculumRepo.deleteChapter(id);
  if (result.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listTopics = async ({ user, params }) => {
  const chapterId = parseRequiredInt(params?.chapterId, 'chapterId');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const result = await curriculumRepo.fetchTopicsByChapter({ chapterId, clientId });
  return result.rows;
};

export const getTopic = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const result = await curriculumRepo.fetchTopicById({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  return result.rows[0];
};

export const createTopic = async ({ user, params, body }) => {
  const chapterId = parseRequiredInt(params?.chapterId, 'chapterId');
  const name = requireString(body?.name, 'name');
  const topicNumber = parseRequiredInt(body?.topic_number, 'topic_number');
  const active = parseBoolean(body?.is_active, 'is_active');

  const chapterContext = await curriculumRepo.fetchChapterContext(chapterId);
  if (chapterContext.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  ensureClientAccess(chapterContext.rows[0].client_id, user);

  const result = await curriculumRepo.insertTopic({
    chapterId,
    name,
    topic_number: topicNumber,
    is_active: active ?? true,
  });
  return result.rows[0];
};

export const updateTopic = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.topic_number !== undefined) {
    updates.topic_number = parseRequiredInt(body?.topic_number, 'topic_number');
  }
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const topicContext = await curriculumRepo.fetchTopicContext(id);
  if (topicContext.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  ensureClientAccess(topicContext.rows[0].client_id, user);

  const result = await curriculumRepo.updateTopic({ id, updates });
  return result.rows[0];
};

export const deleteTopic = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const topicContext = await curriculumRepo.fetchTopicContext(id);
  if (topicContext.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  ensureClientAccess(topicContext.rows[0].client_id, user);

  const result = await curriculumRepo.deleteTopic(id);
  if (result.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};


