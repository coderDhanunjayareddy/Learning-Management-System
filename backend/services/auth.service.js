// backend/controllers/auth.controller.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query as dbQuery, getClient } from '../repositories/db.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    const value = rest.join('=');
    acc[rawKey] = decodeURIComponent(value || '');
    return acc;
  }, {});
};

const getRefreshTokenFromRequest = (req) => {
  if (req.body?.refresh_token) return req.body.refresh_token;
  if (req.headers['x-refresh-token']) return req.headers['x-refresh-token'];
  const cookies = req.cookies ?? parseCookies(req.headers?.cookie);
  return cookies?.refresh_token || null;
};

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
  };
};

const issueAccessToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role, clientId: user.client_id },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

const createRefreshToken = () => crypto.randomBytes(64).toString('hex');

const storeRefreshToken = async (client, userId, tokenHash, req) => {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const runner = client?.query ? client.query.bind(client) : dbQuery;
  await runner(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, tokenHash, expiresAt, req.ip || null, req.headers['user-agent'] || null]
  );
  return expiresAt;
};

const VALID_ROLES = [
  'super_admin',
  'content_authorizer',
  'client_admin',
  'school_owner',
  'teacher',
  'student',
];

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

// ✅ Updated registration: allow role, but restrict to safe ones
export const register = async (req, res) => {
  return res.status(403).json({ error: 'Self-registration is disabled. Contact an admin.' });
  const { email, full_name, password } = req.body;
  const role = normalizeRole(req.body.role);

  if (!email || !full_name || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 🔒 Only allow self-registration for these roles
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
    const result = await dbQuery(
      `INSERT INTO users (email, full_name, password_hash, role, client_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, client_id, user_id`,
      [email, full_name, hashed, role, clientId, userId]
    );

    const accessToken = issueAccessToken(result.rows[0]);
    const refreshToken = createRefreshToken();
    const tokenHash = hashToken(refreshToken);

    await storeRefreshToken(null, result.rows[0].id, tokenHash, req);
    res.cookie('refresh_token', refreshToken, {
      ...getCookieOptions(),
      maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token: accessToken, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ✅ Login (supports all roles)
export const login = async (req, res) => {

  const start = Date.now(); // API start time

  console.log("LOGIN START");
  const { email, password } = req.body;

  const dbStart = Date.now();

  try {
    const userQueryResult = await dbQuery(
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

    await dbQuery('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const accessToken = issueAccessToken(user);
    const refreshToken = createRefreshToken();
    const tokenHash = hashToken(refreshToken);

    await storeRefreshToken(null, user.id, tokenHash, req);
    res.cookie('refresh_token', refreshToken, {
      ...getCookieOptions(),
      maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
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

    res.json({ token: accessToken, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }






};



// ✅ Super Admin registers admins (client_admin by default)
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
    const result = await dbQuery(
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

export const refreshToken = async (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const tokenHash = hashToken(token);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const tokenResult = await client.query(
      `
      SELECT id, user_id, expires_at, revoked_at
      FROM refresh_tokens
      WHERE token_hash = $1
      LIMIT 1
      `,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.clearCookie('refresh_token', getCookieOptions());
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokenRow = tokenResult.rows[0];
    if (tokenRow.revoked_at || new Date(tokenRow.expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      res.clearCookie('refresh_token', getCookieOptions());
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const userResult = await client.query(
      `SELECT id, email, full_name, role, client_id, user_id, is_active
       FROM users
       WHERE id = $1 AND is_active = true`,
      [tokenRow.user_id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.clearCookie('refresh_token', getCookieOptions());
      return res.status(401).json({ error: 'User not active' });
    }

    const user = userResult.rows[0];

    const newRefreshToken = createRefreshToken();
    const newHash = hashToken(newRefreshToken);

    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), replaced_by = $1
       WHERE id = $2`,
      [newHash, tokenRow.id]
    );

    await storeRefreshToken(client, user.id, newHash, req);

    await client.query('COMMIT');

    const accessToken = issueAccessToken(user);
    res.cookie('refresh_token', newRefreshToken, {
      ...getCookieOptions(),
      maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
    res.json({ token: accessToken, user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  } finally {
    client.release();
  }
};

export const logout = async (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (!token) {
    res.clearCookie('refresh_token', getCookieOptions());
    return res.status(204).send();
  }

  try {
    const tokenHash = hashToken(token);
    await dbQuery(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );
  } catch (err) {
    console.error('Logout error:', err);
  }

  res.clearCookie('refresh_token', getCookieOptions());
  return res.status(204).send();
};



