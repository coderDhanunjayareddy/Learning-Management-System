// routes/user.routes.js
import { Router } from 'express';
import { getAllUsers, getDashboardStats } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, getAllUsers);

router.get('/stats', authenticateToken, getDashboardStats);

export default router;
