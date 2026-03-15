import { io, Socket } from 'socket.io-client';
import type { MessageData } from './api';

const SOCKET_URL = (window as any).__LIVECHAT_WS__ || import.meta.env.VITE_WS_URL || 'http://localhost:3001';

function createSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
    const key = 'livechat_session_id';
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = createSessionId();
    sessionStorage.setItem(key, created);
    return created;
}

export class ChatSocket {
    private socket: Socket;
    private onMessageCallback: ((msg: MessageData) => void) | null = null;
    private sessionId: string;

    constructor() {
        this.sessionId = getSessionId();
        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: false,
        });

        this.socket.on('server_message', (msg: MessageData) => {
            if (this.onMessageCallback) {
                this.onMessageCallback(msg);
            }
        });
    }

    connect(conversationId: string, visitorId?: string) {
        this.socket.connect();
        this.socket.on('connect', () => {
            this.socket.emit('visitor_connect', {
                conversationId,
                visitorId,
                url: window.location.href,
                title: document.title,
                sessionId: this.sessionId,
            });
        });
    }

    sendMessage(conversationId: string, text: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', attachmentUrl?: string) {
        this.socket?.emit('visitor_message', { conversationId, text, type, attachmentUrl });
    }

    sendTyping(conversationId: string, isTyping: boolean, text?: string) {
        this.socket?.emit('typing', { conversationId, isTyping, text });
    }

    sendPageView(visitorId: string, url: string, title?: string, conversationId?: string) {
        this.socket?.emit('page_view', { visitorId, url, title, conversationId, sessionId: this.sessionId });
    }

    onMessage(callback: (msg: any) => void) {
        this.socket?.on('server_message', callback);
    }

    onTypingStatus(callback: (data: { sender: 'VISITOR' | 'OPERATOR', isTyping: boolean }) => void) {
        this.socket?.on('typing_status', callback);
    }

    disconnect() {
        this.socket.disconnect();
    }
}
