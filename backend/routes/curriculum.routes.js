import { Router } from 'express';
import {
  listSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  listChapters,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
} from '../controllers/curriculum.controller.js';
import { authenticateToken, requireRole, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(
  authenticateToken,
  requireRole(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher', 'student']),
  attachClientContext,
  loadPermissions
);

// Subjects
router.get('/subjects', checkPermission('subjects.read'), listSubjects);
router.get('/subjects/:id', checkPermission('subjects.read'), getSubject);
router.post('/subjects', checkPermission('subjects.create'), createSubject);
router.patch('/subjects/:id', checkPermission('subjects.update'), updateSubject);
router.delete('/subjects/:id', checkPermission('subjects.delete'), deleteSubject);

// Chapters
router.get('/subjects/:subjectId/chapters', checkPermission('chapters.read'), listChapters);
router.get('/chapters/:id', checkPermission('chapters.read'), getChapter);
router.post('/subjects/:subjectId/chapters', checkPermission('chapters.create'), createChapter);
router.patch('/chapters/:id', checkPermission('chapters.update'), updateChapter);
router.delete('/chapters/:id', checkPermission('chapters.delete'), deleteChapter);

// Topics
router.get('/chapters/:chapterId/topics', checkPermission('topics.read'), listTopics);
router.get('/topics/:id', checkPermission('topics.read'), getTopic);
router.post('/chapters/:chapterId/topics', checkPermission('topics.create'), createTopic);
router.patch('/topics/:id', checkPermission('topics.update'), updateTopic);
router.delete('/topics/:id', checkPermission('topics.delete'), deleteTopic);

export default router;
