import { prisma } from '../db';

export type EventType =
    | 'CONVERSATION_CREATED'
    | 'MESSAGE_SENT'
    | 'NOTE_SENT'
    | 'OPERATOR_ASSIGNED'
    | 'OPERATOR_UNASSIGNED'
    | 'CONVERSATION_CLASSIFIED'
    | 'CONVERSATION_CLOSED'
    | 'CONVERSATION_REOPENED'
    | 'VISITOR_CONNECTED'
    | 'OPERATOR_CONNECTED'
    | 'OPERATOR_DISCONNECTED'
    | 'UPLOAD_QUOTA_EXCEEDED';

export const logEvent = async (
    projectId: string,
    type: EventType,
    payload: Record<string, any> = {}
): Promise<void> => {
    try {
        await prisma.event.create({
            data: {
                projectId,
                type,
                payload: JSON.stringify(payload),
            }
        });
    } catch (error) {
        console.error('Event log error:', error);
    }
};
