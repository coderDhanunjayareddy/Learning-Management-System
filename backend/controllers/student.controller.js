import pool from "../config/db.js"; // or your db connection

export const getStudentContentById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "SELECT * FROM content_items WHERE id=$1",
            [id]
        );

        // result.rows is always an array
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Content not found" });
        }

        const content = result.rows[0];

        res.json(content);
    } catch (err) {
        console.error("Error fetching content:", err);
        res.status(500).json({ message: "Error fetching content" });
    }
};