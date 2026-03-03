import { Router } from 'express';
import {
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  softDeleteQuestion,
  approveQuestion,
  rejectQuestion,
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
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', softDeleteQuestion);
router.post('/questions/:id/approve', approveQuestion);
router.post('/questions/:id/reject', rejectQuestion);

export default router;
