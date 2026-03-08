import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { getIO } from '../socketInstance';
import { logEvent } from '../services/eventLogger';
import { triggerWebhook } from '../services/webhookService';

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

        const conversationsWithUnread = await Promise.all(conversations.map(async (conv: any) => {
            const unreadCount = await prisma.message.count({
                where: {
                    conversationId: conv.id,
                    sender: 'VISITOR',
                    isRead: false
                }
            });
            return { ...conv, unreadCount };
        }));

        res.json(conversationsWithUnread);
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
            include: {
                user: { select: { id: true, name: true, avatarUrl: true, title: true } }
            },
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

            // Create service message "OPERATOR_JOIN"
            const joinMessage = await prisma.message.create({
                data: {
                    conversationId: id,
                    sender: 'OPERATOR',
                    senderId: userId,
                    type: 'OPERATOR_JOIN',
                    text: ''
                },
                include: {
                    user: { select: { id: true, name: true, avatarUrl: true, title: true } }
                }
            });

            try {
                const io = getIO();
                io.to(`conversation_${id}`).emit('server_message', joinMessage);
                io.to('operators').emit('new_message', joinMessage);
            } catch (e) {
                console.error('Socket broadcast error (auto-join):', e);
            }
        }

        const message = await prisma.message.create({
            data: {
                conversationId: id,
                text: text || '',
                type: type || 'TEXT',
                attachmentUrl,
                sender: 'OPERATOR',
                senderId: userId
            },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true, title: true } }
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

        // Log event & trigger webhook
        logEvent(conversation.projectId, 'MESSAGE_SENT', {
            messageId: message.id,
            sender: 'OPERATOR',
            userId,
            conversationId: id,
        });
        triggerWebhook(conversation.projectId, 'new_message', {
            message,
            conversationId: id,
        });

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

        // Log events for status changes and operator assignment
        if (status === 'CLOSED') {
            logEvent(conversation.projectId, 'CONVERSATION_CLOSED', { conversationId: id });
            triggerWebhook(conversation.projectId, 'conversation_closed', { conversationId: id });
        } else if (status === 'OPEN') {
            logEvent(conversation.projectId, 'CONVERSATION_REOPENED', { conversationId: id });
        }

        if (operatorId) {
            logEvent(conversation.projectId, 'OPERATOR_ASSIGNED', { conversationId: id, operatorId });
            triggerWebhook(conversation.projectId, 'operator_assigned', { conversationId: id, operatorId });

            // Create service message "OPERATOR_JOIN"
            const joinMessage = await prisma.message.create({
                data: {
                    conversationId: id,
                    sender: 'OPERATOR',
                    senderId: operatorId,
                    type: 'OPERATOR_JOIN',
                    text: ''
                },
                include: {
                    user: { select: { id: true, name: true, avatarUrl: true, title: true } }
                }
            });

            try {
                const io = getIO();
                io.to(`conversation_${id}`).emit('server_message', joinMessage);
                io.to('operators').emit('new_message', joinMessage);
            } catch (e) {
                console.error('Socket broadcast error (join):', e);
            }
        }

        res.json(conversation);
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.message.updateMany({
            where: {
                conversationId: id,
                sender: 'VISITOR',
                isRead: false
            },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

