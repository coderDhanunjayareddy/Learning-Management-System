import { Router } from 'express';
import { getStudentEnrolledCourses, getStudentCourse } from '../controllers/enrollment.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { getStudentContentById, getStudentExams } from "../controllers/student.controller.js";
import { recordItemAttempt } from "../controllers/studentAttempts.controller.js";

const router = Router();

router.get('/content/:id', authenticateToken, getStudentContentById);
router.get('/enrolled-courses', authenticateToken, getStudentEnrolledCourses);
router.get('/student/exams', authenticateToken, getStudentExams);

router.get('/course/:courseId', authenticateToken, getStudentCourse);

router.post("/item-attempt", authenticateToken, recordItemAttempt);

export default router;