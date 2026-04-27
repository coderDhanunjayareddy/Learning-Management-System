-- Adds reusable exam blueprints plus section-level syllabus selection support.
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS blueprints (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'archived')
  ),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blueprints_name
  ON blueprints (client_id, COALESCE(school_id, 0), LOWER(name));
CREATE INDEX IF NOT EXISTS idx_blueprints_client ON blueprints(client_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_school ON blueprints(school_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_status ON blueprints(status);
CREATE INDEX IF NOT EXISTS idx_blueprints_created_by ON blueprints(created_by);

CREATE TABLE IF NOT EXISTS blueprint_sections (
  id SERIAL PRIMARY KEY,
  blueprint_id INTEGER NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  section_name VARCHAR(150) NOT NULL,
  required_question_count INTEGER NOT NULL CHECK (required_question_count > 0),
  display_order INTEGER NOT NULL DEFAULT 1 CHECK (display_order > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blueprint_sections_name
  ON blueprint_sections (blueprint_id, LOWER(section_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_blueprint_sections_order
  ON blueprint_sections (blueprint_id, display_order);
CREATE INDEX IF NOT EXISTS idx_blueprint_sections_blueprint
  ON blueprint_sections(blueprint_id);

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS program_id INTEGER REFERENCES programs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS blueprint_id INTEGER REFERENCES blueprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exams_program ON exams(program_id);
CREATE INDEX IF NOT EXISTS idx_exams_blueprint ON exams(blueprint_id);

ALTER TABLE exam_sections
  ADD COLUMN IF NOT EXISTS blueprint_section_id INTEGER REFERENCES blueprint_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS required_question_count INTEGER,
  ADD COLUMN IF NOT EXISTS selected_subject_id INTEGER REFERENCES subjects(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS syllabus_locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE exam_sections DROP CONSTRAINT IF EXISTS exam_sections_completion_status_check;
ALTER TABLE exam_sections
  ADD CONSTRAINT exam_sections_completion_status_check CHECK (
    completion_status IN ('pending', 'configured', 'generated', 'completed')
  );

ALTER TABLE exam_sections DROP CONSTRAINT IF EXISTS exam_sections_required_question_count_check;
ALTER TABLE exam_sections
  ADD CONSTRAINT exam_sections_required_question_count_check CHECK (
    required_question_count IS NULL OR required_question_count > 0
  );

CREATE INDEX IF NOT EXISTS idx_exam_sections_blueprint_section
  ON exam_sections(blueprint_section_id);
CREATE INDEX IF NOT EXISTS idx_exam_sections_subject
  ON exam_sections(selected_subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_sections_status
  ON exam_sections(completion_status);

CREATE TABLE IF NOT EXISTS exam_section_chapters (
  id SERIAL PRIMARY KEY,
  exam_section_id INTEGER NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exam_section_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_section_chapters_section
  ON exam_section_chapters(exam_section_id);
CREATE INDEX IF NOT EXISTS idx_exam_section_chapters_chapter
  ON exam_section_chapters(chapter_id);

CREATE TABLE IF NOT EXISTS exam_section_topics (
  id SERIAL PRIMARY KEY,
  exam_section_id INTEGER NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exam_section_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_section_topics_section
  ON exam_section_topics(exam_section_id);
CREATE INDEX IF NOT EXISTS idx_exam_section_topics_topic
  ON exam_section_topics(topic_id);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_group_type VARCHAR(30);

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_group_type_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_question_group_type_check CHECK (
    question_group_type IS NULL
    OR question_group_type IN ('direction', 'similar', 'previous_year', 'reference')
  );

CREATE INDEX IF NOT EXISTS idx_questions_topic_status_group
  ON questions(topic_id, status, question_group_type);
CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter_topic_status
  ON questions(subject_id, chapter_id, topic_id, status);

ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS question_group_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS generated_from_topic_selection BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE exam_questions DROP CONSTRAINT IF EXISTS exam_questions_question_group_type_check;
ALTER TABLE exam_questions
  ADD CONSTRAINT exam_questions_question_group_type_check CHECK (
    question_group_type IS NULL
    OR question_group_type IN ('direction', 'similar', 'previous_year', 'reference')
  );

CREATE INDEX IF NOT EXISTS idx_exam_questions_group_type
  ON exam_questions(question_group_type);
CREATE INDEX IF NOT EXISTS idx_exam_questions_section_group
  ON exam_questions(section_id, question_group_type);

-- Backfill section counts/status for existing exams without breaking old data.
UPDATE exam_sections es
SET required_question_count = q.question_count
FROM (
  SELECT section_id, COUNT(*)::INTEGER AS question_count
  FROM exam_questions
  GROUP BY section_id
) q
WHERE es.id = q.section_id
  AND es.required_question_count IS NULL;

UPDATE exam_sections
SET completion_status = 'completed'
WHERE completion_status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM exam_questions eq
    WHERE eq.section_id = exam_sections.id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_blueprints_updated'
  ) THEN
    CREATE TRIGGER trg_blueprints_updated
    BEFORE UPDATE ON blueprints
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_blueprint_sections_updated'
  ) THEN
    CREATE TRIGGER trg_blueprint_sections_updated
    BEFORE UPDATE ON blueprint_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  END IF;
END $$;

COMMIT;
