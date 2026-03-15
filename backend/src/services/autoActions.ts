import { Server } from 'socket.io';
import { prisma } from '../db';

type AutoActionPrisma = typeof prisma & {
    autoActionRule: any;
    autoActionTrigger: any;
};

const db = prisma as AutoActionPrisma;

export interface AutoActionRule {
    id: string;
    name: string;
    isActive: boolean;
    urlContains: string;
    referrerContains: string;
    deviceContains: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmTerm: string;
    delaySeconds: number;
    cooldownMinutes: number;
    oncePerConversation: boolean;
    maxTriggersPerConversation: number;
    maxTriggersPerSession: number;
    message: string;
}

interface TriggerParams {
    projectId: string;
    conversationId: string;
    visitorId: string;
    url: string;
    sessionId?: string;
    io: Server;
}

const DEFAULT_RULES: AutoActionRule[] = [];
const scheduledTimers = new Map<string, NodeJS.Timeout>();

function normalizeRule(rule: any): AutoActionRule {
    return {
        id: String(rule.id || ''),
        name: String(rule.name || 'Автодействие'),
        isActive: Boolean(rule.isActive),
        urlContains: String(rule.urlContains || '/'),
        referrerContains: String(rule.referrerContains || ''),
        deviceContains: String(rule.deviceContains || ''),
        utmSource: String(rule.utmSource || ''),
        utmMedium: String(rule.utmMedium || ''),
        utmCampaign: String(rule.utmCampaign || ''),
        utmTerm: String(rule.utmTerm || ''),
        delaySeconds: Math.max(0, Number(rule.delaySeconds || 0)),
        cooldownMinutes: Math.max(1, Number(rule.cooldownMinutes || 30)),
        oncePerConversation: Boolean(rule.oncePerConversation),
        maxTriggersPerConversation: Math.max(1, Math.min(20, Number(rule.maxTriggersPerConversation || 3))),
        maxTriggersPerSession: Math.max(1, Math.min(20, Number(rule.maxTriggersPerSession || 2))),
        message: String(rule.message || '').trim(),
    };
}

function parseRulesFromLegacyPayload(payload: string | null): AutoActionRule[] {
    if (!payload) return DEFAULT_RULES;

    try {
        const parsed = JSON.parse(payload);
        if (!Array.isArray(parsed.rules)) return DEFAULT_RULES;

        return parsed.rules
            .map(normalizeRule)
            .filter((rule: AutoActionRule) => !!rule.id && !!rule.message);
    } catch {
        return DEFAULT_RULES;
    }
}

export async function getProjectAutoActions(projectId: string): Promise<AutoActionRule[]> {
    const rules = await db.autoActionRule.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' }
    });

    if (rules.length > 0) {
        return rules.map(normalizeRule);
    }

    // Backward compatibility: bootstrap from old Event-based storage if present.
    const legacyConfig = await prisma.event.findFirst({
        where: { projectId, type: 'AUTO_ACTION_RULES_UPDATED' },
        orderBy: { createdAt: 'desc' },
        select: { payload: true }
    });

    const legacyRules = parseRulesFromLegacyPayload(legacyConfig?.payload || null);
    if (!legacyRules.length) return DEFAULT_RULES;

    await saveProjectAutoActions(projectId, legacyRules, 'legacy-import');
    return legacyRules;
}

export async function saveProjectAutoActions(projectId: string, rules: AutoActionRule[], userId: string): Promise<void> {
    const normalizedRules = rules
        .map(normalizeRule)
        .filter(rule => !!rule.id && !!rule.message);

    await prisma.$transaction(async tx => {
        const txAuto = tx as AutoActionPrisma;

        const existing = await txAuto.autoActionRule.findMany({
            where: { projectId },
            select: { id: true }
        });

        const incomingIds = new Set(normalizedRules.map(rule => rule.id));
        const toDelete = existing
            .map((item: { id: string }) => item.id)
            .filter((id: string) => !incomingIds.has(id));

        if (toDelete.length > 0) {
            await txAuto.autoActionRule.deleteMany({
                where: {
                    projectId,
                    id: { in: toDelete }
                }
            });
        }

        for (const rule of normalizedRules) {
            await txAuto.autoActionRule.upsert({
                where: {
                    projectId_id: {
                        projectId,
                        id: rule.id,
                    }
                },
                create: {
                    projectId,
                    id: rule.id,
                    name: rule.name,
                    isActive: rule.isActive,
                    urlContains: rule.urlContains,
                    referrerContains: rule.referrerContains,
                    deviceContains: rule.deviceContains,
                    utmSource: rule.utmSource,
                    utmMedium: rule.utmMedium,
                    utmCampaign: rule.utmCampaign,
                    utmTerm: rule.utmTerm,
                    delaySeconds: rule.delaySeconds,
                    cooldownMinutes: rule.cooldownMinutes,
                    oncePerConversation: rule.oncePerConversation,
                    maxTriggersPerConversation: rule.maxTriggersPerConversation,
                    maxTriggersPerSession: rule.maxTriggersPerSession,
                    message: rule.message,
                },
                update: {
                    name: rule.name,
                    isActive: rule.isActive,
                    urlContains: rule.urlContains,
                    referrerContains: rule.referrerContains,
                    deviceContains: rule.deviceContains,
                    utmSource: rule.utmSource,
                    utmMedium: rule.utmMedium,
                    utmCampaign: rule.utmCampaign,
                    utmTerm: rule.utmTerm,
                    delaySeconds: rule.delaySeconds,
                    cooldownMinutes: rule.cooldownMinutes,
                    oncePerConversation: rule.oncePerConversation,
                    maxTriggersPerConversation: rule.maxTriggersPerConversation,
                    maxTriggersPerSession: rule.maxTriggersPerSession,
                    message: rule.message,
                }
            });
        }

        await tx.event.create({
            data: {
                projectId,
                type: 'AUTO_ACTION_RULES_UPDATED',
                payload: JSON.stringify({
                    rules: normalizedRules,
                    updatedBy: userId,
                    updatedAt: new Date().toISOString(),
                })
            }
        });
    });
}

