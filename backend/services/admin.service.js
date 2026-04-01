import { query as dbQuery, getClient } from '../repositories/db.repository.js';
import { getMergedCourseContentRows } from './clientContent.service.js';
// In your backend (e.g., routes/admin/courses.js or .ts)

let contentItemExamSchemaEnsured = false;
let courseExamsSchemaEnsured = false;
let contentMetadataColumnExists;

const hasContentMetadataColumn = async () => {
  if (contentMetadataColumnExists !== undefined) {
    return contentMetadataColumnExists;
  }

  const result = await dbQuery(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'content_items'
          AND column_name = 'metadata'
      ) AS exists
    `
  );

  contentMetadataColumnExists = Boolean(result.rows[0]?.exists);
  return contentMetadataColumnExists;
};

const ensureContentItemExamSchema = async () => {
  if (contentItemExamSchemaEnsured) return;

  await dbQuery(`
    ALTER TABLE content_items
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB
  `);

  await dbQuery(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'content_items'
          AND c.contype = 'c'
          AND c.conname = 'content_items_item_type_check'
          AND pg_get_constraintdef(c.oid) NOT ILIKE '%exam%'
      ) THEN
        ALTER TABLE content_items DROP CONSTRAINT content_items_item_type_check;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'content_items'
          AND c.contype = 'c'
          AND c.conname = 'content_items_item_type_check'
      ) THEN
        ALTER TABLE content_items
        ADD CONSTRAINT content_items_item_type_check
        CHECK (
          item_type = ANY (
            ARRAY['folder', 'video', 'text', 'pdf', 'scorm', 'audio', 'html', 'link', 'exam']::text[]
          )
        );
      END IF;
    END $$;
  `);

  contentItemExamSchemaEnsured = true;
};

