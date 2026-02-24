// backend/controllers/auth.controller.js
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

const JWT_SECRET = process.env.JWT_SECRET;

const VALID_ROLES = [
  'super_admin',
  'content_authorizer',
  'client_admin',
  'school_owner',
  'teacher',
  'student',
];

const SELF_REGISTER_ROLES = ['student', 'teacher'];

const normalizeRole = (role) => {
  if (!role) return role;
  if (role === 'admin') return 'client_admin'; // backward compatibility
  return role;
};

const parseNullableInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return parsed;
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
};

// âœ… Updated registration: allow role, but restrict to safe ones
export const register = async (req, res) => {
  const { email, full_name, password } = req.body;
  const role = normalizeRole(req.body.role);

  if (!email || !full_name || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ðŸ”’ Only allow self-registration for these roles
  if (!SELF_REGISTER_ROLES.includes(role)) {
    return res.status(400).json({ error: 'This role cannot be registered publicly.' });
  }

  let clientId = null;
  let userId = null;
  try {
    clientId = parseNullableInt(req.body.client_id, 'client_id');
    userId = normalizeOptionalString(req.body.user_id);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const hashed = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, full_name, password_hash, role, client_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, client_id, user_id`,
      [email, full_name, hashed, role, clientId, userId]
    );

    const token = jwt.sign({ userId: result.rows[0].id, role: result.rows[0].role, clientId: result.rows[0].client_id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// âœ… Login (supports all roles)
export const login = async (req, res) => {

  const start = Date.now(); // API start time

  console.log("LOGIN START");
  const { email, password } = req.body;

  const dbStart = Date.now();

  try {
    const userQueryResult = await pool.query(
      'SELECT id, email, full_name, role, client_id, user_id, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (userQueryResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userQueryResult.rows[0];
    console.log("***************backend user data***************\ndata: ", {
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ userId: user.id, role: user.role, clientId: user.client_id }, JWT_SECRET, { expiresIn: '7d' });
    const dbEnd = Date.now();



    console.log("DB QUERY TIME:", dbEnd - dbStart, "ms");

    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      client_id: user.client_id,
      user_id: user.user_id,
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }






};



// âœ… Super Admin registers admins (client_admin by default)
export const registerAdmin = async (req, res) => {
  // Super Admin check is done in middleware (see Step 2)
  const { email, full_name, password } = req.body;
  const role = normalizeRole(req.body.role) || 'client_admin';

  if (!email || !full_name || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  let clientId = null;
  let userId = null;
  try {
    clientId = parseNullableInt(req.body.client_id, 'client_id');
    userId = normalizeOptionalString(req.body.user_id);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const hashed = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, full_name, password_hash, role, client_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, client_id, user_id`,
      [email, full_name, hashed, role, clientId, userId]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Admin registration failed' });
  }
};

