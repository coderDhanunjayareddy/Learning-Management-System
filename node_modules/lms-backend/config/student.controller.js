import pool from '../config/db.js';

export const getContentItem = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM content_items WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Content not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching content item:', err);
        res.status(500).json({ error: 'Failed to fetch content item' });
    }
};
