// src/controllers/teacherContentController.js
import pool from '../config/db.js';

// Helper: Check if user is a teacher of the course
const isTeacherOfCourse = async (userId, courseId) => {
  const res = await pool.query(
    `SELECT 1 FROM enrollments 
     WHERE user_id = $1 AND course_id = $2 AND role = 'teacher'`,
    [userId, courseId]
  );
  return res.rows.length > 0;
};

// GET /teacher/courses/:id/content
export const getTeacherCourseContent = async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const userId = req.user.id; // set by auth middleware

  if (isNaN(courseId)) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  try {
    const isTeacher = await isTeacherOfCourse(userId, courseId);
    if (!isTeacher) {
      return res.status(403).json({ error: 'Not authorized to manage this course' });
    }

    const result = await pool.query(
      `SELECT 
         id, 
         parent_id, 
         item_type, 
         title, 
         content_url, 
         order_index
       FROM content_items
       WHERE course_id = $1
       ORDER BY COALESCE(order_index, 0), id`,
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getTeacherCourseContent:', err);
    res.status(500).json({ error: 'Failed to load course content' });
  }
};

// POST /teacher/courses/:id/content
export const addCourseContentItem = async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const { parent_id, item_type, title, content_url } = req.body;
  const userId = req.user.id;

  const VALID_TYPES = ['folder', 'video', 'text', 'pdf', 'scorm'];

  if (isNaN(courseId)) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (!VALID_TYPES.includes(item_type)) {
    return res.status(400).json({
      error: `Invalid item_type. Must be one of: ${VALID_TYPES.join(', ')}`
    });
  }

  try {
    const isTeacher = await isTeacherOfCourse(userId, courseId);
    if (!isTeacher) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `INSERT INTO content_items (course_id, parent_id, item_type, title, content_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, parent_id, item_type, title, content_url, order_index`,
      [courseId, parent_id || null, item_type, title.trim(), content_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error in addCourseContentItem:', err);
    res.status(500).json({ error: 'Failed to add content item' });
  }
};

// PATCH /teacher/courses/:id/publish
export const updateCoursePublishStatus = async (req, res) => {
  const { id } = req.params;
  const { published } = req.body;

  // Optional: Validate boolean
  if (typeof published !== 'boolean') {
    return res.status(400).json({ error: 'Invalid published value' });
  }

  try {
    // Optional: Ensure only course owner or admin can publish
    const userId = req.user.id;
    const courseCheck = await pool.query(
      'SELECT created_by FROM courses WHERE id = $1',
      [id]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const createdBy = courseCheck.rows[0].created_by;
    if (req.user.role !== 'super_admin' && createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update published status
    const result = await pool.query(
      'UPDATE courses SET published = $1 WHERE id = $2 RETURNING *',
      [published, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update course' });
  }
};