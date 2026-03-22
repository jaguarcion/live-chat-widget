import { prisma } from '../db';

export const hasProjectAccess = async (userId: string, projectId: string): Promise<boolean> => {
    const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { userId: true }
    });

    return Boolean(membership);
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
