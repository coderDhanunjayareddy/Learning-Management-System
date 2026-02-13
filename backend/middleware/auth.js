// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;


export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);

    if (!user.rows[0]) return res.status(403).json({ error: 'Invalid token' });

    req.user = user.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Keep this helper (optional)
export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};