import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/security';
import { prisma } from '../db';

export interface AuthTokenPayload {
    type: 'auth';
    userId: string;
    role: string;
    jti: string;
    iat?: number;
    exp?: number;
}

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';

const revokedTokenJti = new Map<string, number>();
const revokeAllBeforeByUser = new Map<string, number>();

const hashJti = (jti: string): string => crypto.createHash('sha256').update(jti).digest('hex');

const cleanupExpiredRevocations = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of revokedTokenJti.entries()) {
        if (exp <= nowSec) {
            revokedTokenJti.delete(jti);
        }
    }
};

export const issueAccessToken = (userId: string, role: string): string => {
    return jwt.sign(
        {
            type: 'auth',
            userId,
            role,
            jti: crypto.randomUUID(),
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
};

export const revokeAccessToken = async (payload: AuthTokenPayload): Promise<void> => {
    cleanupExpiredRevocations();
    if (!payload.jti) return;

    const exp = payload.exp || Math.floor(Date.now() / 1000) + 60 * 60;
    revokedTokenJti.set(payload.jti, exp);

    await prisma.accessTokenRevocation.upsert({
        where: {
            tokenJtiHash: hashJti(payload.jti),
        },
        create: {
            userId: payload.userId,
            tokenJtiHash: hashJti(payload.jti),
            expiresAt: new Date(exp * 1000),
        },
        update: {
            expiresAt: new Date(exp * 1000),
        }
    });
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
    const nowSec = Math.floor(Date.now() / 1000);
    revokeAllBeforeByUser.set(userId, nowSec);

    await prisma.userTokenRevocation.upsert({
        where: { userId },
        create: {
            userId,
            revokeBefore: new Date(nowSec * 1000),
        },
        update: {
            revokeBefore: new Date(nowSec * 1000),
        }
    });
};

const isTokenRevokedInMemory = (payload: AuthTokenPayload): boolean => {
    cleanupExpiredRevocations();

    const revokedUntil = revokeAllBeforeByUser.get(payload.userId);
    if (revokedUntil && payload.iat && payload.iat <= revokedUntil) {
        return true;
    }

    if (!payload.jti) return true;
    return revokedTokenJti.has(payload.jti);
};

const isTokenRevokedInDatabase = async (payload: AuthTokenPayload): Promise<boolean> => {
    const iatSec = payload.iat || 0;
    const now = new Date();

    const [tokenRevoke, userRevoke] = await Promise.all([
        prisma.accessTokenRevocation.findUnique({
            where: { tokenJtiHash: hashJti(payload.jti) },
            select: { expiresAt: true }
        }),
        prisma.userTokenRevocation.findUnique({
            where: { userId: payload.userId },
            select: { revokeBefore: true }
        })
    ]);

    if (tokenRevoke && tokenRevoke.expiresAt > now) {
        const expSec = Math.floor(tokenRevoke.expiresAt.getTime() / 1000);
        revokedTokenJti.set(payload.jti, expSec);
        return true;
    }

    if (userRevoke) {
        const revokeBeforeSec = Math.floor(userRevoke.revokeBefore.getTime() / 1000);
        revokeAllBeforeByUser.set(payload.userId, revokeBeforeSec);
        if (iatSec <= revokeBeforeSec) {
            return true;
        }
    }

    return false;
};

export const verifyAccessToken = async (token: string): Promise<AuthTokenPayload | null> => {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as Partial<AuthTokenPayload>;
        if (payload.type !== 'auth' || !payload.userId || !payload.role || !payload.jti) {
            return null;
        }

        const typedPayload = payload as AuthTokenPayload;
        if (isTokenRevokedInMemory(typedPayload)) {
            return null;
        }

        if (await isTokenRevokedInDatabase(typedPayload)) {
            return null;
        }

        return typedPayload;
    } catch {
        return null;
    }
};
