import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const getArgValue = (name) => {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) return null;
  return arg.split('=').slice(1).join('=');
};

const parseClientId = (value) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error('client_id must be an integer');
  }
  return parsed;
};

const resolveFilePath = () => {
  const fileArg = getArgValue('--file');
  if (fileArg) {
    return path.isAbsolute(fileArg)
      ? fileArg
      : path.join(process.cwd(), fileArg);
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..', 'seed', 'curriculum.seed.json');
};

const upsertSubject = async (client, subject, clientId) => {
  const { code, name, description, display_order } = subject;
  const existing = await client.query(
    `SELECT id FROM subjects WHERE client_id = $1 AND code = $2`,
    [clientId, code]
  );

  if (existing.rows.length > 0) {
    const subjectId = existing.rows[0].id;
    await client.query(
      `
      UPDATE subjects
      SET name = $1, description = $2, display_order = $3, is_active = TRUE
      WHERE id = $4
      `,
      [name, description ?? null, display_order ?? 0, subjectId]
    );
    return subjectId;
  }

  const insert = await client.query(
    `
    INSERT INTO subjects (client_id, name, code, description, display_order, is_active)
    VALUES ($1, $2, $3, $4, $5, TRUE)
    RETURNING id
    `,
    [clientId, name, code, description ?? null, display_order ?? 0]
  );
  return insert.rows[0].id;
};

const upsertChapter = async (client, subjectId, chapter) => {
  const { chapter_number, name, description } = chapter;
  await client.query(
    `
    INSERT INTO chapters (subject_id, chapter_number, name, description, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    ON CONFLICT (subject_id, chapter_number)
    DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE
    `,
    [subjectId, chapter_number, name, description ?? null]
  );
};

const main = async () => {
  const clientId = parseClientId(getArgValue('--client_id'));
  if (!clientId) {
    throw new Error('client_id is required (e.g. --client_id=1)');
  }

  const filePath = resolveFilePath();
  const raw = await fs.readFile(filePath, 'utf-8');
  const seed = JSON.parse(raw);

  const subjects = Array.isArray(seed.subjects) ? seed.subjects : [];
  if (subjects.length === 0) {
    throw new Error('No subjects found in seed file');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let subjectCount = 0;
    let chapterCount = 0;

    for (const subject of subjects) {
      if (!subject.code || !subject.name) continue;
      const subjectId = await upsertSubject(client, subject, clientId);
      subjectCount += 1;

      const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];
      for (const chapter of chapters) {
        if (!chapter.chapter_number || !chapter.name) continue;
        await upsertChapter(client, subjectId, chapter);
        chapterCount += 1;
      }
    }

    await client.query('COMMIT');
    console.log(`Seeded subjects: ${subjectCount}`);
    console.log(`Seeded chapters: ${chapterCount}`);
    console.log(`client_id = ${clientId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
