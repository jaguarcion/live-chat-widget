import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { extractWidgetTokenFromRequest, verifyWidgetSession } from '../services/widgetSession';
import { AuthRequest } from '../middlewares/auth';
import { MEDIA_BASE_URL } from '../config/security';
import { logEvent } from '../services/eventLogger';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

type UploadQuotaBucket = {
    entries: Array<{ timestamp: number; size: number }>;
};

const uploadQuotaBuckets = new Map<string, UploadQuotaBucket>();

const WIDGET_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
const WIDGET_QUOTA_MAX_FILES = 40;
const WIDGET_QUOTA_MAX_BYTES = 40 * 1024 * 1024;

const OPERATOR_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
const OPERATOR_QUOTA_MAX_FILES = 120;
const OPERATOR_QUOTA_MAX_BYTES = 250 * 1024 * 1024;

const resolveMediaBaseUrl = (req: Request): string => {
    if (MEDIA_BASE_URL) {
        // If configured URL is localhost but the request came in over HTTPS
        // (i.e. we are behind a TLS-terminating reverse proxy), upgrade the scheme.
        const forwarded = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
        if (forwarded === 'https' && MEDIA_BASE_URL.startsWith('http://')) {
            return MEDIA_BASE_URL.replace(/^http:\/\//, 'https://');
        }
        return MEDIA_BASE_URL;
    }

    // No MEDIA_BASE_URL configured — derive from request
    const forwarded = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
    const protocol = forwarded || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    return `${protocol}://${host}`;
};

const checkAndConsumeUploadQuota = (
    key: string,
    size: number,
    windowMs: number,
    maxFiles: number,
    maxBytes: number
): { allowed: boolean; retryAfterSec: number } => {
    const now = Date.now();
    const bucket = uploadQuotaBuckets.get(key) || { entries: [] };

    bucket.entries = bucket.entries.filter(entry => now - entry.timestamp < windowMs);

    const usedFiles = bucket.entries.length;
    const usedBytes = bucket.entries.reduce((sum, entry) => sum + entry.size, 0);
    const nextFiles = usedFiles + 1;
    const nextBytes = usedBytes + size;

    if (nextFiles > maxFiles || nextBytes > maxBytes) {
        uploadQuotaBuckets.set(key, bucket);
        const oldest = bucket.entries[0]?.timestamp || now;
        const retryAfterMs = Math.max(1_000, windowMs - (now - oldest));
        return {
            allowed: false,
            retryAfterSec: Math.ceil(retryAfterMs / 1000),
        };
    }

    bucket.entries.push({ timestamp: now, size });
    uploadQuotaBuckets.set(key, bucket);

    return { allowed: true, retryAfterSec: 0 };
};

const detectMagicMime = (bytes: Buffer): string | null => {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg';
    }

    if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
    ) {
        return 'image/png';
    }

    if (
        bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d
    ) {
        return 'application/pdf';
    }

    // WebP: RIFF????WEBP
    if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
        return 'image/webp';
    }

    // GIF87a / GIF89a
    if (
        bytes.length >= 6 &&
        bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
        bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
    ) {
        return 'image/gif';
    }

    return null;
};

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(extension)) {
            cb(new Error('Unsupported file type'));
            return;
        }

        cb(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('file');

export const uploadFile = (req: any, res: any) => {
    upload(req as any, res as any, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: 'File upload failed' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const conversationId = req.body?.conversationId as string | undefined;
        const visitorId = req.body?.visitorId as string | undefined;
        if (!conversationId || !visitorId) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'conversationId and visitorId are required' });
        }

        const token = extractWidgetTokenFromRequest(req as Request);
        if (!token) {
            fs.unlinkSync(req.file.path);
            return res.status(401).json({ error: 'widgetToken is required' });
        }

        const session = verifyWidgetSession(token);
        if (!session) {
            fs.unlinkSync(req.file.path);
            return res.status(401).json({ error: 'Invalid widget token' });
        }

        if (session.conversationId !== conversationId || session.visitorId !== visitorId) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Forbidden' });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { visitorId: true, projectId: true }
        });

        if (!conversation || conversation.visitorId !== visitorId || conversation.projectId !== session.projectId) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Forbidden' });
        }

        const widgetQuota = checkAndConsumeUploadQuota(
            `widget:${conversation.projectId}:${conversationId}:${visitorId}`,
            req.file.size,
            WIDGET_QUOTA_WINDOW_MS,
            WIDGET_QUOTA_MAX_FILES,
            WIDGET_QUOTA_MAX_BYTES
        );

        if (!widgetQuota.allowed) {
            fs.unlinkSync(req.file.path);
            res.setHeader('Retry-After', widgetQuota.retryAfterSec.toString());
            await logEvent(conversation.projectId, 'UPLOAD_QUOTA_EXCEEDED', {
                conversationId,
                visitorId,
                size: req.file.size,
                retryAfterSec: widgetQuota.retryAfterSec,
            });
            return res.status(429).json({ error: 'Upload quota exceeded. Please try again later.' });
        }

        if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        const fileBuffer = await fs.promises.readFile(req.file.path);
        const magicMime = detectMagicMime(fileBuffer.subarray(0, 16));
        if (!magicMime || magicMime !== req.file.mimetype) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'File signature validation failed' });
        }

        const baseUrl = resolveMediaBaseUrl(req as Request);
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        res.json({
            url: fileUrl,
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    });
};

export const uploadOperatorFile = (req: AuthRequest, res: Response) => {
    upload(req as any, res as any, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: 'File upload failed' });
        }

        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const operatorQuota = checkAndConsumeUploadQuota(
            `operator:${req.user.userId}`,
            req.file.size,
            OPERATOR_QUOTA_WINDOW_MS,
            OPERATOR_QUOTA_MAX_FILES,
            OPERATOR_QUOTA_MAX_BYTES
        );

        if (!operatorQuota.allowed) {
            fs.unlinkSync(req.file.path);
            res.setHeader('Retry-After', operatorQuota.retryAfterSec.toString());
            return res.status(429).json({ error: 'Upload quota exceeded. Please try again later.' });
        }

        if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        const fileBuffer = await fs.promises.readFile(req.file.path);
        const magicMime = detectMagicMime(fileBuffer.subarray(0, 16));
        if (!magicMime || magicMime !== req.file.mimetype) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'File signature validation failed' });
        }

        const baseUrl = resolveMediaBaseUrl(req as Request);
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        res.json({
            url: fileUrl,
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    });
};
