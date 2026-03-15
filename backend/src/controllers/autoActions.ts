import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { AutoActionRule, getProjectAutoActions, saveProjectAutoActions } from '../services/autoActions';

type AutoActionPrisma = typeof prisma & {
    autoActionTrigger: any;
};

const db = prisma as AutoActionPrisma;

function sanitizeRules(input: any): AutoActionRule[] {
    if (!Array.isArray(input)) return [];

    return input
        .map((rule: any) => ({
            id: String(rule.id || ''),
            name: String(rule.name || 'Автодействие').slice(0, 80),
            isActive: Boolean(rule.isActive),
            urlContains: String(rule.urlContains || '/').slice(0, 250),
            referrerContains: String(rule.referrerContains || '').slice(0, 250),
            deviceContains: String(rule.deviceContains || '').slice(0, 250),
            utmSource: String(rule.utmSource || '').slice(0, 120),
            utmMedium: String(rule.utmMedium || '').slice(0, 120),
            utmCampaign: String(rule.utmCampaign || '').slice(0, 120),
            utmTerm: String(rule.utmTerm || '').slice(0, 120),
            delaySeconds: Math.max(0, Math.min(120, Number(rule.delaySeconds || 0))),
            cooldownMinutes: Math.max(1, Math.min(1440, Number(rule.cooldownMinutes || 30))),
            oncePerConversation: Boolean(rule.oncePerConversation),
            maxTriggersPerConversation: Math.max(1, Math.min(20, Number(rule.maxTriggersPerConversation || 3))),
            maxTriggersPerSession: Math.max(1, Math.min(20, Number(rule.maxTriggersPerSession || 2))),
            message: String(rule.message || '').trim().slice(0, 1000),
        }))
        .filter((rule: AutoActionRule) => !!rule.id && !!rule.message);
}

async function ensureMembership(userId: string, projectId: string) {
    return prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { userId: true }
    });
}

export const getAutoActions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { projectId } = req.params;

        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
        if (!projectId) { res.status(400).json({ error: 'Project ID is required' }); return; }

        const membership = await ensureMembership(userId, projectId);
        if (!membership) { res.status(403).json({ error: 'Forbidden' }); return; }

        const rules = await getProjectAutoActions(projectId);
        res.json({ rules });
    } catch (error) {
        console.error('Get auto actions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateAutoActions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { projectId } = req.params;

        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
        if (!projectId) { res.status(400).json({ error: 'Project ID is required' }); return; }

        const membership = await ensureMembership(userId, projectId);
        if (!membership) { res.status(403).json({ error: 'Forbidden' }); return; }

        const rules = sanitizeRules(req.body?.rules);
        await saveProjectAutoActions(projectId, rules, userId);

        res.json({ success: true, rules });
    } catch (error) {
        console.error('Update auto actions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAutoActionTriggers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { projectId } = req.params;
        const limitRaw = Number(req.query.limit || 200);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 200;
        const ruleIdFilter = req.query.ruleId ? String(req.query.ruleId) : '';
        const repliedFilter = req.query.replied ? String(req.query.replied) : 'all';
        const fromFilter = req.query.from ? new Date(String(req.query.from)) : null;
        const toFilter = req.query.to ? new Date(String(req.query.to)) : null;
        const format = req.query.format ? String(req.query.format).toLowerCase() : 'json';

        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
        if (!projectId) { res.status(400).json({ error: 'Project ID is required' }); return; }

        const membership = await ensureMembership(userId, projectId);
        if (!membership) { res.status(403).json({ error: 'Forbidden' }); return; }

        const rules = await getProjectAutoActions(projectId);
        const ruleNameMap = new Map(rules.map(rule => [rule.id, rule.name]));

        const where: any = { projectId };
        if (ruleIdFilter) where.ruleId = ruleIdFilter;
        if (repliedFilter === 'true') where.replied = true;
        if (repliedFilter === 'false') where.replied = false;
        if (fromFilter || toFilter) {
            where.createdAt = {};
            if (fromFilter && !Number.isNaN(fromFilter.getTime())) where.createdAt.gte = fromFilter;
            if (toFilter && !Number.isNaN(toFilter.getTime())) where.createdAt.lte = toFilter;
        }

        const triggerRows = await db.autoActionTrigger.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                createdAt: true,
                ruleId: true,
                conversationId: true,
                visitorId: true,
                messageId: true,
                url: true,
                replied: true,
                replyMessageId: true,
                replyAt: true,
            }
        });

        const triggers = triggerRows.map((trigger: {
            id: string;
            createdAt: Date;
            ruleId: string;
            conversationId: string;
            visitorId: string;
            messageId: string | null;
            url: string | null;
            replied: boolean;
            replyMessageId: string | null;
            replyAt: Date | null;
        }) => ({
            id: trigger.id,
            createdAt: trigger.createdAt,
            ruleId: trigger.ruleId,
            ruleName: ruleNameMap.get(trigger.ruleId) || trigger.ruleId || 'Неизвестное правило',
            conversationId: trigger.conversationId,
            visitorId: trigger.visitorId,
            messageId: trigger.messageId,
            url: trigger.url,
            replied: trigger.replied,
            replyMessageId: trigger.replyMessageId,
            replyAt: trigger.replyAt,
        }));

        if (format === 'csv') {
            const escapeCsv = (value: unknown) => {
                const str = String(value ?? '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const headers = ['id', 'createdAt', 'ruleId', 'ruleName', 'conversationId', 'visitorId', 'messageId', 'url', 'replied', 'replyAt'];
            const lines = [headers.join(',')];

            for (const trigger of triggers) {
                lines.push([
                    trigger.id,
                    trigger.createdAt,
                    trigger.ruleId,
                    trigger.ruleName,
                    trigger.conversationId,
                    trigger.visitorId,
                    trigger.messageId,
                    trigger.url,
                    trigger.replied,
                    trigger.replyAt,
                ].map(escapeCsv).join(','));
            }

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="auto-action-triggers-${projectId}.csv"`);
            res.status(200).send(lines.join('\n'));
            return;
        }

        res.json({ triggers });
    } catch (error) {
        console.error('Get auto action triggers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
