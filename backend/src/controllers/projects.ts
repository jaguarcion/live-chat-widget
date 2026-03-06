import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
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
                members: {
                    create: {
                        userId,
                        projectRole: 'OWNER'
                    }
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
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const projects = await prisma.project.findMany({
            where: {
                members: {
                    some: {
                        userId
                    }
                }
            },
            include: {
                members: true
            }
        });

        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
