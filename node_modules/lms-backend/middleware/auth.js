// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;

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

export const authenticateToken = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;

    const user = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);

    if (!user.rows[0]) return res.status(403).json({ error: 'Invalid token' });

    console.log("authenticate token value: ", user.rows[0]);


    req.user = user.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
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
