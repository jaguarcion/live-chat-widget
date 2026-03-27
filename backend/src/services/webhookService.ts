import crypto from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { prisma } from '../db';
import { decryptSecret } from './secretCrypto';

export type WebhookEvent = 'new_message' | 'new_conversation' | 'conversation_closed' | 'operator_assigned' | 'operator_unassigned';

const isPrivateIpv4 = (ip: string): boolean => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) return true;

    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;

    return false;
};

const isPrivateIpv6 = (ip: string): boolean => {
    const normalized = ip.toLowerCase();

    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:')) return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('::ffff:')) {
        const mapped = normalized.slice('::ffff:'.length);
        if (isIP(mapped) === 4) {
            return isPrivateIpv4(mapped);
        }
        return true;
    }

    return false;
};

const isBlockedIp = (ip: string): boolean => {
    const version = isIP(ip);
    if (version === 4) return isPrivateIpv4(ip);
    if (version === 6) return isPrivateIpv6(ip);
    return true;
};

export const isSafeWebhookUrl = async (rawUrl: string): Promise<boolean> => {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return false;
    }

    if (url.protocol !== 'https:') return false;
    if (!url.hostname) return false;

    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
        return false;
    }

    const ipVersion = isIP(hostname);
    if (ipVersion !== 0) {
        return !isBlockedIp(hostname);
    }

    try {
        const resolved = await lookup(hostname, { all: true, verbatim: true });
        if (!resolved.length) return false;
        return resolved.every(addr => !isBlockedIp(addr.address));
    } catch {
        return false;
    }
};

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

            const safeUrl = await isSafeWebhookUrl(webhook.url);
            if (!safeUrl) {
                console.error(`Webhook blocked by SSRF policy: ${webhook.url}`);
                continue;
            }

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
                const secret = decryptSecret(webhook.secret);
                if (!secret) {
                    console.error(`Webhook signature skipped: secret decryption failed for ${webhook.url}`);
                    continue;
                }

                const signature = crypto
                    .createHmac('sha256', secret)
                    .update(body)
                    .digest('hex');
                headers['X-Webhook-Signature'] = `sha256=${signature}`;
            }

            // Fire and forget
            fetch(webhook.url, {
                method: 'POST',
                headers,
                body,
                signal: AbortSignal.timeout(5000),
            }).catch(err => {
                console.error(`Webhook delivery failed for ${webhook.url}:`, err.message);
            });
        }
    } catch (error) {
        console.error('Webhook trigger error:', error);
    }
};
