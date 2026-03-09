import { Router } from 'express';
import {
  listExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  createExamSection,
  updateExamSection,
  deleteExamSection,
} from '../controllers/exams.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher'])
);

router.get('/exams', listExams);
router.get('/exams/:id', getExamById);
router.post('/exams', createExam);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);

router.post('/exams/:id/sections', createExamSection);
router.put('/exams/:id/sections/:sectionId', updateExamSection);
router.delete('/exams/:id/sections/:sectionId', deleteExamSection);

export default router;
