import { Request, Response } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';

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
                }
            });
        } else {
            // Update metadata on connection
            visitor = await prisma.visitor.update({
                where: { id: visitor.id },
                data: {
                    referrer: metadata?.referrer || visitor.referrer,
                    device: metadata?.device || visitor.device,
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

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    projectId,
                    visitorId: visitor.id,
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
            orderBy: { createdAt: 'asc' }
        });

        res.json(messages);
    } catch (error) {
        console.error('Widget history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
