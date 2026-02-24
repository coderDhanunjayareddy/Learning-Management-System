import { Router } from 'express';
import {getTeacherCourse} from '../controllers/enrollment.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/course/:courseId', authenticateToken, getTeacherCourse);

export default router;