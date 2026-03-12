import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';

// Get project settings (with defaults)
export const getProjectSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        let settings = await prisma.projectSettings.findUnique({
            where: { projectId }
        });

        // Create defaults if not exist
        if (!settings) {
            settings = await prisma.projectSettings.create({
                data: {
                    projectId,
                    businessHours: '[]',
                    offlineMessage: 'Оставьте сообщение, мы ответим как можно скорее',
                    welcomeText: 'Мы онлайн ежедневно без выходных.\nОставьте сообщение — мы ответим на почту или здесь.'
                }
            });
        }

        // Parse businessHours JSON
        res.json({
            ...settings,
            businessHours: JSON.parse(settings.businessHours)
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update project settings
export const updateProjectSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;
        const body = req.body;

        const data: any = {};

        // Core settings
        if (body.timezone !== undefined) data.timezone = body.timezone;
        if (body.businessHours !== undefined) data.businessHours = JSON.stringify(body.businessHours);
        if (body.isAlwaysOnline !== undefined) data.isAlwaysOnline = body.isAlwaysOnline;
        if (body.offlineMessage !== undefined) data.offlineMessage = body.offlineMessage;
        if (body.isOfflineForm !== undefined) data.isOfflineForm = body.isOfflineForm;

        // Appearance
        if (body.chatColor !== undefined) data.chatColor = body.chatColor;
        if (body.buttonPosition !== undefined) data.buttonPosition = body.buttonPosition;
        if (body.buttonStyle !== undefined) data.buttonStyle = body.buttonStyle;
        if (body.coloredHeader !== undefined) data.coloredHeader = body.coloredHeader;

        // Texts
        if (body.onlineTitle !== undefined) data.onlineTitle = body.onlineTitle;
        if (body.offlineTitle !== undefined) data.offlineTitle = body.offlineTitle;
        if (body.welcomeText !== undefined) data.welcomeText = body.welcomeText;

        // Feature toggles
        if (body.soundEnabled !== undefined) data.soundEnabled = body.soundEnabled;
        if (body.showMobileButton !== undefined) data.showMobileButton = body.showMobileButton;
        if (body.showLogo !== undefined) data.showLogo = body.showLogo;
        if (body.fileUpload !== undefined) data.fileUpload = body.fileUpload;
        if (body.messengerMode !== undefined) data.messengerMode = body.messengerMode;
        if (body.typingWatch !== undefined) data.typingWatch = body.typingWatch;

        const settings = await prisma.projectSettings.upsert({
            where: { projectId },
            create: { projectId, ...data },
            update: data
        });

        res.json({
            ...settings,
            businessHours: JSON.parse(settings.businessHours)
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Helper to fetch online operators for a project
async function getOnlineOperators(projectId: string) {
    const presences = await prisma.operatorPresence.findMany({
        where: { projectId, isOnline: true },
        include: {
            user: { select: { id: true, name: true, avatarUrl: true, title: true, showInGreeting: true } }
        }
    });

    return presences
        .filter(p => p.user.showInGreeting)
        .map(p => ({
            name: p.user.name,
            avatarUrl: p.user.avatarUrl,
            title: p.user.title
        }));
}

// Check if project is currently online (for widget)
export const checkOnlineStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        const settings = await prisma.projectSettings.findUnique({
            where: { projectId }
        });

        if (!settings) {
            const onlineOperators = await getOnlineOperators(projectId);
            res.json({ online: true, onlineOperators }); // Default to online if no settings
            return;
        }

        if (settings.isAlwaysOnline) {
            const onlineOperators = await getOnlineOperators(projectId);
            res.json({ online: true, onlineOperators });
            return;
        }

        const businessHours = JSON.parse(settings.businessHours) as Array<{
            day: number; // 0-6 (Sunday-Saturday)
            start: string; // "09:00"
            end: string; // "18:00"
            enabled: boolean;
        }>;

        if (businessHours.length === 0) {
            const onlineOperators = await getOnlineOperators(projectId);
            res.json({ online: true, onlineOperators }); // No hours set = always online
            return;
        }

        // Get current time in project timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: settings.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            weekday: 'short'
        });
        const parts = formatter.formatToParts(now);
        const hour = parts.find(p => p.type === 'hour')?.value || '00';
        const minute = parts.find(p => p.type === 'minute')?.value || '00';
        const currentTime = `${hour}:${minute}`;
        const dayOfWeek = now.toLocaleDateString('en-US', { timeZone: settings.timezone, weekday: 'short' });
        const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const currentDay = dayMap[dayOfWeek] ?? 0;

        const todayHours = businessHours.find(h => h.day === currentDay && h.enabled);

        if (!todayHours) {
            res.json({ online: false, offlineMessage: settings.offlineMessage, isOfflineForm: settings.isOfflineForm });
            return;
        }

        const online = currentTime >= todayHours.start && currentTime <= todayHours.end;

        const io = (global as any).io;
        let hasActiveOperators = false;
        if (io) {
            const room = io.sockets.adapter.rooms.get(`project_${projectId}`);
            hasActiveOperators = room ? room.size > 0 : false;
        }

        // Fetch online operators only when project is online
        const onlineOperators = online ? await getOnlineOperators(projectId) : undefined;

        res.json({
            online,
            hasActiveOperators,
            onlineOperators,
            offlineMessage: online ? undefined : settings.offlineMessage,
            isOfflineForm: online ? undefined : settings.isOfflineForm
        });
    } catch (error) {
        console.error('Check online status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
