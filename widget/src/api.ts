export function getApiBase(): string {
    return (window as any).__LIVECHAT_API__ || (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
}

export interface InitResponse {
    project: { id: string; name: string };
    visitor: { id: string };
    conversation: { id: string };
    settings?: any;
}

export interface WidgetMetadata {
    referrer?: string;
    device?: string;
    url?: string;
    language?: string;
    timezone?: string;
    utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
    };
    [key: string]: any;
}

export async function initWidget(
    projectId: string,
    visitorId: string | null,
    metadata: WidgetMetadata
): Promise<InitResponse> {
    const res = await fetch(`${getApiBase()}/widget/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, visitorId, metadata }),
    });
    if (!res.ok) throw new Error('Widget init failed');
    return res.json();
}

export interface MessageData {
    id: string;
    conversationId: string;
    sender: string;
    text: string | null;
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'OPERATOR_JOIN';
    attachmentUrl?: string | null;
    user?: {
        name: string;
        avatarUrl?: string;
        title?: string;
    };
    isRead: boolean;
    createdAt: string;
}

export async function getHistory(conversationId: string): Promise<MessageData[]> {
    const res = await fetch(`${getApiBase()}/widget/history/${conversationId}`);
    if (!res.ok) throw new Error('History fetch failed');
    return res.json();
}

export interface OnlineStatus {
    online: boolean;
    offlineMessage?: string;
    isOfflineForm?: boolean;
    onlineOperators?: any[];
}

export async function checkOnline(projectId: string): Promise<OnlineStatus> {
    const res = await fetch(`${getApiBase()}/settings/${projectId}/online`);
    if (!res.ok) return { online: true };
    return res.json();
}
