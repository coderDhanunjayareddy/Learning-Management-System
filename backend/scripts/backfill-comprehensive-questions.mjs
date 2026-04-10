import pool from '../config/db.js';

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const normalizeRichText = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return { html: value };
  if (isObject(value) && 'html' in value) return value;
  return { html: String(value) };
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const legacyResult = await client.query(
      `
      SELECT q.*, s.grade_id, g.program_id
      FROM questions q
      LEFT JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN grades g ON g.id = s.grade_id
      WHERE q.question_type = 'comprehensive'
        AND q.status <> 'archived'
      ORDER BY q.id ASC
      `
    );

    let migratedParents = 0;
    let createdChildren = 0;

    for (const parent of legacyResult.rows) {
      const passageTitle = normalizeRichText(parent.question_text) ?? { html: `Passage ${parent.id}` };
      const passageContent = normalizeRichText(parent.comprehension_passage);
      const subQuestions = Array.isArray(parent.comprehension_questions) ? parent.comprehension_questions : [];

      if (!passageContent || subQuestions.length === 0) {
        console.warn(`Skipping question ${parent.id}: missing passage or sub-questions`);
        continue;
      }

      const passageResult = await client.query(
        `
        INSERT INTO comprehension_passages (
          client_id,
          school_id,
          title,
          passage_content,
          program_id,
          grade_id,
          subject_id,
          chapter_id,
          topic_id,
          legacy_question_id,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12, NOW()), NOW())
        ON CONFLICT (legacy_question_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          passage_content = EXCLUDED.passage_content,
          program_id = EXCLUDED.program_id,
          grade_id = EXCLUDED.grade_id,
          subject_id = EXCLUDED.subject_id,
          chapter_id = EXCLUDED.chapter_id,
          topic_id = EXCLUDED.topic_id,
          updated_at = NOW()
        RETURNING id
        `,
        [
          parent.client_id,
          parent.school_id,
          JSON.stringify(passageTitle),
          JSON.stringify(passageContent),
          parent.program_id,
          parent.grade_id,
          parent.subject_id,
          parent.chapter_id,
          parent.topic_id,
          parent.id,
          parent.created_by,
          parent.created_at,
        ]
      );

      const passageId = Number(passageResult.rows[0].id);

      for (let index = 0; index < subQuestions.length; index += 1) {
        const sub = subQuestions[index];
        if (!isObject(sub) || !sub.question_type || !sub.question_text) {
          console.warn(`Skipping malformed sub-question ${index + 1} for parent ${parent.id}`);
          continue;
        }

        await client.query(
          `
          INSERT INTO questions (
            client_id,
            school_id,
            question_type,
            question_text,
            options,
            correct_answer,
            solution,
            solution_video_url,
            scoring_mode,
            subject_id,
            chapter_id,
            topic_id,
            comprehension_passage_id,
            difficulty_level,
            exam_tags,
            marks_positive,
            marks_negative,
            status,
            created_by,
            approved_by,
            approved_at,
            rejection_reason,
            created_at,
            updated_at
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,COALESCE($23, NOW()), NOW()
          )
          `,
          [
            parent.client_id,
            parent.school_id,
            sub.question_type,
            JSON.stringify(normalizeRichText(sub.question_text)),
            sub.options ? JSON.stringify(sub.options) : null,
            JSON.stringify(sub.correct_answer ?? {}),
            sub.solution ? JSON.stringify(normalizeRichText(sub.solution)) : parent.solution ? JSON.stringify(parent.solution) : null,
            sub.solution_video_url ?? parent.solution_video_url ?? null,
            parent.scoring_mode ?? 'all_or_nothing',
            parent.subject_id,
            parent.chapter_id,
            parent.topic_id,
            passageId,
            parent.difficulty_level ?? 'medium',
            parent.exam_tags ?? [],
            sub.marks_positive ?? parent.marks_positive ?? 4,
            sub.marks_negative ?? parent.marks_negative ?? 0,
            parent.status ?? 'draft',
            parent.created_by,
            parent.approved_by,
            parent.approved_at,
            parent.rejection_reason,
            parent.created_at,
          ]
        );
        createdChildren += 1;
      }

      await client.query(
        `
        UPDATE questions
        SET status = 'archived',
            updated_at = NOW()
        WHERE id = $1
        `,
        [parent.id]
      );

      migratedParents += 1;
    }

    await client.query('COMMIT');
    console.log(`Migrated ${migratedParents} legacy comprehensive questions into ${createdChildren} linked child questions.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
