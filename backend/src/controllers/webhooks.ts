import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { hasProjectAccess } from '../services/accessControl';
import { isSafeWebhookUrl } from '../services/webhookService';
import { encryptSecret, isSecretEncryptionConfigured } from '../services/secretCrypto';

// GET /api/webhooks/:projectId — list webhooks
export const getWebhooks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;

        const canAccessProject = await hasProjectAccess(userId, projectId);
        if (!canAccessProject) { res.status(403).json({ error: 'Forbidden' }); return; }

        const webhooks = await prisma.webhook.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(webhooks.map(w => ({
            ...w,
            secret: null,
            hasSecret: Boolean(w.secret),
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
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const { url, events = [], secret } = req.body;

        const canAccessProject = await hasProjectAccess(userId, projectId);
        if (!canAccessProject) { res.status(403).json({ error: 'Forbidden' }); return; }

        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        const safeUrl = await isSafeWebhookUrl(url);
        if (!safeUrl) {
            res.status(400).json({ error: 'Webhook URL is not allowed by security policy' });
            return;
        }

        if (secret && !isSecretEncryptionConfigured()) {
            res.status(400).json({ error: 'DATA_ENCRYPTION_KEY is required to store webhook secret securely' });
            return;
        }

        const webhook = await prisma.webhook.create({
            data: {
                projectId,
                url,
                events: JSON.stringify(events),
                secret: secret ? encryptSecret(secret) : null,
            }
        });

        res.status(201).json({
            ...webhook,
            secret: null,
            hasSecret: Boolean(webhook.secret),
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
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;
        const { url, events, secret, isActive } = req.body;

        const existing = await prisma.webhook.findUnique({
            where: { id },
            select: { projectId: true }
        });

        if (!existing) {
            res.status(404).json({ error: 'Webhook not found' });
            return;
        }

        const canAccessProject = await hasProjectAccess(userId, existing.projectId);
        if (!canAccessProject) { res.status(403).json({ error: 'Forbidden' }); return; }

        const data: any = {};
        if (url !== undefined) {
            const safeUrl = await isSafeWebhookUrl(url);
            if (!safeUrl) {
                res.status(400).json({ error: 'Webhook URL is not allowed by security policy' });
                return;
            }

            data.url = url;
        }
        if (events !== undefined) data.events = JSON.stringify(events);
        if (secret !== undefined) {
            if (secret) {
                if (!isSecretEncryptionConfigured()) {
                    res.status(400).json({ error: 'DATA_ENCRYPTION_KEY is required to store webhook secret securely' });
                    return;
                }
                data.secret = encryptSecret(secret);
            } else {
                data.secret = null;
            }
        }
        if (isActive !== undefined) data.isActive = isActive;

        const webhook = await prisma.webhook.update({
            where: { id },
            data,
        });

        res.json({
            ...webhook,
            secret: null,
            hasSecret: Boolean(webhook.secret),
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
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { id } = req.params;

        const existing = await prisma.webhook.findUnique({
            where: { id },
            select: { projectId: true }
        });

        if (!existing) {
            res.status(404).json({ error: 'Webhook not found' });
            return;
        }

        const canAccessProject = await hasProjectAccess(userId, existing.projectId);
        if (!canAccessProject) { res.status(403).json({ error: 'Forbidden' }); return; }

        await prisma.webhook.delete({ where: { id } });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
