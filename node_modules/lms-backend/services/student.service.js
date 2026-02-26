import { query as dbQuery, getClient } from "../repositories/db.repository.js"; // or your db connection

export const getStudentContentById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    const clientId = req.user?.client_id;

    try {
        if (!userId || !role) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const isSuperAdmin = role === "super_admin";
        const adminRoles = ["client_admin", "school_owner", "content_authorizer"];
        const isAdminRole = adminRoles.includes(role) || isSuperAdmin;
        const shouldScope = Boolean(clientId) && !isSuperAdmin;

        const params = [id];
        let query = `
            SELECT ci.*
            FROM content_items ci
            JOIN courses c ON ci.course_id = c.id
        `;

        if (!isAdminRole) {
            query += `
                JOIN enrollments e
                  ON e.course_id = c.id
                 AND e.user_id = $2
            `;
            params.push(userId);
        }

        if (shouldScope) {
            query += `WHERE ci.id = $1 AND c.client_id = $${params.length + 1}`;
            params.push(clientId);
        } else {
            query += `WHERE ci.id = $1`;
        }

        const result = await dbQuery(query, params);

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


