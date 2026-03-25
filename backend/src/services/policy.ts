import { prisma } from '../db';

export interface AuthContext {
    userId: string;
    role: string;
}

export const isSuperAdmin = (role?: string | null): boolean => role === 'SUPER_ADMIN';

export const hasProjectMembership = async (userId: string, projectId: string): Promise<boolean> => {
    const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { id: true }
    });

    return Boolean(membership);
};

export const canAccessProject = async (ctx: AuthContext, projectId: string): Promise<boolean> => {
    if (isSuperAdmin(ctx.role)) {
        return true;
    }

    return hasProjectMembership(ctx.userId, projectId);
};

export const assertProjectAccess = async (ctx: AuthContext, projectId: string): Promise<boolean> => {
    return canAccessProject(ctx, projectId);
};

export const canManageProjectMembers = async (ctx: AuthContext, projectId: string): Promise<boolean> => {
    if (isSuperAdmin(ctx.role)) {
        return true;
    }

    const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: ctx.userId, projectId } },
        select: { projectRole: true }
    });

    return membership?.projectRole === 'OWNER' || membership?.projectRole === 'ADMIN';
};

export const canManageProjectSettings = canManageProjectMembers;
