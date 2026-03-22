import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { hasProjectAccess } from '../services/accessControl';
import { encryptSecret, isSecretEncryptionConfigured } from '../services/secretCrypto';

const DEFAULT_PRECHAT_FIELDS = [
    { id: 'name', label: 'Ваше имя', type: 'text', required: false, enabled: true },
    { id: 'email', label: 'E-mail', type: 'email', required: true, enabled: true },
    { id: 'phone', label: 'Телефон', type: 'text', required: false, enabled: false }
];

type SanitizedPrechatField = {
    id: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number';
    required: boolean;
    enabled: boolean;
};

const PRECHAT_ALLOWED_TYPES = new Set<SanitizedPrechatField['type']>(['text', 'email', 'tel', 'number']);

const sanitizePrechatFields = (rawValue: unknown): SanitizedPrechatField[] => {
    if (!Array.isArray(rawValue)) {
        return DEFAULT_PRECHAT_FIELDS;
    }

    const sanitized: SanitizedPrechatField[] = [];
    for (const candidate of rawValue) {
        if (!candidate || typeof candidate !== 'object') continue;

        const source = candidate as Record<string, unknown>;
        const id = typeof source.id === 'string' ? source.id.trim() : '';
        const label = typeof source.label === 'string' ? source.label.trim() : '';
        const type = typeof source.type === 'string' ? source.type.trim().toLowerCase() : 'text';

        if (!id || !/^[a-zA-Z0-9_-]{1,40}$/.test(id)) continue;
        if (!label || label.length > 80) continue;
        if (!PRECHAT_ALLOWED_TYPES.has(type as SanitizedPrechatField['type'])) continue;

        sanitized.push({
            id,
            label,
            type: type as SanitizedPrechatField['type'],
            required: Boolean(source.required),
            enabled: Boolean(source.enabled),
        });
    }

    if (sanitized.length === 0) {
        return DEFAULT_PRECHAT_FIELDS;
    }

    return sanitized.slice(0, 10);
};

const parseStoredPrechatFields = (stored: string | null): SanitizedPrechatField[] => {
    if (!stored) return DEFAULT_PRECHAT_FIELDS;

    try {
        const parsed = JSON.parse(stored) as unknown;
        return sanitizePrechatFields(parsed);
    } catch {
        return DEFAULT_PRECHAT_FIELDS;
    }
};

// Get project settings (with defaults)
export const getProjectSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const hasMembership = await hasProjectAccess(userId, projectId);
        if (!hasMembership) { res.status(403).json({ error: 'Forbidden' }); return; }

        let settings = await prisma.projectSettings.findUnique({
            where: { projectId }
        });

        // Create defaults if not exist
        if (!settings) {
            settings = await prisma.projectSettings.create({
                data: {
                    projectId,
                    businessHours: '[]',
                    prechatFields: JSON.stringify(DEFAULT_PRECHAT_FIELDS),
                    offlineMessage: 'Оставьте сообщение, мы ответим как можно скорее',
                    welcomeText: 'Мы онлайн ежедневно без выходных.\nОставьте сообщение — мы ответим на почту или здесь.'
                }
            });
        }

        // Parse JSON fields
        res.json({
            ...settings,
            smtpPassword: null,
            smtpPasswordConfigured: Boolean(settings.smtpPassword),
            businessHours: JSON.parse(settings.businessHours),
            prechatFields: parseStoredPrechatFields(settings.prechatFields)
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update project settings
export const updateProjectSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { projectId } = req.params;
        const hasMembership = await hasProjectAccess(userId, projectId);
        if (!hasMembership) { res.status(403).json({ error: 'Forbidden' }); return; }

        const body = req.body;

        const data: any = {};

        // Core settings
        if (body.timezone !== undefined) data.timezone = body.timezone;
        if (body.businessHours !== undefined) data.businessHours = JSON.stringify(body.businessHours);
        if (body.isAlwaysOnline !== undefined) data.isAlwaysOnline = body.isAlwaysOnline;
        if (body.offlineMessage !== undefined) data.offlineMessage = body.offlineMessage;
        if (body.isOfflineForm !== undefined) data.isOfflineForm = body.isOfflineForm;
        if (body.prechatFields !== undefined) {
            data.prechatFields = JSON.stringify(sanitizePrechatFields(body.prechatFields));
        }

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

        // SMTP / integration settings
        if (body.smtpHost !== undefined) data.smtpHost = body.smtpHost;
        if (body.smtpPort !== undefined) data.smtpPort = body.smtpPort;
        if (body.smtpUser !== undefined) data.smtpUser = body.smtpUser;
        if (body.smtpFrom !== undefined) data.smtpFrom = body.smtpFrom;
        if (body.emailNotify !== undefined) data.emailNotify = body.emailNotify;
        if (body.webhookEnabled !== undefined) data.webhookEnabled = body.webhookEnabled;
        if (body.smtpPassword !== undefined) {
            if (body.smtpPassword === '') {
                data.smtpPassword = null;
            } else {
                if (!isSecretEncryptionConfigured()) {
                    res.status(400).json({ error: 'DATA_ENCRYPTION_KEY is required to store SMTP password securely' });
                    return;
                }
                data.smtpPassword = encryptSecret(body.smtpPassword);
            }
        }

        const settings = await prisma.projectSettings.upsert({
            where: { projectId },
            create: {
                projectId,
                ...data,
                businessHours: data.businessHours ?? '[]',
                prechatFields: data.prechatFields ?? JSON.stringify(DEFAULT_PRECHAT_FIELDS),
                offlineMessage: data.offlineMessage ?? 'Оставьте сообщение, мы ответим как можно скорее',
                welcomeText: data.welcomeText ?? 'Мы онлайн ежедневно без выходных.\\nОставьте сообщение — мы ответим на почту или здесь.'
            },
            update: data
        });

        res.json({
            ...settings,
            smtpPassword: null,
            smtpPasswordConfigured: Boolean(settings.smtpPassword),
            businessHours: JSON.parse(settings.businessHours),
            prechatFields: parseStoredPrechatFields(settings.prechatFields)
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
