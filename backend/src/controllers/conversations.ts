import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { getIO } from '../socketInstance';

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        // Find all projects this operator belongs to
        const memberships = await prisma.projectMember.findMany({
            where: { userId },
            select: { projectId: true }
        });
        const projectIds = memberships.map(m => m.projectId);

        const conversations = await prisma.conversation.findMany({
            where: { projectId: { in: projectIds } },
            include: {
                visitor: true,
                operator: { select: { id: true, name: true, email: true } },
                project: { select: { id: true, name: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(conversations);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getConversationMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const messages = await prisma.message.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: 'asc' }
        });

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const { text, type, attachmentUrl } = req.body;

        if (!text && !attachmentUrl) { res.status(400).json({ error: 'Text or attachment is required' }); return; }

        // Auto-assign operator if not assigned
        const conversation = await prisma.conversation.findUnique({ where: { id } });
        if (!conversation) { res.status(404).json({ error: 'Conversation not found' }); return; }

        if (!conversation.operatorId) {
            await prisma.conversation.update({
                where: { id },
                data: { operatorId: userId }
            });
        }

        const message = await prisma.message.create({
            data: {
                conversationId: id,
                text: text || '',
                type: type || 'TEXT',
                attachmentUrl,
                sender: 'OPERATOR'
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        // Broadcast via socket to widget and other operators
        try {
            const io = getIO();
            io.to(`conversation_${id}`).emit('server_message', message);
            io.to('operators').emit('new_message', message);
        } catch (e) {
            console.error('Socket broadcast error:', e);
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, operatorId } = req.body;

        const data: any = {};
        if (status) data.status = status;
        if (operatorId) data.operatorId = operatorId;

        const conversation = await prisma.conversation.update({
            where: { id },
            data,
            include: {
                visitor: true,
                operator: { select: { id: true, name: true, email: true } }
            }
        });

        res.json(conversation);
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
