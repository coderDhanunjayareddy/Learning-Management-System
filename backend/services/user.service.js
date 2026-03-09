import { query as dbQuery } from '../repositories/db.repository.js';

const DASHBOARD_STATS_TTL_MS = Number(process.env.DASHBOARD_STATS_TTL_MS || 30_000);
const dashboardStatsCache = new Map();
let ensureDashboardIndexesPromise = null;

const ensureDashboardIndexes = async () => {
  if (!ensureDashboardIndexesPromise) {
    ensureDashboardIndexesPromise = (async () => {
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_users_client_role_created_at
         ON users (client_id, role, created_at DESC)`
      );
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_users_client_last_login_active
         ON users (client_id, last_login_at DESC)
         WHERE is_active = true`
      );
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at_course
         ON enrollments (enrolled_at DESC, course_id)`
      );
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_courses_client_id_id
         ON courses (client_id, id)`
      );
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_student_attempts_started_content
         ON student_attempts (started_at DESC, content_item_id)`
      );
      await dbQuery(
        `CREATE INDEX IF NOT EXISTS idx_student_attempts_total_time_content
         ON student_attempts (content_item_id)
         WHERE total_time IS NOT NULL`
      );
    })().catch((err) => {
      ensureDashboardIndexesPromise = null;
      throw err;
    });
  }

  return ensureDashboardIndexesPromise;
};

const getDashboardCache = (cacheKey) => {
  const cached = dashboardStatsCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dashboardStatsCache.delete(cacheKey);
    return null;
  }
  return cached.data;
};

const setDashboardCache = (cacheKey, data) => {
  dashboardStatsCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + DASHBOARD_STATS_TTL_MS,
  });
};

const toDayKey = (value) => new Date(value).toISOString().split('T')[0];

const buildDayMap = (rows, fieldName, mapper = (val) => Number(val)) => {
  const map = {};
  rows.forEach((row) => {
    const dayKey = toDayKey(row.day);
    map[dayKey] = mapper(row[fieldName]);
  });
  return map;
};

// Fetch all users from the database
export const getAllUsers = async (req, res) => {
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';

  try {
    const query = `
      SELECT
        id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        last_login_at
      FROM users
      ${shouldScope ? 'WHERE client_id = $1' : ''}
      ORDER BY created_at DESC
    `;
    const params = shouldScope ? [clientId] : [];
    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Fetch dashboard metrics and last 7-day trends
export const getDashboardStats = async (req, res) => {
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';
  const cacheKey = `${role || 'unknown'}:${clientId ?? 'all'}`;

  try {
    const cached = getDashboardCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    await ensureDashboardIndexes();

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const sevenDaysAgo = new Date(todayUTC);
    sevenDaysAgo.setUTCDate(todayUTC.getUTCDate() - 7);

    const thirtyDaysAgo = new Date(todayUTC);
    thirtyDaysAgo.setUTCDate(todayUTC.getUTCDate() - 30);

    const newSignupsQuery = `
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'student'
        AND created_at >= $1
        ${shouldScope ? 'AND client_id = $2' : ''}
    `;
    const newEnrollmentsQuery = `
      SELECT COUNT(*) AS count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.enrolled_at >= $1
        ${shouldScope ? 'AND c.client_id = $2' : ''}
    `;
    const activeUsersQuery = `
      SELECT COUNT(*) AS count
      FROM users
      WHERE is_active = true
        AND last_login_at >= $1
        ${shouldScope ? 'AND client_id = $2' : ''}
    `;
    const totalLearningTimeQuery = `
      SELECT COALESCE(EXTRACT(EPOCH FROM SUM(sa.total_time)), 0) AS total_seconds
      FROM student_attempts sa
      JOIN content_items ci ON sa.content_item_id = ci.id
      JOIN courses c ON ci.course_id = c.id
      WHERE sa.total_time IS NOT NULL
      ${shouldScope ? 'AND c.client_id = $1' : ''}
    `;

    const dailySignupsQuery = `
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM users
      WHERE role = 'student'
        AND created_at >= $1
        ${shouldScope ? 'AND client_id = $2' : ''}
      GROUP BY day
    `;
    const dailyEnrollmentsQuery = `
      SELECT DATE(e.enrolled_at) AS day, COUNT(*) AS count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.enrolled_at >= $1
        ${shouldScope ? 'AND c.client_id = $2' : ''}
      GROUP BY day
    `;
    const dailyLoginsQuery = `
      SELECT DATE(last_login_at) AS day, COUNT(*) AS count
      FROM users
      WHERE role = 'student'
        AND last_login_at >= $1
        AND last_login_at IS NOT NULL
        ${shouldScope ? 'AND client_id = $2' : ''}
      GROUP BY day
    `;
    const dailyLearningQuery = `
      SELECT
        DATE(sa.started_at) AS day,
        COALESCE(EXTRACT(EPOCH FROM SUM(sa.total_time)) / 3600, 0) AS hours
      FROM student_attempts sa
      JOIN content_items ci ON sa.content_item_id = ci.id
      JOIN courses c ON ci.course_id = c.id
      WHERE sa.started_at >= $1
        ${shouldScope ? 'AND c.client_id = $2' : ''}
      GROUP BY day
    `;

    const scopedSevenDayParams = shouldScope ? [sevenDaysAgo, clientId] : [sevenDaysAgo];
    const scopedThirtyDayParams = shouldScope ? [thirtyDaysAgo, clientId] : [thirtyDaysAgo];
    const totalLearningTimeParams = shouldScope ? [clientId] : [];

    const [
      newSignupsResult,
      newEnrollmentsResult,
      activeUsersResult,
      totalLearningTimeResult,
      dailySignupsResult,
      dailyEnrollmentsResult,
      dailyLoginsResult,
      dailyLearningResult,
    ] = await Promise.all([
      dbQuery(newSignupsQuery, scopedSevenDayParams),
      dbQuery(newEnrollmentsQuery, scopedSevenDayParams),
      dbQuery(activeUsersQuery, scopedThirtyDayParams),
      dbQuery(totalLearningTimeQuery, totalLearningTimeParams),
      dbQuery(dailySignupsQuery, scopedSevenDayParams),
      dbQuery(dailyEnrollmentsQuery, scopedSevenDayParams),
      dbQuery(dailyLoginsQuery, scopedSevenDayParams),
      dbQuery(dailyLearningQuery, scopedSevenDayParams),
    ]);

    const metrics = {
      newSignups: Number.parseInt(newSignupsResult.rows[0].count, 10),
      newEnrollments: Number.parseInt(newEnrollmentsResult.rows[0].count, 10),
      activeUsers: Number.parseInt(activeUsersResult.rows[0].count, 10),
      totalLearningHours:
        Math.round((Number.parseFloat(totalLearningTimeResult.rows[0].total_seconds || 0) / 3600) * 10) / 10,
    };

    const labels = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(todayUTC);
      date.setUTCDate(todayUTC.getUTCDate() - (6 - i));
      labels.push(date.toISOString().split('T')[0]);
    }

    const signupMap = buildDayMap(dailySignupsResult.rows, 'count', (val) => Number.parseInt(val, 10));
    const enrollMap = buildDayMap(dailyEnrollmentsResult.rows, 'count', (val) => Number.parseInt(val, 10));
    const loginMap = buildDayMap(dailyLoginsResult.rows, 'count', (val) => Number.parseInt(val, 10));
    const learningMap = buildDayMap(dailyLearningResult.rows, 'hours', (val) => {
      return Math.round(Number.parseFloat(val || 0) * 10) / 10;
    });

    const payload = {
      metrics,
      chartData: {
        labels,
        signups: labels.map((day) => signupMap[day] || 0),
        enrollments: labels.map((day) => enrollMap[day] || 0),
        logins: labels.map((day) => loginMap[day] || 0),
        learningTime: labels.map((day) => learningMap[day] || 0),
      },
    };

    setDashboardCache(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
