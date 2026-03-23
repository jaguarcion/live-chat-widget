import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { hasProjectAccess } from '../services/accessControl';
import { getLiveVisitors } from '../services/liveVisitors';

const parseDateParam = (val: unknown, fallbackDaysAgo = 30): Date => {
    if (typeof val === 'string' && val) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
    }
    const d = new Date();
    d.setDate(d.getDate() - fallbackDaysAgo);
    return d;
};

// GET /api/analytics/:projectId/overview
export const getAnalyticsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const canAccess = await hasProjectAccess(userId, projectId);
        if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

        const fromDate = parseDateParam(req.query.from);
        const toDate = parseDateParam(req.query.to, 0);

        const [totalConversations, closedConversations, conversations, operatorMessages] = await Promise.all([
            prisma.conversation.count({ where: { projectId, createdAt: { gte: fromDate, lte: toDate } } }),
            prisma.conversation.count({ where: { projectId, status: 'CLOSED', updatedAt: { gte: fromDate, lte: toDate } } }),
            prisma.conversation.findMany({
                where: { projectId, createdAt: { gte: fromDate, lte: toDate } },
                select: { id: true, createdAt: true },
            }),
            prisma.message.findMany({
                where: {
                    conversation: { projectId },
                    sender: 'OPERATOR',
                    type: { not: 'OPERATOR_JOIN' },
                    createdAt: { gte: fromDate, lte: toDate },
                },
                select: { conversationId: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        const firstReplyMap = new Map<string, Date>();
        for (const msg of operatorMessages) {
            if (!firstReplyMap.has(msg.conversationId)) {
                firstReplyMap.set(msg.conversationId, msg.createdAt);
            }
        }

        let totalResponseMs = 0;
        let responseCount = 0;
        for (const conv of conversations) {
            const firstReply = firstReplyMap.get(conv.id);
            if (firstReply) {
                totalResponseMs += firstReply.getTime() - conv.createdAt.getTime();
                responseCount++;
            }
        }

        const avgFirstResponseSec = responseCount > 0 ? Math.round(totalResponseMs / responseCount / 1000) : null;

        res.json({
            totalConversations,
            closedConversations,
            openConversations: totalConversations - closedConversations,
            repliedConversations: responseCount,
            avgFirstResponseSec,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/analytics/:projectId/operators
export const getAnalyticsOperators = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const canAccess = await hasProjectAccess(userId, projectId);
        if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

        const fromDate = parseDateParam(req.query.from);
        const toDate = parseDateParam(req.query.to, 0);

        const [conversations, operatorMessages] = await Promise.all([
            prisma.conversation.findMany({
                where: { projectId, createdAt: { gte: fromDate, lte: toDate }, operatorId: { not: null } },
                select: { id: true, createdAt: true, operatorId: true, operator: { select: { id: true, name: true, avatarUrl: true } } },
            }),
            prisma.message.findMany({
                where: {
                    conversation: { projectId },
                    sender: 'OPERATOR',
                    type: { not: 'OPERATOR_JOIN' },
                    createdAt: { gte: fromDate, lte: toDate },
                },
                select: { conversationId: true, senderId: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        const statsMap = new Map<string, {
            operator: any;
            chatCount: number;
            messageCount: number;
            totalResponseMs: number;
            responseCount: number;
        }>();

        for (const conv of conversations) {
            if (!conv.operatorId) continue;
            if (!statsMap.has(conv.operatorId)) {
                statsMap.set(conv.operatorId, {
                    operator: conv.operator,
                    chatCount: 0,
                    messageCount: 0,
                    totalResponseMs: 0,
                    responseCount: 0,
                });
            }
            statsMap.get(conv.operatorId)!.chatCount++;
        }

        const convStartMap = new Map(conversations.map(c => [c.id, c.createdAt]));
        const firstReplyMap = new Map<string, { time: Date; senderId: string }>();

        for (const msg of operatorMessages) {
            if (msg.senderId) {
                if (!firstReplyMap.has(msg.conversationId)) {
                    firstReplyMap.set(msg.conversationId, { time: msg.createdAt, senderId: msg.senderId });
                }
                if (!statsMap.has(msg.senderId)) {
                    statsMap.set(msg.senderId, { operator: null, chatCount: 0, messageCount: 0, totalResponseMs: 0, responseCount: 0 });
                }
                statsMap.get(msg.senderId)!.messageCount++;
            }
        }

        for (const [convId, { time, senderId }] of firstReplyMap) {
            const start = convStartMap.get(convId);
            if (start && statsMap.has(senderId)) {
                const s = statsMap.get(senderId)!;
                s.totalResponseMs += time.getTime() - start.getTime();
                s.responseCount++;
            }
        }

        const result = Array.from(statsMap.values()).map(s => ({
            operator: s.operator,
            chatCount: s.chatCount,
            messageCount: s.messageCount,
            avgFirstResponseSec: s.responseCount > 0 ? Math.round(s.totalResponseMs / s.responseCount / 1000) : null,
        }));

        res.json(result);
    } catch (error) {
        console.error('Analytics operators error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/analytics/:projectId/daily
export const getAnalyticsDailyChart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const canAccess = await hasProjectAccess(userId, projectId);
        if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

        const fromDate = parseDateParam(req.query.from);
        const toDate = parseDateParam(req.query.to, 0);

        const conversations = await prisma.conversation.findMany({
            where: { projectId, createdAt: { gte: fromDate, lte: toDate } },
            select: { createdAt: true, status: true, updatedAt: true },
        });

        const dayMap = new Map<string, { created: number; closed: number }>();
        for (const conv of conversations) {
            const day = conv.createdAt.toISOString().slice(0, 10);
            if (!dayMap.has(day)) dayMap.set(day, { created: 0, closed: 0 });
            dayMap.get(day)!.created++;
            if (conv.status === 'CLOSED') {
                const closedDay = conv.updatedAt.toISOString().slice(0, 10);
                if (!dayMap.has(closedDay)) dayMap.set(closedDay, { created: 0, closed: 0 });
                dayMap.get(closedDay)!.closed++;
            }
        }

        const days = Array.from(dayMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({ date, ...data }));

        res.json(days);
    } catch (error) {
        console.error('Analytics daily chart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/analytics/:projectId/export
export const exportConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const canAccess = await hasProjectAccess(userId, projectId);
        if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

        const fromDate = parseDateParam(req.query.from);
        const toDate = parseDateParam(req.query.to, 0);
        const format = (req.query.format as string) || 'json';
        const status = req.query.status as string | undefined;

        const where: any = { projectId, createdAt: { gte: fromDate, lte: toDate } };
        if (status && status !== 'ALL') where.status = status;

        const conversations = await prisma.conversation.findMany({
            where,
            include: {
                visitor: { select: { id: true, name: true, email: true, country: true, device: true } },
                operator: { select: { id: true, name: true, email: true } },
                messages: {
                    where: { isNote: false } as any,
                    orderBy: { createdAt: 'asc' },
                    select: { id: true, sender: true, text: true, type: true, createdAt: true, attachmentUrl: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (format === 'csv') {
            const rows: string[][] = [
                ['ID', 'Status', 'Created', 'Updated', 'Visitor Name', 'Visitor Email', 'Country', 'Operator', 'Message Count'],
            ];
            for (const conv of conversations) {
                rows.push([
                    conv.id,
                    conv.status,
                    conv.createdAt.toISOString(),
                    conv.updatedAt.toISOString(),
                    conv.visitor?.name || '',
                    conv.visitor?.email || '',
                    conv.visitor?.country || '',
                    conv.operator?.name || '',
                    String(conv.messages.length),
                ]);
            }
            const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="conversations-${projectId}.csv"`);
            res.send(csv);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="conversations-${projectId}.json"`);
            res.json(conversations);
        }
    } catch (error) {
        console.error('Export conversations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/analytics/:projectId/live-visitors
export const getLiveVisitorsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const canAccess = await hasProjectAccess(userId, projectId);
        if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

        res.json(getLiveVisitors(projectId));
    } catch (error) {
        console.error('Live visitors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
