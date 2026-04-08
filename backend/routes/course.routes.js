// routes/course.router.js
import { Router } from 'express';
import { getAllCourses } from '../controllers/admin.controller.js';
import { authenticateToken, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, attachClientContext, loadPermissions);

// Authenticated access (tenant-scoped in controller)
router.get('/courses', checkPermission('courses.read'), getAllCourses);

export default router;
