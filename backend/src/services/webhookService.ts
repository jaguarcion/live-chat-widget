import crypto from 'crypto';
import { prisma } from '../db';

export type WebhookEvent = 'new_message' | 'new_conversation' | 'conversation_closed' | 'operator_assigned';

export const triggerWebhook = async (
    projectId: string,
    event: WebhookEvent,
    payload: Record<string, any>
): Promise<void> => {
    try {
        // Check if webhooks are enabled for this project
        const settings = await prisma.projectSettings.findUnique({
            where: { projectId }
        });

        if (!settings?.webhookEnabled) return;

        const webhooks = await prisma.webhook.findMany({
            where: {
                projectId,
                isActive: true,
            }
        });

        for (const webhook of webhooks) {
            const events = JSON.parse(webhook.events) as string[];
            if (!events.includes(event)) continue;

            const body = JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                projectId,
                data: payload,
            });

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // HMAC signature if secret is set
            if (webhook.secret) {
                const signature = crypto
                    .createHmac('sha256', webhook.secret)
                    .update(body)
                    .digest('hex');
                headers['X-Webhook-Signature'] = `sha256=${signature}`;
            }

            // Fire and forget
            fetch(webhook.url, {
                method: 'POST',
                headers,
                body,
            }).catch(err => {
                console.error(`Webhook delivery failed for ${webhook.url}:`, err.message);
            });
        }
    } catch (error) {
        console.error('Webhook trigger error:', error);
    }
};
