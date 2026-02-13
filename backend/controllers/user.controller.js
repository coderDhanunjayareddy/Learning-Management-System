import pool from '../config/db.js';
// Fetch all users from the database
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        last_login_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

//fetch a day updates from the users,enrollments,student attempts tables
export const getDashboardStats = async (req, res) => {
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
    const newSignupsResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND created_at >= $1`,
      [sevenDaysAgo]
    );

    const newEnrollmentsResult = await pool.query(
      `SELECT COUNT(*) AS count FROM enrollments WHERE enrolled_at >= $1`,
      [sevenDaysAgo]
    );

    const activeUsersResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE is_active = true AND last_login_at >= $1`,
      [thirtyDaysAgo]
    );

    const totalLearningTimeResult = await pool.query(
      `SELECT COALESCE(EXTRACT(EPOCH FROM SUM(total_time)), 0) AS total_seconds
       FROM student_attempts WHERE total_time IS NOT NULL`
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
    const dailySignupsResult = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM users
       WHERE role = 'student' AND created_at >= $1
       GROUP BY day`,
      [sevenDaysAgo]
    );

    const signupMap = {};
dailySignupsResult.rows.forEach(row => {
  // ✅ FIX: Normalize day to "YYYY-MM-DD"
  const dayKey = new Date(row.day).toISOString().split('T')[0];
  signupMap[dayKey] = parseInt(row.count);
});

const signupsData = labels.map(day => signupMap[day] || 0);

    // ===== 4. DAILY ENROLLMENTS =====
    const dailyEnrollmentsResult = await pool.query(
      `SELECT DATE(enrolled_at) AS day, COUNT(*) AS count
       FROM enrollments
       WHERE enrolled_at >= $1
       GROUP BY day`,
      [sevenDaysAgo]
    );

    const enrollMap = {};
dailyEnrollmentsResult.rows.forEach(row => {
  // ✅ FIX
  const dayKey = new Date(row.day).toISOString().split('T')[0];
  enrollMap[dayKey] = parseInt(row.count);
});

const enrollmentsData = labels.map(day => enrollMap[day] || 0);

    // ===== 5. DAILY LOGINS (as proxy for "Active Users" trend) =====
    const dailyLoginsResult = await pool.query(
      `SELECT DATE(last_login_at) AS day, COUNT(*) AS count
       FROM users
       WHERE role = 'student'
         AND last_login_at >= $1
         AND last_login_at IS NOT NULL
       GROUP BY day`,
      [sevenDaysAgo]
    );

    const loginMap = {};
dailyLoginsResult.rows.forEach(row => {
  // ✅ FIX
  const dayKey = new Date(row.day).toISOString().split('T')[0];
  loginMap[dayKey] = parseInt(row.count);
});

const loginsData = labels.map(day => loginMap[day] || 0);

    // ===== 6. DAILY LEARNING TIME (in hours) =====
    const dailyLearningResult = await pool.query(
      `SELECT 
         DATE(started_at) AS day,
         COALESCE(EXTRACT(EPOCH FROM SUM(total_time)) / 3600, 0) AS hours
       FROM student_attempts
       WHERE started_at >= $1
       GROUP BY day`,
      [sevenDaysAgo]
    );

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