import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware to restrict access based on user role.
 * Checks the global user role (from JWT).
 * Usage: router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), handler)
 */
export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: insufficient permissions' });
            return;
        }

        next();
    };
};
