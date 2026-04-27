import { Router } from 'express';
import {
  listBlueprints,
  getBlueprintById,
  createBlueprint,
  updateBlueprint,
  deleteBlueprint,
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
  getExamAssignedCourses,
  assignExamCourses,
  getExamResults,
  getExamSectionSyllabusOptions,
  configureExamSectionSyllabus,
  generateExamSectionQuestions,
  getExamPreview,
  finalizeExamBlueprint,
} from '../controllers/exams.controller.js';
import { authenticateToken, attachClientContext, loadPermissions, checkPermission } from '../middleware/auth.js';

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

router.get('/blueprints', checkPermission('exams.read'), listBlueprints);
router.get('/blueprints/:id', checkPermission('exams.read'), getBlueprintById);
router.post('/blueprints', checkPermission('exams.create'), createBlueprint);
router.put('/blueprints/:id', checkPermission('exams.update'), updateBlueprint);
router.delete('/blueprints/:id', checkPermission('exams.delete'), deleteBlueprint);

router.post('/exams/:id/sections', checkPermission('exams.update'), createExamSection);
router.put('/exams/:id/sections/:sectionId', checkPermission('exams.update'), updateExamSection);
router.delete('/exams/:id/sections/:sectionId', checkPermission('exams.update'), deleteExamSection);
router.get('/exams/:id/sections/:sectionId/syllabus-options', checkPermission('exams.read'), getExamSectionSyllabusOptions);
router.put('/exams/:id/sections/:sectionId/configure', checkPermission('exams.update'), configureExamSectionSyllabus);
router.post('/exams/:id/sections/:sectionId/generate', checkPermission('exams.update'), generateExamSectionQuestions);
router.get('/exams/:id/preview', checkPermission('exams.read'), getExamPreview);
router.post('/exams/:id/finalize', checkPermission('exams.update'), finalizeExamBlueprint);

router.post('/exams/:id/sections/:sectionId/questions', checkPermission('exams.update'), addQuestionToSection);
router.post('/exams/:id/publish', checkPermission('exams.publish'), publishExam);
router.get('/exams/:id/results', checkPermission('exams.read'), getExamResults);
router.get('/exams/:id/courses', checkPermission('exams.read'), getExamAssignedCourses);
router.put('/exams/:id/courses', checkPermission('exams.update'), assignExamCourses);

export default router;
