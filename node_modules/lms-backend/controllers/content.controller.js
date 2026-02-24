import pool from "../config/db.js";

export const deleteContentItem = async (req, res) => {
    const { id, courseId } = req.params;
    const userRole = req.user?.role;

    try {
        // Optional: allow only admin or teacher to delete
        if (!userRole || (userRole !== "admin" && userRole !== "teacher")) {
            return res.status(403).json({ error: "Unauthorized: Only admins or teachers can delete items." });
        }

        // Check if item belongs to the course
        const check = await pool.query(
            `SELECT id, item_type FROM content_items WHERE id = $1 AND course_id = $2`,
            [id, courseId]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ error: "Item not found or does not belong to this course." });
        }

        const itemType = check.rows[0].item_type;

        // Delete item (CASCADE will remove children if it's a folder)
        await pool.query(`DELETE FROM content_items WHERE id = $1`, [id]);

        return res.json({
            success: true,
            message: itemType === "folder"
                ? "Folder and all its contents deleted successfully."
                : "Content item deleted successfully."
        });

    } catch (error) {
        console.error("❌ Error deleting content item:", error);
        res.status(500).json({ error: "Internal server error while deleting content." });
    }
};



export const renameContentItem = async (req, res) => {
    const { id, courseId } = req.params;
    const { title } = req.body;
    const userRole = req.user?.role;

    try {
        // Permissions
        if (!userRole || (userRole !== "admin" && userRole !== "teacher")) {
            return res.status(403).json({ error: "Unauthorized: Only admins or teachers can rename items." });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Title cannot be empty." });
        }

        // Ensure the content exists
        const existing = await pool.query(
            `SELECT id FROM content_items WHERE id = $1 AND course_id = $2`,
            [id, courseId]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({ error: "Item not found or does not belong to this course." });
        }

        // Perform rename
        const updated = await pool.query(
            `UPDATE content_items SET title = $1, updated_at = NOW()
             WHERE id = $2 AND course_id = $3 RETURNING *`,
            [title.trim(), id, courseId]
        );

        res.json({
            success: true,
            message: "Title renamed successfully.",
            item: updated.rows[0],
        });

    } catch (error) {
        console.error("❌ Error renaming content item:", error);
        res.status(500).json({ error: "Internal server error while renaming content." });
    }
};
