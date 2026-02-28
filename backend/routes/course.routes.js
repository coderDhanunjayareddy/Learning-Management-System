// routes/course.router.js
import { Router } from 'express';
import { getAllCourses } from '../controllers/admin.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();


// Authenticated access (tenant-scoped in controller)
router.get('/courses', authenticateToken, getAllCourses);

export default router;
