import { Request, Response, NextFunction } from 'express';
import { AuthTokenPayload, verifyAccessToken } from '../services/authToken';

export interface AuthRequest extends Request {
    user?: AuthTokenPayload;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const token = authHeader.split(' ')[1];

    const payload = await verifyAccessToken(token as string);
    if (!payload) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    req.user = payload;
    next();
};
