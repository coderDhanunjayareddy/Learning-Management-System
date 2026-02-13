// backend/controllers/community.controller.js
import pool from '../config/db.js';

export const createCommunityContent = async (req, res) => {
  try {
    const { school_name, area, state, date, session, title, description, media } = req.body;
    const userId = req.user.id; // ✅ This is a number like 13

    if (!school_name || !title) {
      return res.status(400).json({ error: "School Name and Title are required." });
    }

    const safeMedia = Array.isArray(media) ? media : [];

    const result = await pool.query(
      `
        INSERT INTO community_content 
        (school_name, area, state, date, session, title, description, media, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING *
      `,
      [school_name, area, state, date, session, title, description, JSON.stringify(safeMedia), userId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to create content" });
  }
};

export const getCommunityContent = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        school_name AS school,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        title,
        description,
        media
      FROM community_content
      ORDER BY date DESC
    `);

    // Transform media (JSONB array) into desired format
    const formattedData = result.rows.map(row => {
      const mediaArray = Array.isArray(row.media) ? row.media : [];
      const firstMedia = mediaArray[0] || null;

      return {
        id: row.id,
        school: row.school,
        date: row.date,
        title: row.title,
        description: row.description,
        type: firstMedia?.type || 'image', // assuming media items have { url, type }
        src: firstMedia?.url || '',
      };
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error("DB Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch community content" });
  }
};