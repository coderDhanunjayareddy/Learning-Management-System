// controllers/studentAttempts.controller.js
import pool from "../config/db.js";

export const recordItemAttempt = async (req, res) => {
    const userId = req.user.id;

    const {
        content_item_id,
        score_raw = null,
        completion_status = "completed",
        suspend_data = null,
        total_time = null
    } = req.body;

    if (!content_item_id) {
        return res.status(400).json({ error: "content_item_id is required" });
    }

    try {
        // 1️⃣ CHECK IF ATTEMPT EXISTS
        const existingAttempt = await pool.query(
            `
            SELECT attempt_no
            FROM Student_attempts
            WHERE user_id = $1 AND content_item_id = $2
            ORDER BY attempt_no DESC
            LIMIT 1
            `,
            [userId, content_item_id]
        );

        // 2️⃣ ATTEMPT EXISTS → UPDATE
        if (existingAttempt.rows.length > 0) {
            const attemptNo = existingAttempt.rows[0].attempt_no;

            const updated = await pool.query(
                `
                UPDATE Student_attempts
                SET score_raw = $1, completion_status = $2, suspend_data = $3, total_time = $4, finished_at = NOW()
                WHERE user_id = $5 AND content_item_id = $6 AND attempt_no = $7
                RETURNING *
                `,
                [
                    score_raw,
                    completion_status,
                    suspend_data,
                    total_time,
                    userId,
                    content_item_id,
                    attemptNo
                ]
            );

            return res.json({
                success: true,
                message: "Attempt updated successfully",
                attempt: updated.rows[0]
            });
        }

        // 3️⃣ NO RECORD → INSERT NEW
        const inserted = await pool.query(
            `
            INSERT INTO Student_attempts 
            (user_id, content_item_id, attempt_no, score_raw, completion_status, suspend_data, total_time, finished_at)
            VALUES ($1, $2, 1, $3, $4, $5, $6, NOW())
            RETURNING *
            `,
            [
                userId,
                content_item_id,
                score_raw,
                completion_status,
                suspend_data,
                total_time
            ]
        );

        return res.json({
            success: true,
            message: "New attempt created",
            attempt: inserted.rows[0]
        });

    } catch (err) {
        console.error("❌ recordItemAttempt ERROR:", err);
        return res.status(500).json({
            error: "Internal server error while recording item attempt"
        });
    }
};
