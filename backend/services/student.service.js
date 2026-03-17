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

export const getStudentExams = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const studentId = req.user.id;
    const courseRes = await dbQuery(
      'SELECT course_id FROM enrollments WHERE student_id = $1',
      [studentId]
    );

    const courseIds = courseRes.rows.map((r) => r.course_id);
    if (courseIds.length === 0) {
      return res.json([]);
    }

    const courseExamsExistRes = await dbQuery("SELECT to_regclass('public.course_exams') AS table_name");
    const useCourseExams = Boolean(courseExamsExistRes.rows[0]?.table_name);

    let examsResult;

    if (useCourseExams) {
      examsResult = await dbQuery(
        `
          SELECT
            e.*, ce.course_id,
            COALESCE(a.attempt_count, 0) AS attempt_count,
            COALESCE(a.completed, false) AS has_completed
          FROM course_exams ce
          JOIN exams e ON e.id = ce.exam_id
          LEFT JOIN (
            SELECT exam_id,
              COUNT(*)::int AS attempt_count,
              MAX(CASE WHEN status IN ('submitted', 'graded') THEN 1 ELSE 0 END)::boolean AS completed
            FROM exam_attempts
            WHERE student_id = $1
            GROUP BY exam_id
          ) a ON a.exam_id = e.id
          WHERE ce.course_id = ANY($2)
          ORDER BY e.start_datetime DESC, e.id DESC
        `,
        [studentId, courseIds]
      );
    } else {
      examsResult = await dbQuery(
        `
          SELECT
            e.*, NULL AS course_id,
            COALESCE(a.attempt_count, 0) AS attempt_count,
            COALESCE(a.completed, false) AS has_completed
          FROM exams e
          LEFT JOIN (
            SELECT exam_id,
              COUNT(*)::int AS attempt_count,
              MAX(CASE WHEN status IN ('submitted', 'graded') THEN 1 ELSE 0 END)::boolean AS completed
            FROM exam_attempts
            WHERE student_id = $1
            GROUP BY exam_id
          ) a ON a.exam_id = e.id
          WHERE e.status IN ('published', 'active', 'completed')
          ORDER BY e.start_datetime DESC, e.id DESC
        `,
        [studentId]
      );
    }

    const now = new Date();
    const exams = examsResult.rows.map((item) => {
      let computed_status = item.status || 'draft';
      const startDt = item.start_datetime ? new Date(item.start_datetime) : null;
      const endDt = item.end_datetime ? new Date(item.end_datetime) : null;

      if (item.has_completed) {
        computed_status = 'completed';
      } else if (item.attempt_count >= (item.max_attempts || 1)) {
        computed_status = 'max_attempts_reached';
      } else if (startDt && now < startDt) {
        computed_status = 'upcoming';
      } else if (startDt && endDt && now >= startDt && now <= endDt) {
        computed_status = 'ongoing';
      } else if (endDt && now > endDt) {
        computed_status = 'expired';
      } else if (item.status) {
        computed_status = item.status;
      }

      return {
        ...item,
        course_id: item.course_id || null,
        computed_status,
      };
    });

    res.json(exams);
  } catch (err) {
    console.error('Error fetching student exams:', err);
    res.status(500).json({ message: 'Error fetching student exams' });
  }
};


