import { prisma } from '../db';

type AdminAction =
    | 'PROJECT_CREATE'
    | 'PROJECT_FREEZE'
    | 'PROJECT_UNFREEZE'
    | 'PROJECT_ARCHIVE'
    | 'PROJECT_DELETE'
    | 'PROJECT_ADMIN_REASSIGN';

interface AuditPayload {
    actorId: string;
    action: AdminAction;
    targetType: 'PROJECT' | 'USER' | 'MEMBERSHIP';
    targetId: string;
    projectId?: string;
    metadata?: Record<string, unknown>;
}

export const logAdminAudit = async (payload: AuditPayload): Promise<void> => {
    try {
        const prismaClient = prisma as any;
        await prismaClient.adminAuditLog.create({
            data: {
                actorId: payload.actorId,
                action: payload.action,
                targetType: payload.targetType,
                targetId: payload.targetId,
                projectId: payload.projectId,
                metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
            }
        });
    } catch (error) {
        console.error('Admin audit write failed:', error);
    }
};
