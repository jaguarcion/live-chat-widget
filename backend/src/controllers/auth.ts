import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth';
import { ALLOW_PUBLIC_REGISTRATION } from '../config/security';
import { issueAccessToken, revokeAccessToken, revokeAllUserTokens } from '../services/authToken';
import { getRefreshTokenExpiry, hashRefreshToken, issueRefreshToken } from '../services/refreshToken';

const REFRESH_COOKIE_NAME = 'lc_refresh';

type LoginAttemptState = {
    failures: number;
    lastFailureAt: number;
    lockedUntil: number;
};

const loginAttemptState = new Map<string, LoginAttemptState>();

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BASE_MS = 5 * 60 * 1000;
const LOCKOUT_MAX_MS = 60 * 60 * 1000;

const getClientIp = (req: Request): string => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
};

const buildLoginAttemptKeys = (req: Request, email: string): string[] => {
    const normalizedEmail = email.trim().toLowerCase();
    const ip = getClientIp(req);
    return [`login:email:${normalizedEmail}`, `login:ip:${ip}`, `login:pair:${normalizedEmail}:${ip}`];
};

const getState = (key: string): LoginAttemptState => {
    const existing = loginAttemptState.get(key);
    if (existing) return existing;

    const created: LoginAttemptState = { failures: 0, lastFailureAt: 0, lockedUntil: 0 };
    loginAttemptState.set(key, created);
    return created;
};

const getLockoutDurationMs = (failures: number): number => {
    if (failures < LOCKOUT_THRESHOLD) return 0;

    const exponent = failures - LOCKOUT_THRESHOLD;
    return Math.min(LOCKOUT_MAX_MS, LOCKOUT_BASE_MS * Math.pow(2, exponent));
};

const getProgressiveDelayMs = (failures: number): number => {
    if (failures <= 1) return 0;
    return Math.min(3000, failures * 200);
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const getActiveLockMs = (keys: string[]): number => {
    const now = Date.now();
    let maxLockMs = 0;

    for (const key of keys) {
        const state = getState(key);
        if (state.lockedUntil > now) {
            maxLockMs = Math.max(maxLockMs, state.lockedUntil - now);
        }
    }

    return maxLockMs;
};

const registerFailedLoginAttempt = async (keys: string[]): Promise<void> => {
    let maxFailures = 0;

    for (const key of keys) {
        const state = getState(key);
        state.failures += 1;
        state.lastFailureAt = Date.now();

        const lockoutMs = getLockoutDurationMs(state.failures);
        if (lockoutMs > 0) {
            state.lockedUntil = Math.max(state.lockedUntil, state.lastFailureAt + lockoutMs);
        }

        maxFailures = Math.max(maxFailures, state.failures);
    }

    const delayMs = getProgressiveDelayMs(maxFailures);
    if (delayMs > 0) {
        await sleep(delayMs);
    }
};

const clearLoginAttemptState = (keys: string[]): void => {
    for (const key of keys) {
        loginAttemptState.delete(key);
    }
};

const getRefreshCookieOptions = () => {
    const secure = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure,
        sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
        path: '/api/auth',
    };
};

const setRefreshCookie = (res: Response, token: string) => {
    const cookieOptions = getRefreshCookieOptions();
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...cookieOptions,
        expires: getRefreshTokenExpiry(),
    });
};

const clearRefreshCookie = (res: Response) => {
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
};

const readRefreshToken = (req: Request): string | null => {
    const fromCookie = typeof req.cookies?.[REFRESH_COOKIE_NAME] === 'string' ? req.cookies[REFRESH_COOKIE_NAME] : null;
    if (fromCookie) return fromCookie;

    const fromBody = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null;
    if (fromBody) return fromBody;

    return null;
};

const createSessionTokens = async (userId: string, role: string) => {
    const accessToken = issueAccessToken(userId, role);
    const refreshToken = issueRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await prisma.authSession.create({
        data: {
            userId,
            tokenHash: refreshTokenHash,
            expiresAt: getRefreshTokenExpiry(),
        }
    });

    return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            res.status(400).json({ error: 'email, password and name are required' });
            return;
        }

        const usersCount = await prisma.user.count();
        const isBootstrap = usersCount === 0;
        if (!isBootstrap && !ALLOW_PUBLIC_REGISTRATION) {
            res.status(403).json({ error: 'Public registration is disabled' });
            return;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: isBootstrap ? 'OWNER' : 'OPERATOR'
            }
        });

        const tokens = await createSessionTokens(user.id, user.role);

        setRefreshCookie(res, tokens.refreshToken);
        res.json({ token: tokens.accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, title: user.title, showInGreeting: user.showInGreeting } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'email and password are required' });
            return;
        }

        const loginKeys = buildLoginAttemptKeys(req, email);
        const activeLockMs = getActiveLockMs(loginKeys);
        if (activeLockMs > 0) {
            const retryAfterSec = Math.ceil(activeLockMs / 1000);
            res.setHeader('Retry-After', retryAfterSec.toString());
            res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            await registerFailedLoginAttempt(loginKeys);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await registerFailedLoginAttempt(loginKeys);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        clearLoginAttemptState(loginKeys);

        const tokens = await createSessionTokens(user.id, user.role);

        setRefreshCookie(res, tokens.refreshToken);
        res.json({ token: tokens.accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, title: user.title, showInGreeting: user.showInGreeting } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, title: user.title, showInGreeting: user.showInGreeting } });
    } catch (error) {
        console.error('Get Me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
    const payload = req.user;
    if (!payload) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    await revokeAccessToken(payload);

    const refreshToken = readRefreshToken(req);
    if (refreshToken) {
        const refreshTokenHash = hashRefreshToken(refreshToken);
        await prisma.authSession.updateMany({
            where: {
                userId: payload.userId,
                tokenHash: refreshTokenHash,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            }
        });
    }

    clearRefreshCookie(res);

    res.json({ success: true });
};

export const logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
    const payload = req.user;
    if (!payload) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    await revokeAllUserTokens(payload.userId);
    await prisma.authSession.updateMany({
        where: {
            userId: payload.userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        }
    });
    clearRefreshCookie(res);
    res.json({ success: true });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = readRefreshToken(req);
        if (!refreshToken) {
            res.status(400).json({ error: 'refreshToken is required' });
            return;
        }

        const refreshTokenHash = hashRefreshToken(refreshToken);
        const session = await prisma.authSession.findUnique({
            where: { tokenHash: refreshTokenHash },
            include: {
                user: {
                    select: { id: true, email: true, name: true, role: true, avatarUrl: true, title: true, showInGreeting: true }
                }
            }
        });

        if (!session || session.revokedAt || session.expiresAt <= new Date()) {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }

        const nextRefreshToken = issueRefreshToken();
        const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);

        const updated = await prisma.$transaction(async (tx) => {
            await tx.authSession.update({
                where: { id: session.id },
                data: {
                    revokedAt: new Date(),
                    replacedById: nextRefreshTokenHash,
                }
            });

            await tx.authSession.create({
                data: {
                    userId: session.userId,
                    tokenHash: nextRefreshTokenHash,
                    expiresAt: getRefreshTokenExpiry(),
                }
            });

            return session.user;
        });

        const token = issueAccessToken(updated.id, updated.role);
        setRefreshCookie(res, nextRefreshToken);
        res.json({ token, user: updated });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
