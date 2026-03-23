import { Router } from 'express';
import { getStudentEnrolledCourses, getStudentCourse } from '../controllers/enrollment.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { getStudentContentById, getStudentExams, startExamAttempt, saveExamResponse, getAttemptState, submitExamAttempt } from '../controllers/student.controller.js';
import { recordItemAttempt } from '../controllers/studentAttempts.controller.js';

const router = Router();

router.get('/content/:id', authenticateToken, getStudentContentById);
router.get('/enrolled-courses', authenticateToken, getStudentEnrolledCourses);
router.get('/exams', authenticateToken, getStudentExams);

router.post('/exams/:id/start', authenticateToken, startExamAttempt);
router.post('/attempts/:aid/save', authenticateToken, saveExamResponse);
router.post('/attempts/:aid/submit', authenticateToken, submitExamAttempt);
router.get('/attempts/:aid', authenticateToken, getAttemptState);

router.get('/course/:courseId', authenticateToken, getStudentCourse);

router.post('/item-attempt', authenticateToken, recordItemAttempt);

export default router;
