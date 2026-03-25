import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query as dbQuery, getClient } from '../repositories/db.repository.js';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '12h';
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);
const ACCESS_TOKEN_REFRESH_WINDOW_SECONDS = parseInt(
  process.env.ACCESS_TOKEN_REFRESH_WINDOW_SECONDS || '1800',
  10
);

export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const createRefreshToken = () => crypto.randomBytes(64).toString('hex');

export const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    const value = rest.join('=');
    acc[rawKey] = decodeURIComponent(value || '');
    return acc;
  }, {});
};

export const getRefreshTokenFromRequest = (req) => {
  if (req.body?.refresh_token) return req.body.refresh_token;
  if (req.headers['x-refresh-token']) return req.headers['x-refresh-token'];
  const cookies = req.cookies ?? parseCookies(req.headers?.cookie);
  return cookies?.refresh_token || null;
};

export const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
  };
};

export const getAccessTokenCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };
};

export const issueAccessToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role, clientId: user.client_id },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

export const storeRefreshToken = async (client, userId, tokenHashValue, req) => {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const runner = client?.query ? client.query.bind(client) : dbQuery;
  await runner(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, tokenHashValue, expiresAt, req.ip || null, req.headers['user-agent'] || null]
  );
  return expiresAt;
};

export const applyAuthCookies = (res, accessToken, refreshToken) => {
  const refreshMaxAgeMs = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  res.cookie('refresh_token', refreshToken, {
    ...getCookieOptions(),
    maxAge: refreshMaxAgeMs,
  });
  res.cookie('token', accessToken, {
    ...getAccessTokenCookieOptions(),
    maxAge: refreshMaxAgeMs,
  });
  res.setHeader('x-access-token', accessToken);
};

export const clearAuthCookies = (res) => {
  res.clearCookie('refresh_token', getCookieOptions());
  res.clearCookie('token', getAccessTokenCookieOptions());
};

export const shouldRefreshAccessToken = (decodedToken) => {
  const exp = Number(decodedToken?.exp);
  if (!Number.isFinite(exp)) return false;
  const secondsRemaining = exp - Math.floor(Date.now() / 1000);
  return secondsRemaining <= ACCESS_TOKEN_REFRESH_WINDOW_SECONDS;
};

export const rotateRefreshSession = async ({ refreshToken, req, res }) => {
  if (!refreshToken) return null;

  const tokenHashValue = hashToken(refreshToken);
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tokenResult = await client.query(
      `
      SELECT id, user_id, expires_at, revoked_at
      FROM refresh_tokens
      WHERE token_hash = $1
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHashValue]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      clearAuthCookies(res);
      return null;
    }

    const tokenRow = tokenResult.rows[0];
    if (tokenRow.revoked_at || new Date(tokenRow.expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      clearAuthCookies(res);
      return null;
    }

    const userResult = await client.query(
      `SELECT id, email, full_name, role, is_active, client_id, user_id
       FROM users
       WHERE id = $1 AND is_active = true`,
      [tokenRow.user_id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      clearAuthCookies(res);
      return null;
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
    applyAuthCookies(res, accessToken, newRefreshToken);

    return {
      accessToken,
      decoded: jwt.verify(accessToken, JWT_SECRET),
      user,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
  ACCESS_TOKEN_REFRESH_WINDOW_SECONDS,
  JWT_SECRET,
};
