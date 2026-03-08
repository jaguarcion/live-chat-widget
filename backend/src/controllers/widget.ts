import { Request, Response } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { logEvent } from '../services/eventLogger';
import { triggerWebhook } from '../services/webhookService';
import { getIO } from '../socketInstance';

export const initWidget = async (req: Request, res: Response): Promise<void> => {
    try {
        const { projectId, visitorId: existingVisitorId, metadata } = req.body;

        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Parse UTM data if provided
        const utmData = metadata?.utm ? JSON.stringify(metadata.utm) : null;

        let visitor;
        if (existingVisitorId) {
            // Try to find existing visitor
            visitor = await prisma.visitor.findUnique({
                where: { id: existingVisitorId }
            });
        }

        // If no visitor found or no ID provided, create a new one
        if (!visitor) {
            visitor = await prisma.visitor.create({
                data: {
                    id: existingVisitorId || uuidv4(),
                    referrer: metadata?.referrer,
                    device: metadata?.device,
                    country: metadata?.country || null,
                    utmData,
                }
            });
        } else {
            // Update metadata on connection
            visitor = await prisma.visitor.update({
                where: { id: visitor.id },
                data: {
                    referrer: metadata?.referrer || visitor.referrer,
                    device: metadata?.device || visitor.device,
                    utmData: utmData || visitor.utmData,
                }
            });
        }

        // Find or create an open conversation for this visitor in this project
        let conversation = await prisma.conversation.findFirst({
            where: {
                projectId,
                visitorId: visitor.id,
                status: 'OPEN'
            }
        });

        let isNewConversation = false;
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    projectId,
                    visitorId: visitor.id,
                }
            });
            isNewConversation = true;

            // Log event & trigger webhook for new conversation
            logEvent(projectId, 'CONVERSATION_CREATED', {
                conversationId: conversation.id,
                visitorId: visitor.id,
            });
            triggerWebhook(projectId, 'new_conversation', {
                conversationId: conversation.id,
                visitorId: visitor.id,
            });
        }

        // Track page view
        if (metadata?.url) {
            await prisma.pageView.create({
                data: {
                    visitorId: visitor.id,
                    url: metadata.url,
                    title: metadata.title || null,
                }
            });
        }

        const settings = await prisma.projectSettings.findUnique({
            where: { projectId }
        });

        res.json({
            project: { id: project.id, name: project.name },
            visitor: { id: visitor.id },
            conversation: { id: conversation.id },
            settings: settings ? {
                ...settings,
                businessHours: JSON.parse(settings.businessHours)
            } : null
        });
    } catch (error) {
        console.error('Widget init error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId } = req.params;

        if (!conversationId) {
            res.status(400).json({ error: 'Conversation ID is required' });
            return;
        }

        const messages = await prisma.message.findMany({
            where: { conversationId },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true, title: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json(messages);
    } catch (error) {
        console.error('Widget history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/widget/message — REST fallback for sending visitor messages
export const sendWidgetMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { conversationId, text, type, attachmentUrl } = req.body;

        if (!conversationId) {
            res.status(400).json({ error: 'conversationId is required' });
            return;
        }

        if (!text && !attachmentUrl) {
            res.status(400).json({ error: 'text or attachmentUrl is required' });
            return;
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { projectId: true }
        });

        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const message = await prisma.message.create({
            data: {
                conversationId,
                text: text || '',
                type: type || 'TEXT',
                attachmentUrl,
                sender: 'VISITOR'
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        // Broadcast via socket
        try {
            const io = getIO();
            io.to(`conversation_${conversationId}`).emit('server_message', message);
            if (conversation.projectId) {
                io.to(`project_${conversation.projectId}`).emit('new_message', message);
            }
        } catch (e) {
            console.error('Socket broadcast error:', e);
        }

        // Log event & trigger webhook
        logEvent(conversation.projectId, 'MESSAGE_SENT', {
            messageId: message.id,
            sender: 'VISITOR',
            conversationId,
        });
        triggerWebhook(conversation.projectId, 'new_message', {
            message,
            conversationId,
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Widget message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
