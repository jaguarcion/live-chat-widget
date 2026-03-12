import { io, Socket } from 'socket.io-client';
import type { MessageData } from './api';

const SOCKET_URL = (window as any).__LIVECHAT_WS__ || import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export class ChatSocket {
    private socket: Socket;
    private onMessageCallback: ((msg: MessageData) => void) | null = null;

    constructor() {
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
            this.socket.emit('visitor_connect', { conversationId, visitorId });
        });
    }

    sendMessage(conversationId: string, text: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', attachmentUrl?: string) {
        this.socket?.emit('visitor_message', { conversationId, text, type, attachmentUrl });
    }

    sendTyping(conversationId: string, isTyping: boolean, text?: string) {
        this.socket?.emit('typing', { conversationId, isTyping, text });
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
