// routes/user.routes.js
import { Router } from 'express';
import { getAllUsers, getDashboardStats } from '../controllers/user.controller.js';
import { createUser, updateUser, deactivateUser } from '../controllers/hierarchy.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, requireRole(['super_admin', 'client_admin', 'school_owner', 'content_authorizer']), getAllUsers);

router.get('/stats', authenticateToken, requireRole(['super_admin', 'client_admin', 'school_owner', 'content_authorizer']), getDashboardStats);

router.post('/', authenticateToken, requireRole(['super_admin', 'client_admin', 'school_owner']), createUser);
router.patch('/:id', authenticateToken, requireRole(['super_admin', 'client_admin', 'school_owner']), updateUser);
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'client_admin', 'school_owner']), deactivateUser);

export default router;
