import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

// GET /api/webhooks/:projectId — list webhooks
export const getWebhooks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        const webhooks = await prisma.webhook.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(webhooks.map(w => ({
            ...w,
            events: JSON.parse(w.events),
        })));
    } catch (error) {
        console.error('Get webhooks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/webhooks/:projectId — create webhook
export const createWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;
        const { url, events = [], secret } = req.body;

        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        const webhook = await prisma.webhook.create({
            data: {
                projectId,
                url,
                events: JSON.stringify(events),
                secret: secret || null,
            }
        });

        res.status(201).json({
            ...webhook,
            events: JSON.parse(webhook.events),
        });
    } catch (error) {
        console.error('Create webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PUT /api/webhooks/:id — update webhook
export const updateWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { url, events, secret, isActive } = req.body;

        const data: any = {};
        if (url !== undefined) data.url = url;
        if (events !== undefined) data.events = JSON.stringify(events);
        if (secret !== undefined) data.secret = secret;
        if (isActive !== undefined) data.isActive = isActive;

        const webhook = await prisma.webhook.update({
            where: { id },
            data,
        });

        res.json({
            ...webhook,
            events: JSON.parse(webhook.events),
        });
    } catch (error) {
        console.error('Update webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE /api/webhooks/:id — delete webhook
export const deleteWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.webhook.delete({ where: { id } });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
