-- Adds programs/grades hierarchy and links subjects to grades.
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(40) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_client_code
  ON programs (COALESCE(client_id, 0), LOWER(code));
CREATE INDEX IF NOT EXISTS idx_programs_client ON programs(client_id);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(is_active);

CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  grade_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (program_id, grade_number)
);

CREATE INDEX IF NOT EXISTS idx_grades_program ON grades(program_id);
CREATE INDEX IF NOT EXISTS idx_grades_active ON grades(is_active);

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_grade ON subjects(grade_id);

-- update_timestamp() already exists in the main schema; add triggers if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_programs_updated'
  ) THEN
    CREATE TRIGGER trg_programs_updated
    BEFORE UPDATE ON programs
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_grades_updated'
  ) THEN
    CREATE TRIGGER trg_grades_updated
    BEFORE UPDATE ON grades
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  END IF;
END $$;

COMMIT;
