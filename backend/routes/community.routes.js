// backend/routes/community.routes.js
import express from 'express';
import { createCommunityContent, getCommunityContent} from '../controllers/community.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, createCommunityContent);
router.get('/content', getCommunityContent);

export default router;