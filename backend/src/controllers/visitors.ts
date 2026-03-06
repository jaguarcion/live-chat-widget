import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

// Update visitor notes
export const updateVisitorNotes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { notes, email, name } = req.body;

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
        const { id } = req.params;

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
