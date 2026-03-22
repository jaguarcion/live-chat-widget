import { NextFunction, Request, Response } from 'express';

type RateLimitOptions = {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
};

type Bucket = {
    timestamps: number[];
};

const getClientIp = (req: Request): string => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
};

export const createRateLimit = (options: RateLimitOptions) => {
    const buckets = new Map<string, Bucket>();

    return (req: Request, res: Response, next: NextFunction): void => {
        const now = Date.now();
        const key = options.keyGenerator ? options.keyGenerator(req) : getClientIp(req);
        const bucket = buckets.get(key) || { timestamps: [] };

        bucket.timestamps = bucket.timestamps.filter(ts => now - ts < options.windowMs);

        if (bucket.timestamps.length >= options.max) {
            const retryAfterSec = Math.ceil(options.windowMs / 1000);
            res.setHeader('Retry-After', retryAfterSec.toString());
            res.status(429).json({
                error: options.message || 'Too many requests',
            });
            return;
        }

        bucket.timestamps.push(now);
        buckets.set(key, bucket);

        next();
    };
};
