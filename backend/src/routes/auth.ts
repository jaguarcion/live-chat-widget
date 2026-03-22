import { Router } from 'express';
import { register, login, getMe, logout, logoutAll, refresh } from '../controllers/auth';
import { authenticate } from '../middlewares/auth';
import { createRateLimit } from '../middlewares/rateLimit';

const router = Router();

const normalizeEmail = (reqBody: unknown): string => {
	if (!reqBody || typeof reqBody !== 'object') return 'unknown';
	const email = (reqBody as Record<string, unknown>).email;
	if (typeof email !== 'string') return 'unknown';
	const normalized = email.trim().toLowerCase();
	return normalized || 'unknown';
};

const registerLimiter = createRateLimit({
	windowMs: 10 * 60 * 1000,
	max: 10,
	message: 'Too many registration attempts. Please try again later.'
});

const loginLimiter = createRateLimit({
	windowMs: 5 * 60 * 1000,
	max: 20,
	message: 'Too many login attempts. Please try again later.'
});

const loginAccountLimiter = createRateLimit({
	windowMs: 5 * 60 * 1000,
	max: 10,
	message: 'Too many login attempts for this account. Please try again later.',
	keyGenerator: (req) => `login-account:${normalizeEmail(req.body)}`
});

const registerAccountLimiter = createRateLimit({
	windowMs: 10 * 60 * 1000,
	max: 5,
	message: 'Too many registration attempts for this email. Please try again later.',
	keyGenerator: (req) => `register-account:${normalizeEmail(req.body)}`
});

const refreshLimiter = createRateLimit({
	windowMs: 5 * 60 * 1000,
	max: 40,
	message: 'Too many refresh attempts. Please try again later.'
});

router.post('/register', registerLimiter, registerAccountLimiter, register);
router.post('/login', loginLimiter, loginAccountLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

export default router;
