import { query as dbQuery, getClient } from "../repositories/db.repository.js";

const ensureCourseAccess = async (courseId, req) => {
    const role = req.user?.role;
    const clientId = req.user?.client_id;
    const shouldScope = Boolean(clientId) && role !== "super_admin";

    if (!shouldScope) return true;

    const result = await dbQuery(
        `SELECT 1 FROM courses WHERE id = $1 AND client_id = $2`,
        [courseId, clientId]
    );

    return result.rowCount > 0;
};

export const deleteContentItem = async (req, res) => {
    const { id, courseId } = req.params;
    const userRole = req.user?.role;

    try {
        if (!userRole) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const canAccess = await ensureCourseAccess(courseId, req);
        if (!canAccess) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Check if item belongs to the course
        const check = await dbQuery(
            `SELECT id, item_type FROM content_items WHERE id = $1 AND course_id = $2`,
            [id, courseId]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ error: "Item not found or does not belong to this course." });
        }

        const itemType = check.rows[0].item_type;

        // Delete item (CASCADE will remove children if it's a folder)
        await dbQuery(`DELETE FROM content_items WHERE id = $1`, [id]);

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
        if (!userRole) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const canAccess = await ensureCourseAccess(courseId, req);
        if (!canAccess) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Title cannot be empty." });
        }

        // Ensure the content exists
        const existing = await dbQuery(
            `SELECT id FROM content_items WHERE id = $1 AND course_id = $2`,
            [id, courseId]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({ error: "Item not found or does not belong to this course." });
        }

        // Perform rename
        const updated = await dbQuery(
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


