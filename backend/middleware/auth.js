// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const USER_CACHE_TTL_MS = Number(process.env.AUTH_USER_CACHE_TTL_MS || 30_000);
const PERMISSIONS_CACHE_TTL_MS = Number(process.env.PERMISSION_CACHE_TTL_MS || 60_000);
const userCache = new Map();
const permissionsCache = new Map();

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




const getTokenFromRequest = (req) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme && token && scheme.toLowerCase() === 'bearer') return token.trim();
    if (!authHeader.includes(' ')) return authHeader.trim();
  }

  const cookieHeader = req.headers?.cookie;
  const cookies = req.cookies ?? parseCookies(cookieHeader);
  return cookies?.token || cookies?.access_token || cookies?.auth_token || null;
};

const normalizeRole = (role) => {
  if (!role) return role;
  if (role === 'admin') return 'client_admin';
  return role;
};

const getCachedUser = (userId) => {
  const key = String(userId);
  const cached = userCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    userCache.delete(key);
    return null;
  }
  return cached.user;
};

const setCachedUser = (userId, user) => {
  const key = String(userId);
  userCache.set(key, {
    user,
    expiresAt: Date.now() + USER_CACHE_TTL_MS,
  });
};

const getCachedPermissions = (role, clientId) => {
  const key = `${role}:${clientId ?? 'global'}`;
  const cached = permissionsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    permissionsCache.delete(key);
    return null;
  }
  return cached.permissions;
};

const setCachedPermissions = (role, clientId, permissions) => {
  const key = `${role}:${clientId ?? 'global'}`;
  permissionsCache.set(key, {
    permissions,
    expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS,
  });
};

export const authenticateToken = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;

    const cachedUser = getCachedUser(decoded.userId);
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    const user = await pool.query(
      `SELECT id, email, full_name, role, is_active, client_id, user_id
       FROM users
       WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (!user.rows[0]) {
      return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }

    setCachedUser(decoded.userId, user.rows[0]);
    req.user = user.rows[0];
    next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err?.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }
    return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
  }
};

export const requireRole = (roles) => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  const normalizedRoles = roleList.map(normalizeRole).filter(Boolean);
  //console.log("requireRole normalizedroles value: ", normalizedRoles);
  return (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);

    if (!userRole) return res.status(401).json({ error: 'Unauthorized' });
    if (normalizedRoles.length === 0) return res.status(500).json({ error: 'Role requirements not configured' });
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

export const attachClientContext = (req, res, next) => {
  const claimClientId = req.auth?.clientId ?? req.auth?.client_id;
  const userClientId = req.user?.client_id ?? null;

  req.clientId = claimClientId ?? userClientId ?? null;
  next();
};

export const loadPermissions = async (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });

  const clientId = req.clientId ?? null;

  try {
    const cachedPermissions = getCachedPermissions(role, clientId);
    if (cachedPermissions) {
      req.permissions = cachedPermissions;
      return next();
    }

    const result = await pool.query(
      `SELECT permission, granted, client_id
       FROM role_permissions
       WHERE role = $1 AND (client_id = $2 OR client_id IS NULL)
       ORDER BY client_id NULLS LAST`,
      [role, clientId]
    );

    const permissions = new Map();
    for (const row of result.rows) {
      if (!permissions.has(row.permission)) {
        permissions.set(row.permission, row.granted === true);
      }
    }

    setCachedPermissions(role, clientId, permissions);
    req.permissions = permissions;
    next();
  } catch (err) {
    console.error('Failed to load permissions:', err);
    res.status(500).json({ error: 'Failed to load permissions' });
  }
};

export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!permission) return res.status(500).json({ error: 'Permission not configured' });
    if (req.user?.role === 'super_admin') return next();

    const permissions = req.permissions;
    if (!permissions) return res.status(500).json({ error: 'Permissions not loaded' });

    let granted = false;
    if (permissions instanceof Map) {
      granted = permissions.get(permission) === true;
    } else if (permissions instanceof Set) {
      granted = permissions.has(permission);
    } else if (Array.isArray(permissions)) {
      granted = permissions.includes(permission);
    }

    if (!granted) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
