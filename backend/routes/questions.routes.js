import { Router } from 'express';
import {
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  softDeleteQuestion,
  approveQuestion,
  rejectQuestion,
  bulkUploadQuestions,
  listQuestionFolders,
  getQuestionFolderById,
  createQuestionFolder,
  updateQuestionFolder,
} from '../controllers/questions.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher'])
);

router.get('/questions', listQuestions);
router.get('/questions/:id', getQuestionById);
router.post('/questions', createQuestion);
router.post('/questions/bulk-upload', bulkUploadQuestions);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', softDeleteQuestion);
router.post('/questions/:id/approve', approveQuestion);
router.post('/questions/:id/reject', rejectQuestion);

router.get('/question-folders', listQuestionFolders);
router.get('/question-folders/:id', getQuestionFolderById);
router.post('/question-folders', createQuestionFolder);
router.patch('/question-folders/:id', updateQuestionFolder);

export default router;
