import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, sendOtpCode, verifyOtpCode, refresh, logout, getSessions, revokeSession, revokeAllSessions, guestLogin, simpleLogin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many authentication attempts, please try again later."
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many OTP requests, please try again after an hour."
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/send-otp', otpLimiter, sendOtpCode);
router.post('/verify-otp', authLimiter, verifyOtpCode);
router.post('/guest-login', authLimiter, guestLogin);
router.post('/simple-login', authLimiter, simpleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Session Management routes (Authenticated users)
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:id', authenticate, revokeSession);
router.delete('/sessions', authenticate, revokeAllSessions);

export default router;
