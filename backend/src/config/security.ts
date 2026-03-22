import dotenv from 'dotenv';

dotenv.config();

const getRequiredEnv = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

export const JWT_SECRET = getRequiredEnv('JWT_SECRET');

export const ALLOW_PUBLIC_REGISTRATION = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

const sanitizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const rawMediaBaseUrl = process.env.MEDIA_BASE_URL?.trim() || '';

export const ENFORCE_MEDIA_ORIGIN = process.env.ENFORCE_MEDIA_ORIGIN === 'true' || process.env.NODE_ENV === 'production';

export const MEDIA_BASE_URL = rawMediaBaseUrl ? sanitizeBaseUrl(rawMediaBaseUrl) : null;

if (ENFORCE_MEDIA_ORIGIN && !MEDIA_BASE_URL) {
    throw new Error('Missing required environment variable: MEDIA_BASE_URL (required when ENFORCE_MEDIA_ORIGIN=true or NODE_ENV=production)');
}

export const parseOriginAllowlist = (raw: string | undefined): string[] => {
    if (!raw) return [];
    return raw
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
};
