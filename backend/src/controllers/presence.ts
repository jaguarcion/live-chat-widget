import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

// GET /api/presence/:projectId — list online operators for a project
export const getProjectPresence = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        const presences = await prisma.operatorPresence.findMany({
            where: { projectId, isOnline: true },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true, title: true, showInGreeting: true } }
            }
        });

        res.json(presences);
    } catch (error) {
        console.error('Get presence error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
