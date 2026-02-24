import { Router } from 'express';
import { createCourse, getAllCourses, getCourseContent, createContentItem, publishCourse, deleteCourse ,updateCourse} from '../controllers/admin.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, uploadContentFile, viewScormFile, updateContentFile } from '../controllers/scorm.controller.js';
import helmet from "helmet";
import { deleteContentItem, renameContentItem } from "../controllers/content.controller.js";


const router = Router();


router.get('/courses', authenticateToken, getAllCourses);

router.delete('/courses/:id', authenticateToken, deleteCourse);

router.patch('/courses/:id', authenticateToken, updateCourse);

router.post('/courses', authenticateToken, createCourse);
router.patch('/courses/:id/publish', authenticateToken, publishCourse); // ← ADD THIS

router.get('/courses/:courseId/content', authenticateToken, getCourseContent);

router.post('/courses/:courseId/content', authenticateToken, createContentItem);
router.post('/courses/:courseId/content/upload', upload.single('file'), authenticateToken, uploadContentFile);
router.get("/view/*", viewScormFile); //
router.delete("/courses/:courseId/content/:id", authenticateToken, deleteContentItem);
router.put("/courses/:courseId/content/:id/rename", authenticateToken, renameContentItem);
router.put("/courses/:courseId/content/:itemId/file", upload.single("file"), authenticateToken, updateContentFile);


export default router;