const ensureCourseExamsTable = async () => {
  if (courseExamsSchemaEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS course_exams (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(course_id, exam_id)
    )
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id)`);

  courseExamsSchemaEnsured = true;
};

export const getAllCourses = async (req, res) => {
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';
  const adminRoles = ['super_admin', 'client_admin', 'school_owner', 'content_authorizer'];
  const isAdminRole = adminRoles.includes(role);

  try {
    const conditions = [];
    const params = [];

    if (shouldScope) {
      conditions.push(`client_id = $${params.length + 1}`);
      params.push(clientId);
    }

    if (!isAdminRole) {
      conditions.push('published = true');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT id, title, description, published, created_at
      FROM courses
      ${whereClause}
      ORDER BY created_at DESC
    `;
    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const createCourse = async (req, res) => {
  const { title, description, published = false } = req.body;
  const createdBy = req.user?.id; // assuming auth middleware attaches user
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';
  const courseClientId = shouldScope ? clientId : null;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await dbQuery(
      `
        INSERT INTO courses (title, description, published, created_by, client_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title, description, published, created_at, client_id
      `,
      [title.trim(), description?.trim() || null, published, createdBy, courseClientId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Course creation error:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// GET /admin/courses/:courseId/content
export const getCourseContent = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user?.id; // assuming you have user info from auth middleware
  const role = req.user?.role; // e.g., 'student', 'admin', 'instructor'
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';
  const shouldIncludeAttemptStatus = role === 'student' && Boolean(userId);

  try {
    if (shouldScope) {
      const courseCheck = await dbQuery(
        `SELECT 1 FROM courses WHERE id = $1 AND client_id = $2`,
        [courseId, clientId]
      );
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const rows = await getMergedCourseContentRows({
      courseId: Number(courseId),
      includeAttemptStatus: shouldIncludeAttemptStatus,
      userId,
    });

    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch content:', err);
    res.status(500).json({ error: 'Failed to fetch course content' });
  }
};


// POST /admin/courses/:courseId/content
export const createContentItem = async (req, res) => {
  const { courseId } = req.params;
  const { item_type, title, parent_id = null, content_url = null } = req.body;
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';
  const parsedParentId =
    parent_id === null || parent_id === undefined || parent_id === ''
      ? null
      : Number(parent_id);

  const validTypes = ['folder', 'link', 'exam'];

  if (!validTypes.includes(item_type)) {
    return res.status(400).json({
      error: `Invalid item type for this endpoint: ${item_type}`
    });
  }

  if (item_type === 'link') {
    if (!content_url || typeof content_url !== 'string') {
      return res.status(400).json({
        error: 'content_url is required for link type'
      });
    }
  }

  if (item_type === 'folder' && content_url !== null) {
    return res.status(400).json({
      error: 'Folders cannot have content_url'
    });
  }

  if (parsedParentId !== null && (!Number.isInteger(parsedParentId) || parsedParentId <= 0)) {
    return res.status(400).json({ error: 'parent_id must be a valid content item id or null' });
  }

  try {
    if (shouldScope) {
      const courseCheck = await dbQuery(
        `SELECT 1 FROM courses WHERE id = $1 AND client_id = $2`,
        [courseId, clientId]
      );
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const courseScopeResult = await dbQuery(
      `SELECT id, client_id FROM courses WHERE id = $1`,
      [courseId]
    );
    if (courseScopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (parsedParentId !== null) {
      const parentResult = await dbQuery(
        `
          SELECT id, item_type
          FROM content_items
          WHERE id = $1 AND course_id = $2
        `,
        [parsedParentId, courseId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Parent content item not found' });
      }

      if (parentResult.rows[0].item_type !== 'folder') {
        return res.status(400).json({ error: 'Items can only be added inside folders' });
      }
    }

    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    let finalTitle = normalizedTitle;
    let finalContentUrl = content_url;
    let metadata = {};

    if (item_type === 'exam') {
      const examIdRaw = req.body?.exam_id ?? req.body?.examId ?? req.body?.metadata?.exam_id;
      const examId = Number(examIdRaw);
      if (!Number.isInteger(examId) || examId <= 0) {
        return res.status(400).json({ error: 'exam_id is required for exam content type' });
      }

      const examResult = await dbQuery(
        `SELECT id, title, client_id FROM exams WHERE id = $1`,
        [examId]
      );
      if (examResult.rows.length === 0) {
        return res.status(404).json({ error: 'Exam not found' });
      }

      const exam = examResult.rows[0];
      const course = courseScopeResult.rows[0];
      if (exam.client_id && course.client_id && Number(exam.client_id) !== Number(course.client_id)) {
        return res.status(403).json({ error: 'Exam does not belong to this course client scope' });
      }

      finalTitle = normalizedTitle || String(exam.title || 'Exam');
      finalContentUrl = null;
      metadata = { exam_id: examId };

      await ensureCourseExamsTable();
      await dbQuery(
        `
          INSERT INTO course_exams (course_id, exam_id, assigned_by)
          VALUES ($1, $2, $3)
          ON CONFLICT (course_id, exam_id)
          DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
        `,
        [courseId, examId, req.user?.id ?? null]
      );
    } else {
      if (!normalizedTitle) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (item_type === 'folder') {
        finalContentUrl = null;
      } else if (item_type === 'link') {
        finalContentUrl = typeof content_url === 'string' ? content_url.trim() : null;
      }
    }

    const metadataColumnExists = await hasContentMetadataColumn();
    const supportsExamMetadata = item_type !== 'exam' || metadataColumnExists;

    if (!supportsExamMetadata) {
      return res.status(500).json({
        error: 'Exam content requires the content_items.metadata column to be available'
      });
    }

    const insertQuery = metadataColumnExists
      ? `INSERT INTO content_items (course_id, parent_id, item_type, title, content_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`
      : `INSERT INTO content_items (course_id, parent_id, item_type, title, content_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *, '{}'::jsonb AS metadata`;
    const insertParams = metadataColumnExists
      ? [courseId, parsedParentId, item_type, finalTitle, finalContentUrl, JSON.stringify(metadata)]
      : [courseId, parsedParentId, item_type, finalTitle, finalContentUrl];

    const result = await dbQuery(insertQuery, insertParams);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Content creation error:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      where: err.where,
      table: err.table,
      column: err.column,
      constraint: err.constraint,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to create content item' });
  }
};
// PATCH /api/courses/:id/publish
export const publishCourse = async (req, res) => {
  const { id } = req.params;
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';
  try {
    const query = `
      UPDATE courses
      SET published = true
      WHERE id = $1
      ${shouldScope ? 'AND client_id = $2' : ''}
      RETURNING *
    `;
    const params = shouldScope ? [id, clientId] : [id];
    const result = await dbQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ success: true, course: result.rows[0] });
  } catch (err) {
    console.error('Failed to publish course:', err);
    res.status(500).json({ error: 'Failed to publish course' });
  }
};

// DELETE /admin/courses/:id
export const deleteCourse = async (req, res) => {
  const { id } = req.params;
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';

  try {
    const query = `
      DELETE FROM courses
      WHERE id = $1
      ${shouldScope ? 'AND client_id = $2' : ''}
      RETURNING id
    `;
    const params = shouldScope ? [id, clientId] : [id];
    const result = await dbQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Course and all associated content deleted successfully',
      deletedCourseId: result.rows[0].id
    });
  } catch (err) {
    console.error('Failed to delete course:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// PATCH /admin/courses/:id
export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, published } = req.body;
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';

  // Basic validation
  if (title !== undefined) {
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
  }

  try {
    const query = `
        UPDATE courses
        SET 
          title = COALESCE($1, title),
          description = $2,
          published = COALESCE($3, published),
          updated_at = NOW()
        WHERE id = $4
        ${shouldScope ? 'AND client_id = $5' : ''}
        RETURNING id, title, description, published, created_at, updated_at
      `;
    const params = [
      title?.trim() || null,
      description?.trim() || null,
      published, // pass undefined to skip, or boolean to update
      id
    ];
    if (shouldScope) {
      params.push(clientId);
    }
    const result = await dbQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
};



