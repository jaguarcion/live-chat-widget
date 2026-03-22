import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/security';

export interface WidgetSessionPayload {
    type: 'widget_session';
    projectId: string;
    conversationId: string;
    visitorId: string;
}

const WIDGET_SESSION_TTL_SECONDS = Number(process.env.WIDGET_SESSION_TTL_SECONDS || 1800);

export const signWidgetSession = (payload: Omit<WidgetSessionPayload, 'type'>): string => {
    return jwt.sign(
        {
            type: 'widget_session',
            ...payload,
        },
        JWT_SECRET,
        { expiresIn: WIDGET_SESSION_TTL_SECONDS }
    );
};

export const verifyWidgetSession = (token: string): WidgetSessionPayload | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as Partial<WidgetSessionPayload>;
        if (
            decoded.type !== 'widget_session' ||
            !decoded.projectId ||
            !decoded.conversationId ||
            !decoded.visitorId
        ) {
            return null;
        }

        return decoded as WidgetSessionPayload;
    } catch {
        return null;
    }
};

export const extractWidgetTokenFromRequest = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }

    const headerToken = req.headers['x-widget-token'];
    if (typeof headerToken === 'string' && headerToken.trim()) {
        return headerToken.trim();
    }

    const bodyToken = req.body?.widgetToken;
    if (typeof bodyToken === 'string' && bodyToken.trim()) {
        return bodyToken.trim();
    }

    const queryToken = req.query?.widgetToken;
    if (typeof queryToken === 'string' && queryToken.trim()) {
        return queryToken.trim();
    }

    return null;
};
