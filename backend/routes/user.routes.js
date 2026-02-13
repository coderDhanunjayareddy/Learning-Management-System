// routes/user.routes.js
import { Router } from 'express';
import { getAllUsers, getDashboardStats} from '../controllers/user.controller.js';

const router = Router();

router.get('/', getAllUsers);

router.get('/stats', getDashboardStats);

export default router;