import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token as string, JWT_SECRET) as { userId: string; role: string };
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
