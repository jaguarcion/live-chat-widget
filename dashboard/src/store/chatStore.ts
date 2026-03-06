import { create } from 'zustand';
import { getConversations, getMessages } from '../api';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

export interface Message {
    id: string;
    conversationId: string;
    sender: string;
    text: string | null;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    attachmentUrl?: string | null;
    isRead: boolean;
    createdAt: string;
}

export interface Visitor {
    id: string;
    email: string | null;
    name: string | null;
    country: string | null;
    device: string | null;
    referrer: string | null;
    notes: string | null;
}

export interface Conversation {
    id: string;
    projectId: string;
    visitorId: string;
    operatorId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    visitor: Visitor;
    operator: { id: string; name: string; email: string } | null;
    project: { id: string; name: string };
    messages: Message[];
}

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Message[];
    socket: Socket | null;
    typingStatus: Record<string, boolean>; // conversationId -> isTyping
    loading: boolean;

    fetchConversations: () => Promise<void>;
    setActiveConversation: (id: string) => Promise<void>;
    fetchMessages: (conversationId: string) => Promise<void>;
    addMessage: (message: Message) => void;
    connectSocket: (token: string, projectIds: string[]) => void;
    disconnectSocket: () => void;
    sendTyping: (conversationId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    messages: [],
    socket: null,
    typingStatus: {},
    loading: false,

    fetchConversations: async () => {
        set({ loading: true });
        try {
            const { data } = await getConversations();
            set({ conversations: data, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    setActiveConversation: async (id: string) => {
        set({ activeConversationId: id, messages: [] });
        await get().fetchMessages(id);
    },

    fetchMessages: async (conversationId: string) => {
        try {
            const { data } = await getMessages(conversationId);
            set({ messages: data });
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    },

    addMessage: (message: Message) => {
        const state = get();
        // Update messages if viewing this conversation
        if (state.activeConversationId === message.conversationId) {
            const exists = state.messages.some(m => m.id === message.id);
            if (!exists) {
                set({ messages: [...state.messages, message] });
            }
        }
        // Update conversation's last message
        set({
            conversations: state.conversations.map(c =>
                c.id === message.conversationId
                    ? { ...c, messages: [message], updatedAt: message.createdAt }
                    : c
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        });
    },

    connectSocket: (token: string, projectIds: string[]) => {
        const socket = io('/', { transports: ['websocket'] });

        socket.on('connect', () => {
            socket.emit('operator_connect', { token, projectIds });
        });

        socket.on('new_message', (message: Message) => {
            get().addMessage(message);
        });

        socket.on('new_conversation', () => {
            get().fetchConversations();
        });

        socket.on('typing_status', (data: { conversationId: string, sender: 'VISITOR' | 'OPERATOR', isTyping: boolean }) => {
            if (data.sender === 'VISITOR') {
                set(state => ({
                    typingStatus: { ...state.typingStatus, [data.conversationId]: data.isTyping }
                }));
            }
        });

        set({ socket });
    },

    sendTyping: (conversationId: string, isTyping: boolean) => {
        const { socket } = get();
        if (socket) {
            socket.emit('typing', { conversationId, isTyping });
        }
    },

    disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null });
        }
    },
}));
