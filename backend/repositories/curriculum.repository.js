// backend/repositories/curriculum.repository.js
import { query as dbQuery } from './db.repository.js';

export const fetchSubjects = async (clientId) => {
  const params = [];
  let query = `SELECT * FROM subjects`;
  if (clientId) {
    query += ` WHERE client_id = $1`;
    params.push(clientId);
  }
  query += ` ORDER BY display_order, name`;
  return dbQuery(query, params);
};

export const fetchSubjectById = async (id, clientId) => {
  const params = [id];
  let query = `SELECT * FROM subjects WHERE id = $1`;
  if (clientId) {
    query += ` AND client_id = $2`;
    params.push(clientId);
  }
  return dbQuery(query, params);
};

export const insertSubject = async ({ clientId, name, code, description, display_order, is_active }) => {
  return dbQuery(
    `
    INSERT INTO subjects (client_id, name, code, description, display_order, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [clientId, name, code, description, display_order, is_active]
  );
};

export const updateSubject = async ({ id, clientId, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  let query = `UPDATE subjects SET ${setClauses.join(', ')} WHERE id = $${idx++}`;
  if (clientId) {
    query += ` AND client_id = $${idx++}`;
    values.push(clientId);
  }
  query += ` RETURNING *`;
  return dbQuery(query, values);
};

export const deleteSubject = async ({ id, clientId }) => {
  const params = [id];
  let query = `DELETE FROM subjects WHERE id = $1`;
  if (clientId) {
    query += ` AND client_id = $2`;
    params.push(clientId);
  }
  query += ` RETURNING id`;
  return dbQuery(query, params);
};

export const fetchSubjectContext = async (subjectId) => {
  return dbQuery(`SELECT id, client_id FROM subjects WHERE id = $1`, [subjectId]);
};

export const fetchChaptersBySubject = async ({ subjectId, clientId }) => {
  const params = [subjectId];
  let query = `
    SELECT c.*
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    WHERE s.id = $1
  `;
  if (clientId) {
    query += ` AND s.client_id = $2`;
    params.push(clientId);
  }
  query += ` ORDER BY c.chapter_number`;
  return dbQuery(query, params);
};

export const fetchChapterById = async ({ id, clientId }) => {
  const params = [id];
  let query = `
    SELECT c.*
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    WHERE c.id = $1
  `;
  if (clientId) {
    query += ` AND s.client_id = $2`;
    params.push(clientId);
  }
  return dbQuery(query, params);
};

export const insertChapter = async ({ subjectId, name, chapter_number, description, is_active }) => {
  return dbQuery(
    `
    INSERT INTO chapters (subject_id, name, chapter_number, description, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [subjectId, name, chapter_number, description, is_active]
  );
};

export const updateChapter = async ({ id, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  const query = `UPDATE chapters SET ${setClauses.join(', ')} WHERE id = $${idx++} RETURNING *`;
  return dbQuery(query, values);
};

export const deleteChapter = async (id) => {
  return dbQuery(`DELETE FROM chapters WHERE id = $1 RETURNING id`, [id]);
};

export const fetchChapterContext = async (chapterId) => {
  return dbQuery(
    `
    SELECT c.id, s.client_id
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    WHERE c.id = $1
    `,
    [chapterId]
  );
};

export const fetchTopicsByChapter = async ({ chapterId, clientId }) => {
  const params = [chapterId];
  let query = `
    SELECT t.*
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE c.id = $1
  `;
  if (clientId) {
    query += ` AND s.client_id = $2`;
    params.push(clientId);
  }
  query += ` ORDER BY t.topic_number`;
  return dbQuery(query, params);
};

export const fetchTopicById = async ({ id, clientId }) => {
  const params = [id];
  let query = `
    SELECT t.*
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE t.id = $1
  `;
  if (clientId) {
    query += ` AND s.client_id = $2`;
    params.push(clientId);
  }
  return dbQuery(query, params);
};

export const insertTopic = async ({ chapterId, name, topic_number, is_active }) => {
  return dbQuery(
    `
    INSERT INTO topics (chapter_id, name, topic_number, is_active)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [chapterId, name, topic_number, is_active]
  );
};

export const updateTopic = async ({ id, updates }) => {
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([column, value]) => {
    setClauses.push(`${column} = $${idx++}`);
    values.push(value);
  });

  values.push(id);
  const query = `UPDATE topics SET ${setClauses.join(', ')} WHERE id = $${idx++} RETURNING *`;
  return dbQuery(query, values);
};

export const deleteTopic = async (id) => {
  return dbQuery(`DELETE FROM topics WHERE id = $1 RETURNING id`, [id]);
};

export const fetchTopicContext = async (topicId) => {
  return dbQuery(
    `
    SELECT t.id, s.client_id
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE t.id = $1
    `,
    [topicId]
  );
};
