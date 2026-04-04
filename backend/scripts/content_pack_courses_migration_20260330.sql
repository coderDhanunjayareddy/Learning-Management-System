BEGIN;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS content_pack_items_backup_20260330 (
  pack_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  backup_reason TEXT NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  has_content_id BOOLEAN;
  has_item_id BOOLEAN;
  item_reference_table TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_pack_items'
      AND column_name = 'content_id'
  ) INTO has_content_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_pack_items'
      AND column_name = 'item_id'
  ) INTO has_item_id;

  IF has_content_id AND NOT has_item_id THEN
    ALTER TABLE content_pack_items RENAME COLUMN content_id TO item_id;
    has_item_id := TRUE;
    has_content_id := FALSE;
  END IF;

  SELECT ccu.table_name
  INTO item_reference_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'content_pack_items'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'item_id'
  LIMIT 1;

  IF has_item_id AND item_reference_table = 'courses' THEN
    INSERT INTO content_pack_items_backup_20260330 (pack_id, item_id, backup_reason)
    SELECT pack_id, item_id, 'course-membership rows before item-based migration'
    FROM content_pack_items;

    TRUNCATE TABLE content_pack_items;
  END IF;
END $$;

ALTER TABLE content_pack_items
  DROP CONSTRAINT IF EXISTS content_pack_items_pkey,
  DROP CONSTRAINT IF EXISTS content_pack_items_content_id_fkey,
  DROP CONSTRAINT IF EXISTS content_pack_items_item_id_fkey;

DROP INDEX IF EXISTS idx_content_pack_items_content;
DROP INDEX IF EXISTS idx_content_pack_items_item;

ALTER TABLE content_pack_items
  ADD CONSTRAINT content_pack_items_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE;

ALTER TABLE content_pack_items
  ADD CONSTRAINT content_pack_items_pkey PRIMARY KEY (pack_id, item_id);

CREATE INDEX IF NOT EXISTS idx_content_pack_items_pack ON content_pack_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_content_pack_items_item ON content_pack_items(item_id);

COMMIT;
