import { Router } from 'express';
import { registerAdmin } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
// Only super_admin can access
//No separate middleware needed — inline role check is sufficient. 
router.post('/register-admin', authenticateToken, (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}, registerAdmin);

export default router;