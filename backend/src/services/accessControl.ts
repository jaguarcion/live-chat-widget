import { prisma } from '../db';
import { canAccessProject } from './policy';

export const hasProjectAccess = async (userId: string, projectId: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return false;
    return canAccessProject({ userId, role: user.role }, projectId);
};

export const getConversationProjectId = async (conversationId: string): Promise<string | null> => {
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { projectId: true }
    });

    return conversation?.projectId ?? null;
};

export const hasConversationAccess = async (userId: string, conversationId: string): Promise<boolean> => {
    const projectId = await getConversationProjectId(conversationId);
    if (!projectId) return false;
    return hasProjectAccess(userId, projectId);
};

export const hasVisitorAccess = async (userId: string, visitorId: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') {
        const conversation = await prisma.conversation.findFirst({ where: { visitorId }, select: { id: true } });
        return Boolean(conversation);
    }

    const conversation = await prisma.conversation.findFirst({
        where: {
            visitorId,
            project: {
                members: {
                    some: { userId }
                }
            }
        },
        select: { id: true }
    });

    return Boolean(conversation);
};
