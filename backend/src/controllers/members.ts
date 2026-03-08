import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

// POST /api/projects/:id/members — add a member to a project
export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: projectId } = req.params;
        const { email, projectRole = 'OPERATOR' } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(404).json({ error: 'User not found. They must register first.' });
            return;
        }

        // Check if already a member
        const existing = await prisma.projectMember.findUnique({
            where: { userId_projectId: { userId: user.id, projectId } }
        });
        if (existing) {
            res.status(400).json({ error: 'User is already a member of this project' });
            return;
        }

        const member = await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId,
                projectRole,
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, title: true, showInGreeting: true } }
            }
        });

        res.status(201).json(member);
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/projects/:id/members — list members of a project
export const getMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: projectId } = req.params;

        const members = await prisma.projectMember.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, title: true, showInGreeting: true } }
            }
        });

        res.json(members);
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// PATCH /api/projects/:id/members/:userId — update member role
export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: projectId, userId } = req.params;
        const { projectRole, name, title, avatarUrl, showInGreeting } = req.body;

        if (projectRole) {
            await prisma.projectMember.update({
                where: { userId_projectId: { userId, projectId } },
                data: { projectRole },
            });
        }

        if (name !== undefined || title !== undefined || avatarUrl !== undefined || showInGreeting !== undefined) {
            const userUpdateData: any = {};
            if (name !== undefined) userUpdateData.name = name;
            if (title !== undefined) userUpdateData.title = title;
            if (avatarUrl !== undefined) userUpdateData.avatarUrl = avatarUrl;
            if (showInGreeting !== undefined) userUpdateData.showInGreeting = showInGreeting;

            await prisma.user.update({
                where: { id: userId },
                data: userUpdateData
            });
        }

        const member = await prisma.projectMember.findUnique({
            where: { userId_projectId: { userId, projectId } },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, title: true, showInGreeting: true } }
            }
        });

        res.json(member);
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE /api/projects/:id/members/:userId — remove member
export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: projectId, userId } = req.params;

        await prisma.projectMember.delete({
            where: { userId_projectId: { userId, projectId } }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
