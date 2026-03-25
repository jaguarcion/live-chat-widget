import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Only SUPER_ADMIN can create projects
        if (userRole !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Only super admins can create projects' });
            return;
        }

        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }

        const project = await prisma.project.create({
            data: {
                name,
                ownerId: userId,
                status: 'ACTIVE',
                members: {
                    create: {
                        userId,
                        projectRole: 'OWNER'
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

        if (userRole === 'SUPER_ADMIN') {
            // SuperAdmin sees all active projects
            const projects = await prisma.project.findMany({
                where: {
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
                    },
                    conversations: {
                        select: { id: true }
                    }
                }
            });
            res.json(projects);
        } else {
            // Regular users see only their projects
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

        if (!userId || userRole !== 'SUPER_ADMIN') {
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

        res.json(project);
    } catch (error) {
        console.error('Freeze project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId || userRole !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Only super admins can delete projects' });
            return;
        }

        const { projectId } = req.params;

        await prisma.project.delete({
            where: { id: projectId }
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

        if (!userId || userRole !== 'SUPER_ADMIN') {
            res.status(403).json({ error: 'Only super admins can reassign admins' });
            return;
        }

        const { projectId } = req.params;
        const { newAdminUserId } = req.body;

        if (!newAdminUserId) {
            res.status(400).json({ error: 'newAdminUserId is required' });
            return;
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: newAdminUserId }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Update or create membership
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

        if (!userId || userRole !== 'SUPER_ADMIN') {
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
