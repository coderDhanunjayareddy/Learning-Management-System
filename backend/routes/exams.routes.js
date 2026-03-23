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
  addQuestionToSection,
  publishExam,
} from '../controllers/exams.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(
  authenticateToken,
  attachClientContext,
  loadPermissions
);

router.get('/exams', checkPermission('exams.read'), listExams);
router.get('/exams/:id', checkPermission('exams.read'), getExamById);
router.post('/exams', checkPermission('exams.create'), createExam);
router.put('/exams/:id', checkPermission('exams.update'), updateExam);
router.delete('/exams/:id', checkPermission('exams.delete'), deleteExam);

router.post('/exams/:id/sections', checkPermission('exams.update'), createExamSection);
router.put('/exams/:id/sections/:sectionId', checkPermission('exams.update'), updateExamSection);
router.delete('/exams/:id/sections/:sectionId', checkPermission('exams.update'), deleteExamSection);

router.post('/exams/:id/sections/:sectionId/questions', checkPermission('exams.update'), addQuestionToSection);
router.post('/exams/:id/publish', checkPermission('exams.publish'), publishExam);

export default router;
