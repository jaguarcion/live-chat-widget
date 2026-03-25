import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { isSuperAdmin } from '../services/policy';
import { logAdminAudit } from '../services/adminAuditLog';

const DEFAULT_PRECHAT_FIELDS = [
    { id: 'name', label: 'Ваше имя', type: 'text', required: false, enabled: true },
    { id: 'email', label: 'E-mail', type: 'email', required: true, enabled: true },
    { id: 'phone', label: 'Телефон', type: 'text', required: false, enabled: false }
];

const DEFAULT_BUSINESS_HOURS = '[]';
const DEFAULT_OFFLINE_MESSAGE = 'Оставьте сообщение, мы ответим как можно скорее';
const DEFAULT_WELCOME_TEXT = 'Мы онлайн ежедневно без выходных.\\nОставьте сообщение — мы ответим на почту или здесь.';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!isSuperAdmin(userRole)) {
            res.status(403).json({ error: 'Only super admins can create projects' });
            return;
        }

        const { name, adminUserId, timezone } = req.body;
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        if (!normalizedName) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }

        if (adminUserId) {
            const adminUser = await prisma.user.findUnique({
                where: { id: adminUserId },
                select: { id: true }
            });

            if (!adminUser) {
                res.status(404).json({ error: 'Admin user not found' });
                return;
            }
        }

        const memberCreates = [
            {
                userId,
                projectRole: 'OWNER'
            }
        ];

        if (adminUserId && adminUserId !== userId) {
            memberCreates.push({
                userId: adminUserId,
                projectRole: 'ADMIN'
            });
        }

        const project = await prisma.project.create({
            data: {
                name: normalizedName,
                ownerId: userId,
                status: 'ACTIVE',
                members: {
                    create: memberCreates
                },
                settings: {
                    create: {
                        timezone: typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'Europe/Moscow',
                        businessHours: DEFAULT_BUSINESS_HOURS,
                        prechatFields: JSON.stringify(DEFAULT_PRECHAT_FIELDS),
                        offlineMessage: DEFAULT_OFFLINE_MESSAGE,
                        welcomeText: DEFAULT_WELCOME_TEXT,
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, role: true }
                        }
                    }
                },
                owner: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        await logAdminAudit({
            actorId: userId,
            action: 'PROJECT_CREATE',
            targetType: 'PROJECT',
            targetId: project.id,
            projectId: project.id,
            metadata: {
                name: normalizedName,
                adminUserId: adminUserId || null,
                timezone: timezone || 'Europe/Moscow',
            }
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (isSuperAdmin(userRole)) {
            const statusFilter = typeof req.query.status === 'string' ? req.query.status : 'ACTIVE';
            const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
            const ownerIdFilter = typeof req.query.ownerId === 'string' ? req.query.ownerId : '';
            const adminUserIdFilter = typeof req.query.adminUserId === 'string' ? req.query.adminUserId : '';
            const hasActivityDays = Number(req.query.hasActivityDays || 0);
            const activityFrom = hasActivityDays > 0
                ? new Date(Date.now() - hasActivityDays * 24 * 60 * 60 * 1000)
                : null;

            const where: any = {
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                name: searchQuery ? { contains: searchQuery } : undefined,
                ownerId: ownerIdFilter || undefined,
                members: adminUserIdFilter ? {
                    some: {
                        userId: adminUserIdFilter,
                        projectRole: { in: ['OWNER', 'ADMIN'] }
                    }
                } : undefined,
                conversations: activityFrom ? {
                    some: { updatedAt: { gte: activityFrom } }
                } : undefined,
            };

            const projects = await prisma.project.findMany({
                where,
                include: {
                    members: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true, role: true, avatarUrl: true }
                            }
                        }
                    },
                    owner: {
                        select: { id: true, name: true, email: true }
                    },
                    conversations: {
                        select: { id: true }
                    }
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });
            res.json(projects);
        } else {
            const projects = await prisma.project.findMany({
                where: {
                    members: {
                        some: {
                            userId
                        }
                    },
                    status: 'ACTIVE'
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true, role: true, avatarUrl: true }
                            }
                        }
                    },
                    owner: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });
            res.json(projects);
        }
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const freezeProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !isSuperAdmin(userRole)) {
            res.status(403).json({ error: 'Only super admins can freeze projects' });
            return;
        }

        const { projectId } = req.params;
        const { freeze } = req.body;

        const project = await prisma.project.update({
            where: { id: projectId },
            data: {
                status: freeze ? 'FROZEN' : 'ACTIVE'
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        await logAdminAudit({
            actorId: userId,
            action: freeze ? 'PROJECT_FREEZE' : 'PROJECT_UNFREEZE',
            targetType: 'PROJECT',
            targetId: projectId,
            projectId,
            metadata: { status: project.status }
        });

        res.json(project);
    } catch (error) {
        console.error('Freeze project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const archiveProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !isSuperAdmin(userRole)) {
            res.status(403).json({ error: 'Only super admins can archive projects' });
            return;
        }

        const { projectId } = req.params;
        const project = await prisma.project.update({
            where: { id: projectId },
            data: { status: 'ARCHIVED' }
        });

        await logAdminAudit({
            actorId: userId,
            action: 'PROJECT_ARCHIVE',
            targetType: 'PROJECT',
            targetId: projectId,
            projectId,
            metadata: { status: project.status }
        });

        res.json(project);
    } catch (error) {
        console.error('Archive project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getProjectDeleteImpact = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !isSuperAdmin(userRole)) {
            res.status(403).json({ error: 'Only super admins can view delete impact' });
            return;
        }

        const { projectId } = req.params;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true, status: true }
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const [memberCount, conversationCount, messageCount, webhookCount, quickReplyCount] = await Promise.all([
            prisma.projectMember.count({ where: { projectId } }),
            prisma.conversation.count({ where: { projectId } }),
            prisma.message.count({ where: { conversation: { projectId } } }),
            prisma.webhook.count({ where: { projectId } }),
            prisma.quickReply.count({ where: { projectId } }),
        ]);

        res.json({
            project,
            impact: {
                memberCount,
                conversationCount,
                messageCount,
                webhookCount,
                quickReplyCount,
            }
        });
    } catch (error) {
        console.error('Get project delete impact error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !isSuperAdmin(userRole)) {
            res.status(403).json({ error: 'Only super admins can delete projects' });
            return;
        }

        const { projectId } = req.params;
        const { confirmText } = req.body || {};

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true, status: true }
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.status !== 'ARCHIVED') {
            res.status(409).json({ error: 'Project must be archived before deletion' });
            return;
        }

        if (!confirmText || String(confirmText).trim() !== project.name) {
            res.status(400).json({ error: 'Confirmation text does not match project name' });
            return;
        }

        await prisma.project.delete({
            where: { id: projectId }
        });

        await logAdminAudit({
            actorId: userId,
            action: 'PROJECT_DELETE',
            targetType: 'PROJECT',
            targetId: projectId,
            projectId
        });

        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const reassignAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !isSuperAdmin(userRole)) {
            res.status(403).json({ error: 'Only super admins can reassign admins' });
            return;
        }

        const { projectId } = req.params;
        const { newAdminUserId } = req.body;

        if (!newAdminUserId) {
            res.status(400).json({ error: 'newAdminUserId is required' });
            return;
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, status: true }
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.status === 'ARCHIVED') {
            res.status(409).json({ error: 'Cannot reassign admin for archived project' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: newAdminUserId },
            select: { id: true, role: true }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const existingMembership = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: newAdminUserId,
                    projectId,
                }
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (existingMembership && (existingMembership.projectRole === 'ADMIN' || existingMembership.projectRole === 'OWNER')) {
            res.json({ ...existingMembership, noChanges: true });
            return;
        }

        const membership = await prisma.projectMember.upsert({
            where: {
                userId_projectId: {
                    userId: newAdminUserId,
                    projectId
                }
            },
            update: {
                projectRole: 'ADMIN'
            },
            create: {
                userId: newAdminUserId,
                projectId,
                projectRole: 'ADMIN'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        await logAdminAudit({
            actorId: userId,
            action: 'PROJECT_ADMIN_REASSIGN',
            targetType: 'PROJECT',
            targetId: projectId,
            projectId,
            metadata: {
                newAdminUserId,
                membershipId: membership.id,
                previousRole: existingMembership?.projectRole || null,
            }
        });

        res.json(membership);
    } catch (error) {
        console.error('Reassign admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getProjectStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { projectId } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Only SUPER_ADMIN or project admin/owner can view stats
        const membership = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: { userId, projectId }
            }
        });

        if (userRole !== 'SUPER_ADMIN' && !membership) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const [conversationCount, memberCount, messageCount] = await Promise.all([
            prisma.conversation.count({
                where: { projectId }
            }),
            prisma.projectMember.count({
                where: { projectId }
            }),
            prisma.message.count({
                where: {
                    conversation: { projectId }
                }
            })
        ]);

        res.json({
            projectId,
            conversationCount,
            memberCount,
            messageCount
        });
    } catch (error) {
        console.error('Get project stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || !isSuperAdmin(userRole)) {
            res.status(403).json({ error: 'Only super admins can view all users' });
            return;
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
