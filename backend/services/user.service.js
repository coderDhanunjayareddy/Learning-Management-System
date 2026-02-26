import { query as dbQuery, getClient } from '../repositories/db.repository.js';
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

//fetch a day updates from the users,enrollments,student attempts tables
export const getDashboardStats = async (req, res) => {
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const shouldScope = Boolean(clientId) && role !== 'super_admin';

  try {
    const now = new Date();
    // ✅ Get START of today in UTC
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // ✅ Seven full days: from 7 days ago (00:00 UTC) to now
    const sevenDaysAgo = new Date(todayUTC);
    sevenDaysAgo.setUTCDate(todayUTC.getUTCDate() - 7);
    
    const thirtyDaysAgo = new Date(todayUTC);
    thirtyDaysAgo.setUTCDate(todayUTC.getUTCDate() - 30);
    // ===== 1. TOTAL METRICS (unchanged) =====
    const newSignupsQuery = `
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'student'
        AND created_at >= $1
        ${shouldScope ? 'AND client_id = $2' : ''}
    `;
    const newSignupsParams = shouldScope ? [sevenDaysAgo, clientId] : [sevenDaysAgo];
    const newSignupsResult = await dbQuery(newSignupsQuery, newSignupsParams);

    const newEnrollmentsQuery = `
      SELECT COUNT(*) AS count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.enrolled_at >= $1
        ${shouldScope ? 'AND c.client_id = $2' : ''}
    `;
    const newEnrollmentsParams = shouldScope ? [sevenDaysAgo, clientId] : [sevenDaysAgo];
    const newEnrollmentsResult = await dbQuery(newEnrollmentsQuery, newEnrollmentsParams);

    const activeUsersQuery = `
      SELECT COUNT(*) AS count
      FROM users
      WHERE is_active = true
        AND last_login_at >= $1
        ${shouldScope ? 'AND client_id = $2' : ''}
    `;
    const activeUsersParams = shouldScope ? [thirtyDaysAgo, clientId] : [thirtyDaysAgo];
    const activeUsersResult = await dbQuery(activeUsersQuery, activeUsersParams);

    const totalLearningTimeQuery = `
      SELECT COALESCE(EXTRACT(EPOCH FROM SUM(sa.total_time)), 0) AS total_seconds
      FROM student_attempts sa
      JOIN content_items ci ON sa.content_item_id = ci.id
      JOIN courses c ON ci.course_id = c.id
      WHERE sa.total_time IS NOT NULL
      ${shouldScope ? 'AND c.client_id = $1' : ''}
    `;
    const totalLearningTimeParams = shouldScope ? [clientId] : [];
    const totalLearningTimeResult = await dbQuery(
      totalLearningTimeQuery,
      totalLearningTimeParams
    );

    const metrics = {
      newSignups: parseInt(newSignupsResult.rows[0].count),
      newEnrollments: parseInt(newEnrollmentsResult.rows[0].count),
      activeUsers: parseInt(activeUsersResult.rows[0].count),
      totalLearningHours: Math.round(
        (parseFloat(totalLearningTimeResult.rows[0].total_seconds || 0) / 3600) * 10
      ) / 10,
    };

    // ===== 2. HELPER: Generate full 7-day labels =====
    const labels = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(todayUTC);
      date.setUTCDate(todayUTC.getUTCDate() - (6 - i));
      labels.push(date.toISOString().split('T')[0]); // "YYYY-MM-DD"
    }

    // ===== 3. DAILY SIGNUPS =====
    const dailySignupsQuery = `
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM users
      WHERE role = 'student'
        AND created_at >= $1
        ${shouldScope ? 'AND client_id = $2' : ''}
      GROUP BY day
    `;
    const dailySignupsParams = shouldScope ? [sevenDaysAgo, clientId] : [sevenDaysAgo];
    const dailySignupsResult = await dbQuery(dailySignupsQuery, dailySignupsParams);

    const signupMap = {};
dailySignupsResult.rows.forEach(row => {
  // ✅ FIX: Normalize day to "YYYY-MM-DD"
  const dayKey = new Date(row.day).toISOString().split('T')[0];
  signupMap[dayKey] = parseInt(row.count);
});

const signupsData = labels.map(day => signupMap[day] || 0);

    // ===== 4. DAILY ENROLLMENTS =====
    const dailyEnrollmentsQuery = `
      SELECT DATE(e.enrolled_at) AS day, COUNT(*) AS count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.enrolled_at >= $1
        ${shouldScope ? 'AND c.client_id = $2' : ''}
      GROUP BY day
    `;
    const dailyEnrollmentsParams = shouldScope ? [sevenDaysAgo, clientId] : [sevenDaysAgo];
    const dailyEnrollmentsResult = await dbQuery(
      dailyEnrollmentsQuery,
      dailyEnrollmentsParams
    );

    const enrollMap = {};
dailyEnrollmentsResult.rows.forEach(row => {
  // ✅ FIX
  const dayKey = new Date(row.day).toISOString().split('T')[0];
  enrollMap[dayKey] = parseInt(row.count);
});

const enrollmentsData = labels.map(day => enrollMap[day] || 0);

    // ===== 5. DAILY LOGINS (as proxy for "Active Users" trend) =====
    const dailyLoginsQuery = `
      SELECT DATE(last_login_at) AS day, COUNT(*) AS count
      FROM users
      WHERE role = 'student'
        AND last_login_at >= $1
        AND last_login_at IS NOT NULL
        ${shouldScope ? 'AND client_id = $2' : ''}
      GROUP BY day
    `;
    const dailyLoginsParams = shouldScope ? [sevenDaysAgo, clientId] : [sevenDaysAgo];
    const dailyLoginsResult = await dbQuery(dailyLoginsQuery, dailyLoginsParams);

    const loginMap = {};
dailyLoginsResult.rows.forEach(row => {
  // ✅ FIX
  const dayKey = new Date(row.day).toISOString().split('T')[0];
  loginMap[dayKey] = parseInt(row.count);
});

const loginsData = labels.map(day => loginMap[day] || 0);

    // ===== 6. DAILY LEARNING TIME (in hours) =====
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
    const dailyLearningParams = shouldScope ? [sevenDaysAgo, clientId] : [sevenDaysAgo];
    const dailyLearningResult = await dbQuery(dailyLearningQuery, dailyLearningParams);

    const learningMap = {};
dailyLearningResult.rows.forEach(row => {
  // ✅ FIX
  const dayKey = new Date(row.day).toISOString().split('T')[0];
  learningMap[dayKey] = Math.round(parseFloat(row.hours) * 10) / 10;
});

const learningTimeData = labels.map(day => learningMap[day] || 0);

    // ===== 7. CHART DATA STRUCTURE =====
    const chartData = {
      labels,
      signups: signupsData,
      enrollments: enrollmentsData,
      logins: loginsData,
      learningTime: learningTimeData,
    };
    
    console.log("sevenDaysAgo (UTC):", sevenDaysAgo.toISOString());
console.log("Labels:", labels);
console.log("Raw signup rows:", dailySignupsResult.rows);

    res.json({
      metrics,
      chartData,
    });
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};


