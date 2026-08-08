import { Router } from 'express';
import { register, login, sendOtpCode, verifyOtpCode, refresh, logout, getSessions, revokeSession, revokeAllSessions, guestLogin, simpleLogin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtpCode);
router.post('/verify-otp', verifyOtpCode);
router.post('/guest-login', guestLogin);
router.post('/simple-login', simpleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Session Management routes (Authenticated users)
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:id', authenticate, revokeSession);
router.delete('/sessions', authenticate, revokeAllSessions);

export default router;
