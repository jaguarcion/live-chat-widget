import crypto from 'crypto';

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

export const issueRefreshToken = (): string => {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
};

export const hashRefreshToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const getRefreshTokenExpiry = (): Date => {
    const now = Date.now();
    return new Date(now + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
};
