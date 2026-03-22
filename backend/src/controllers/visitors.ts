import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { hasVisitorAccess } from '../services/accessControl';

// Update visitor notes
export const updateVisitorNotes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const { notes, email, name } = req.body;

        const canAccessVisitor = await hasVisitorAccess(userId, id);
        if (!canAccessVisitor) { res.status(403).json({ error: 'Forbidden' }); return; }

        const data: any = {};
        if (notes !== undefined) data.notes = notes;
        if (email !== undefined) data.email = email;
        if (name !== undefined) data.name = name;

        const visitor = await prisma.visitor.update({
            where: { id },
            data
        });

        res.json(visitor);
    } catch (error) {
        console.error('Update visitor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get visitor by ID
export const getVisitor = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const canAccessVisitor = await hasVisitorAccess(userId, id);
        if (!canAccessVisitor) { res.status(403).json({ error: 'Forbidden' }); return; }

        const visitor = await prisma.visitor.findUnique({
            where: { id },
            include: {
                conversations: {
                    orderBy: { updatedAt: 'desc' },
                    take: 10,
                    include: {
                        project: { select: { id: true, name: true } },
                        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
                    }
                }
            }
        });

        if (!visitor) {
            res.status(404).json({ error: 'Visitor not found' });
            return;
        }

        res.json(visitor);
    } catch (error) {
        console.error('Get visitor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get visitor's recent page views
export const getVisitorPages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const canAccessVisitor = await hasVisitorAccess(userId, id);
        if (!canAccessVisitor) { res.status(403).json({ error: 'Forbidden' }); return; }

        const pages = await prisma.pageView.findMany({
            where: { visitorId: id },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        res.json(pages);
    } catch (error) {
        console.error('Get visitor pages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
