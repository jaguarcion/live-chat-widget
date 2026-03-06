import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

// Get quick replies for a project
export const getQuickReplies = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        const replies = await prisma.quickReply.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' }
        });

        res.json(replies);
    } catch (error) {
        console.error('Get quick replies error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a quick reply
export const createQuickReply = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;
        const { title, text, shortcut } = req.body;

        if (!title || !text) {
            res.status(400).json({ error: 'Title and text are required' });
            return;
        }

        const reply = await prisma.quickReply.create({
            data: { projectId, title, text, shortcut: shortcut || null }
        });

        res.status(201).json(reply);
    } catch (error) {
        console.error('Create quick reply error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update a quick reply
export const updateQuickReply = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, text, shortcut } = req.body;

        const reply = await prisma.quickReply.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(text !== undefined && { text }),
                ...(shortcut !== undefined && { shortcut }),
            }
        });

        res.json(reply);
    } catch (error) {
        console.error('Update quick reply error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a quick reply
export const deleteQuickReply = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.quickReply.delete({ where: { id } });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete quick reply error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
