-- Safe, non-destructive migration for new question fields/types.
-- Run in your DB (psql/Supabase SQL editor). This only adds columns/constraints
-- and loosens subject/chapter NOT NULL to allow optional values.

BEGIN;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS scoring_mode VARCHAR(20) NOT NULL DEFAULT 'all_or_nothing',
  ADD COLUMN IF NOT EXISTS comprehension_passage JSONB,
  ADD COLUMN IF NOT EXISTS comprehension_questions JSONB;

-- Ensure new question_type values are allowed.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_question_type_check CHECK (
    question_type IN (
      'mcq_single',
      'mcq_multiple',
      'numerical',
      'true_false',
      'short_answer',
      'match_following',
      'fill_in_blank',
      'comprehensive'
    )
  );

-- Ensure scoring_mode constraint exists.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_scoring_mode_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_scoring_mode_check CHECK (
    scoring_mode IN ('all_or_nothing', 'partial', 'mixed')
  );

-- Make curriculum scope optional.
ALTER TABLE questions ALTER COLUMN subject_id DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN chapter_id DROP NOT NULL;

-- Backfill any existing rows with NULL scoring_mode.
UPDATE questions SET scoring_mode = 'all_or_nothing' WHERE scoring_mode IS NULL;

COMMIT;

-- Optional: if your legacy schema stores question_text/correct_answer as TEXT
-- and you want JSONB now, you can migrate separately like:
-- ALTER TABLE questions
--   ALTER COLUMN question_text TYPE JSONB USING to_jsonb(question_text),
--   ALTER COLUMN correct_answer TYPE JSONB USING to_jsonb(correct_answer);
