import pool from '../config/db.js';
// In your backend (e.g., routes/admin/courses.js or .ts)

export const getAllCourses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, published, created_at
      FROM courses
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const createCourse = async (req, res) => {
  const { title, description, published = false } = req.body;
  const createdBy = req.user?.id; // assuming auth middleware attaches user

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO courses (title, description, published, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, description, published, created_at
      `,
      [title.trim(), description?.trim() || null, published, createdBy]
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

  try {
    let query;
    let params;

    if (/*role === 'student' &&*/ userId) {
      // Student request: fetch content + student's attempt status
      query = `
        SELECT ci.id,
               ci.course_id,
               ci.parent_id,
               ci.item_type,
               ci.title,
               ci.content_url,
               ci.order_index,
               ci.created_at,
               sa.completion_status
        FROM content_items ci
        LEFT JOIN student_attempts sa
               ON ci.id = sa.content_item_id
              AND sa.user_id = $2
        WHERE ci.course_id = $1
        ORDER BY ci.parent_id NULLS FIRST, ci.order_index ASC, ci.created_at ASC
      `;
      params = [courseId, userId];
    } else {
      // Non-student request: fetch only content items
      query = `
        SELECT id, course_id, parent_id, item_type, title, content_url, order_index, created_at
        FROM content_items
        WHERE course_id = $1
        ORDER BY parent_id NULLS FIRST, order_index ASC, created_at ASC
      `;
      params = [courseId];
    }

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch content:', err);
    res.status(500).json({ error: 'Failed to fetch course content' });
  }
};


// POST /admin/courses/:courseId/content
export const createContentItem = async (req, res) => {
  const { courseId } = req.params;
  const { item_type, title, parent_id = null, content_url = null } = req.body;

  // ✅ Only NON-FILE types are allowed here
  const validTypes = ['folder', 'link'];

  if (!validTypes.includes(item_type)) {
    return res.status(400).json({
      error: `Invalid item type for this endpoint: ${item_type}`
    });
  }

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // ✅ Link MUST have a URL
  if (item_type === 'link') {
    if (!content_url || typeof content_url !== 'string') {
      return res.status(400).json({
        error: 'content_url is required for link type'
      });
    }
  }

  // ✅ Folder MUST NOT have a URL
  if (item_type === 'folder' && content_url !== null) {
    return res.status(400).json({
      error: 'Folders cannot have content_url'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO content_items (course_id, parent_id, item_type, title, content_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [courseId, parent_id, item_type, title.trim(), content_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Content creation error:', err);
    res.status(500).json({ error: 'Failed to create content item' });
  }
};


// PATCH /api/courses/:id/publish
export const publishCourse = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE courses SET published = true WHERE id = $1 RETURNING *`,
      [id]
    );

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

  try {
    const result = await pool.query(
      'DELETE FROM courses WHERE id = $1 RETURNING id',
      [id]
    );

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

  // Basic validation
  if (title !== undefined) {
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
  }

  try {
    const result = await pool.query(
      `
        UPDATE courses
        SET 
          title = COALESCE($1, title),
          description = $2,
          published = COALESCE($3, published),
          updated_at = NOW()
        WHERE id = $4
        RETURNING id, title, description, published, created_at, updated_at
      `,
      [
        title?.trim() || null,
        description?.trim() || null,
        published, // pass undefined to skip, or boolean to update
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
};