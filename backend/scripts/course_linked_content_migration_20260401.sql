CREATE TABLE IF NOT EXISTS course_linked_content (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  source_pack_id INTEGER REFERENCES content_packs(id) ON DELETE SET NULL,
  parent_content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  linked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (course_id, content_item_id)
);

CREATE INDEX IF NOT EXISTS idx_course_linked_content_course
  ON course_linked_content(course_id);

CREATE INDEX IF NOT EXISTS idx_course_linked_content_item
  ON course_linked_content(content_item_id);

CREATE INDEX IF NOT EXISTS idx_course_linked_content_parent_order
  ON course_linked_content(course_id, parent_content_id, order_index);