function ruleMatchesUrl(rule: AutoActionRule, url: string): boolean {
    const needle = rule.urlContains.trim();
    if (!needle || needle === '*' || needle === '/') return true;
    return url.toLowerCase().includes(needle.toLowerCase());
}

function includesInsensitive(source: string | null | undefined, needle: string): boolean {
    if (!needle.trim()) return true;
    return (source || '').toLowerCase().includes(needle.toLowerCase());
}

function parseUtm(utmData?: string | null): Record<string, string> {
    if (!utmData) return {};
    try {
        const parsed = JSON.parse(utmData);
        return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
        return {};
    }
}

function ruleMatchesVisitor(rule: AutoActionRule, visitor: { referrer?: string | null; device?: string | null; utmData?: string | null }): boolean {
    if (!includesInsensitive(visitor.referrer || '', rule.referrerContains)) return false;
    if (!includesInsensitive(visitor.device || '', rule.deviceContains)) return false;

    const utm = parseUtm(visitor.utmData);
    if (rule.utmSource.trim() && !includesInsensitive(utm.source || '', rule.utmSource)) return false;
    if (rule.utmMedium.trim() && !includesInsensitive(utm.medium || '', rule.utmMedium)) return false;
    if (rule.utmCampaign.trim() && !includesInsensitive(utm.campaign || '', rule.utmCampaign)) return false;
    if (rule.utmTerm.trim() && !includesInsensitive(utm.term || '', rule.utmTerm)) return false;

    return true;
}

async function hasRecentTrigger(projectId: string, conversationId: string, visitorId: string, rule: AutoActionRule, sessionId?: string): Promise<boolean> {
    const conversationCap = rule.oncePerConversation ? 1 : Math.max(1, rule.maxTriggersPerConversation || 1);

    const conversationRuleTriggers = await db.autoActionTrigger.count({
        where: {
            projectId,
            ruleId: rule.id,
            conversationId,
        },
    });

    if (conversationRuleTriggers >= conversationCap) {
        return true;
    }

    const cooldownMatch = await db.autoActionTrigger.findFirst({
        where: {
            projectId,
            ruleId: rule.id,
            visitorId,
            createdAt: {
                gte: new Date(Date.now() - rule.cooldownMinutes * 60 * 1000)
            }
        },
        select: { id: true }
    });

    if (cooldownMatch) {
        return true;
    }

    if (sessionId) {
        const sessionRuleTriggers = await db.autoActionTrigger.count({
            where: {
                projectId,
                ruleId: rule.id,
                sessionId,
            }
        });

        if (sessionRuleTriggers >= Math.max(1, rule.maxTriggersPerSession || 1)) {
            return true;
        }
    }

    return false;
}

async function triggerRule(params: TriggerParams, rule: AutoActionRule): Promise<void> {
    const { projectId, conversationId, visitorId, sessionId, io } = params;

    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, status: true, projectId: true }
    });

    if (!conversation || conversation.status !== 'OPEN') return;

    const recentlyTriggered = await hasRecentTrigger(projectId, conversationId, visitorId, rule, sessionId);
    if (recentlyTriggered) return;

    const message = await prisma.message.create({
        data: {
            conversationId,
            sender: 'OPERATOR',
            type: 'TEXT',
            text: rule.message,
        }
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
    });

    await db.autoActionTrigger.create({
        data: {
            projectId,
            ruleId: rule.id,
            conversationId,
            visitorId,
            sessionId: sessionId || null,
            messageId: message.id,
            url: params.url,
        }
    });

    io.to(`conversation_${conversationId}`).emit('server_message', message);
    io.to(`project_${projectId}`).emit('new_message', message);
}

export async function evaluateAutoActionsForPage(params: TriggerParams): Promise<void> {
    const rules = await getProjectAutoActions(params.projectId);
    if (!rules.length) return;

    const visitor = await prisma.visitor.findUnique({
        where: { id: params.visitorId },
        select: { referrer: true, device: true, utmData: true }
    });

    for (const rule of rules) {
        if (!rule.isActive) continue;
        if (!ruleMatchesUrl(rule, params.url)) continue;
        if (!ruleMatchesVisitor(rule, visitor || {})) continue;

        const timerKey = `${params.conversationId}:${rule.id}`;
        const existingTimer = scheduledTimers.get(timerKey);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timeout = setTimeout(async () => {
            try {
                await triggerRule(params, rule);
            } catch (error) {
                console.error('Auto action trigger error:', error);
            } finally {
                scheduledTimers.delete(timerKey);
            }
        }, rule.delaySeconds * 1000);

        scheduledTimers.set(timerKey, timeout);
    }
}
