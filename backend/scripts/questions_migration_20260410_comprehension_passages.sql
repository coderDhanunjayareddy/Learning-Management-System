BEGIN;

CREATE TABLE IF NOT EXISTS comprehension_passages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  title JSONB NOT NULL,
  passage_content JSONB NOT NULL,
  program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  legacy_question_id INTEGER UNIQUE REFERENCES questions(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comprehension_passages_client ON comprehension_passages(client_id);
CREATE INDEX IF NOT EXISTS idx_comprehension_passages_school ON comprehension_passages(school_id);
CREATE INDEX IF NOT EXISTS idx_comprehension_passages_subject ON comprehension_passages(subject_id);
CREATE INDEX IF NOT EXISTS idx_comprehension_passages_chapter ON comprehension_passages(chapter_id);

CREATE TRIGGER trg_comprehension_passages_updated
BEFORE UPDATE ON comprehension_passages
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS comprehension_passage_id INTEGER REFERENCES comprehension_passages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_comprehension_passage_id
  ON questions(comprehension_passage_id);

COMMIT;
