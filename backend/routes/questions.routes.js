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
  bulkUploadTemplate,
} from '../controllers/questions.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher'])
);

router.get('/questions', listQuestions);
router.get('/questions/bulk-upload/template', bulkUploadTemplate);
router.post('/questions/bulk-upload', upload.single('file'), bulkUploadQuestions);
router.get('/questions/:id', getQuestionById);
router.post('/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', softDeleteQuestion);
router.post('/questions/:id/approve', approveQuestion);
router.post('/questions/:id/reject', rejectQuestion);

export default router;
