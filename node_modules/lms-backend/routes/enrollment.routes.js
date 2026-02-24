import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { enrollUserByEmail, getCourseEnrollments, deleteEnrollment, updateEnrollmentRole} from "../controllers/enrollment.controller.js";

const router = Router();

router.post('/courses/:courseId/enroll-by-email',  authenticateToken,enrollUserByEmail);
router.get('/courses/:courseId/enrollments', authenticateToken,getCourseEnrollments);

router.delete('/courses/:id/enrollments/:userId', authenticateToken, deleteEnrollment);
router.patch('/courses/:id/enrollments/:userId', authenticateToken, updateEnrollmentRole);

export default router;