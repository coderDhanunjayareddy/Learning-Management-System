import { Router } from 'express';
import {
  addPackItems,
  attachCourseToPack,
  createCourse,
  createPack,
  getCourseContent,
  getPackItems,
  getPackSummary,
  listCourses,
  listPacks,
  removePackItem,
} from '../controllers/packBuilder.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['super_admin', 'content_authorizer']));

router.get('/packs', listPacks);
router.post('/packs', createPack);
router.get('/packs/:id/items', getPackItems);
router.get('/packs/:id/summary', getPackSummary);
router.post('/packs/:id/items', addPackItems);
router.delete('/packs/:id/items/:itemId', removePackItem);
router.post('/packs/:id/attach-course', attachCourseToPack);

router.get('/courses', listCourses);
router.get('/courses/:id/content', getCourseContent);
router.post('/courses', createCourse);

export default router;
