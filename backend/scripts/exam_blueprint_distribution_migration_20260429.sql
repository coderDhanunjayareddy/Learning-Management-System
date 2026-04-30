-- Adds per-group blueprint distribution counts and mirrors them into exam sections.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE blueprint_sections
  ADD COLUMN IF NOT EXISTS direction_question_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS similar_question_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_year_question_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_question_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE exam_sections
  ADD COLUMN IF NOT EXISTS direction_question_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS similar_question_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_year_question_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_question_count INTEGER NOT NULL DEFAULT 0;

UPDATE blueprint_sections
SET direction_question_count = required_question_count
WHERE direction_question_count = 0
  AND similar_question_count = 0
  AND previous_year_question_count = 0
  AND reference_question_count = 0;

UPDATE exam_sections
SET direction_question_count = required_question_count
WHERE required_question_count IS NOT NULL
  AND direction_question_count = 0
  AND similar_question_count = 0
  AND previous_year_question_count = 0
  AND reference_question_count = 0;

ALTER TABLE blueprint_sections DROP CONSTRAINT IF EXISTS blueprint_sections_distribution_check;
ALTER TABLE blueprint_sections
  ADD CONSTRAINT blueprint_sections_distribution_check CHECK (
    direction_question_count >= 0
    AND similar_question_count >= 0
    AND previous_year_question_count >= 0
    AND reference_question_count >= 0
    AND direction_question_count + similar_question_count + previous_year_question_count + reference_question_count = required_question_count
  );

ALTER TABLE exam_sections DROP CONSTRAINT IF EXISTS exam_sections_distribution_check;
ALTER TABLE exam_sections
  ADD CONSTRAINT exam_sections_distribution_check CHECK (
    direction_question_count >= 0
    AND similar_question_count >= 0
    AND previous_year_question_count >= 0
    AND reference_question_count >= 0
    AND (
      required_question_count IS NULL
      OR direction_question_count + similar_question_count + previous_year_question_count + reference_question_count = required_question_count
    )
  );

COMMIT;
