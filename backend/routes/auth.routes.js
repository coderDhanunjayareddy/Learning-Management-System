// backend/routes/auth.routes.js
import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);


// ✅ Add user refresh route (for frontend reloads)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user comes from authenticateToken middleware
        const { id, email, full_name, role, is_active, client_id, user_id } = req.user;
        res.json({ user: { id, email, full_name, role, is_active, client_id, user_id } });
        //console.log('Refreshed user data for:', { user: { id, email, full_name, role, is_active, client_id, user_id } });
    } catch (error) {
        console.error('Error in /me:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
