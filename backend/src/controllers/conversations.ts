import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { getIO } from '../socketInstance';
import { logEvent } from '../services/eventLogger';
import { triggerWebhook } from '../services/webhookService';
import { hasConversationAccess, hasProjectAccess } from '../services/accessControl';

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

        // Build optional filters
        const where: any = { projectId: { in: projectIds } };
        if (req.query.status && req.query.status !== 'ALL') where.status = req.query.status;
        if (req.query.operatorId === 'me') where.operatorId = userId;
        else if (req.query.operatorId === 'unassigned') where.operatorId = null;
        if (req.query.isPinned === 'true') where.isPinned = true;

        const conversations = await prisma.conversation.findMany({
            where,
            include: {
                visitor: true,
                operator: { select: { id: true, name: true, email: true } },
                project: { select: { id: true, name: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }]
        });

        const conversationsWithUnread = await Promise.all(conversations.map(async (conv: any) => {
            const unreadCount = await prisma.message.count({
                where: {
                    conversationId: conv.id,
                    sender: 'VISITOR',
                    isRead: false
                }
            });

            const operatorReplyCount = await prisma.message.count({
                where: {
                    conversationId: conv.id,
                    sender: 'OPERATOR',
                    type: { not: 'OPERATOR_JOIN' }
                }
            });

            return { ...conv, unreadCount, operatorReplyCount };
        }));

        res.json(conversationsWithUnread);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getConversationMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const canAccessConversation = await hasConversationAccess(userId, id);
        if (!canAccessConversation) { res.status(403).json({ error: 'Forbidden' }); return; }

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

        const canAccessConversation = await hasConversationAccess(userId, id);
        if (!canAccessConversation) { res.status(403).json({ error: 'Forbidden' }); return; }

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
                io.to(`project_${conversation.projectId}`).emit('conversation_updated', {
                    conversationId: id,
                    operatorId: userId,
                    status: conversation.status,
                });
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
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const { status, operatorId } = req.body;

        const existingConversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                project: { select: { id: true, name: true } },
                visitor: true,
                operator: { select: { id: true, name: true, email: true } }
            }
        });

        if (!existingConversation) { res.status(404).json({ error: 'Conversation not found' }); return; }

        const hasMembership = await hasProjectAccess(userId, existingConversation.projectId);
        if (!hasMembership) { res.status(403).json({ error: 'Forbidden' }); return; }

        const data: any = {};
        if (status) data.status = status;
        if (Object.prototype.hasOwnProperty.call(req.body, 'operatorId')) {
            if (operatorId) {
                const targetHasAccess = await hasProjectAccess(operatorId, existingConversation.projectId);
                if (!targetHasAccess) {
                    res.status(400).json({ error: 'Operator is not a member of this project' });
                    return;
                }
            }
            data.operatorId = operatorId || null;
        }

        const conversation = await prisma.conversation.update({
            where: { id },
            data,
            include: {
                visitor: true,
                operator: { select: { id: true, name: true, email: true } },
                project: { select: { id: true, name: true } }
            }
        });

        // Log events for status changes and operator assignment
        if (status === 'CLOSED') {
            logEvent(conversation.projectId, 'CONVERSATION_CLOSED', { conversationId: id });
            triggerWebhook(conversation.projectId, 'conversation_closed', { conversationId: id });
        } else if (status === 'OPEN') {
            logEvent(conversation.projectId, 'CONVERSATION_REOPENED', { conversationId: id });
        }

        const operatorChanged = Object.prototype.hasOwnProperty.call(req.body, 'operatorId') && operatorId !== existingConversation.operatorId;

        if (operatorChanged && operatorId) {
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

        try {
            const io = getIO();
            io.to(`project_${conversation.projectId}`).emit('conversation_updated', {
                conversationId: id,
                operatorId: conversation.operatorId,
                status: conversation.status,
            });
        } catch (e) {
            console.error('Socket broadcast error (conversation update):', e);
        }

        res.json(conversation);
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const canAccessConversation = await hasConversationAccess(userId, id);
        if (!canAccessConversation) { res.status(403).json({ error: 'Forbidden' }); return; }

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

export const searchConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const q = (req.query.q as string || '').trim();
        if (!q) { res.json({ visitors: [], messages: [] }); return; }
        if (q.length < 2) { res.status(400).json({ error: 'Search query must be at least 2 characters' }); return; }

        const memberships = await prisma.projectMember.findMany({
            where: { userId },
            select: { projectId: true }
        });
        const projectIds = memberships.map((m: { projectId: string }) => m.projectId);

        // Search visitors (by name or email) within accessible projects
        const visitorConversations = await prisma.conversation.findMany({
            where: {
                projectId: { in: projectIds },
                visitor: {
                    OR: [
                        { name: { contains: q } },
                        { email: { contains: q } },
                    ]
                }
            },
            include: {
                visitor: true,
                project: { select: { id: true, name: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 }
            },
            orderBy: { updatedAt: 'desc' },
            take: 30
        });

        // Search messages by text within accessible projects
        const messageHits = await prisma.message.findMany({
            where: {
                text: { contains: q },
                conversation: { projectId: { in: projectIds } }
            },
            include: {
                conversation: {
                    include: {
                        visitor: true,
                        project: { select: { id: true, name: true } },
                        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 30
        });

        res.json({
            visitors: visitorConversations,
            messages: messageHits.map((m: any) => ({
                messageId: m.id,
                text: m.text,
                sender: m.sender,
                createdAt: m.createdAt,
                conversation: m.conversation
            }))
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/conversations/:id/notes — send internal operator note
export const sendNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const { text, mentions } = req.body;

        if (!text?.trim()) { res.status(400).json({ error: 'Note text is required' }); return; }

        const canAccess = await hasConversationAccess(userId, id);
        if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

        const conversation = await prisma.conversation.findUnique({ where: { id }, select: { projectId: true } });
        if (!conversation) { res.status(404).json({ error: 'Conversation not found' }); return; }

        const message = await (prisma.message as any).create({
            data: {
                conversationId: id,
                text: text.trim(),
                type: 'TEXT',
                sender: 'OPERATOR',
                senderId: userId,
                isNote: true,
                mentions: Array.isArray(mentions) && mentions.length ? JSON.stringify(mentions) : null,
            },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true, title: true } }
            }
        });

        const io = getIO();
        io.to(`project_${conversation.projectId}`).emit('operator_note', message);

        if (Array.isArray(mentions)) {
            for (const mentionedUserId of mentions) {
                io.to(`operator_${mentionedUserId}`).emit('operator_mention', {
                    conversationId: id,
                    noteId: message.id,
                    fromUserId: userId,
                    text: text.trim(),
                });
            }
        }

        logEvent(conversation.projectId, 'NOTE_SENT', { messageId: message.id, userId, conversationId: id });
        res.status(201).json(message);
    } catch (error) {
        console.error('Send note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PATCH /api/conversations/:id/pin — toggle pin
export const pinConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const canAccess = await hasConversationAccess(userId, id);
        if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

        const existing = await prisma.conversation.findUnique({ where: { id }, select: { isPinned: true } } as any);
        if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

        const updated = await (prisma.conversation as any).update({
            where: { id },
            data: { isPinned: !(existing as any).isPinned },
            select: { id: true, isPinned: true }
        });

        res.json(updated);
    } catch (error) {
        console.error('Pin conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

