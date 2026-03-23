import { create } from 'zustand';
import { getConversations, getMessages } from '../api';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { playNotificationSound } from '../utils/soundUtils';

export interface Message {
    id: string;
    conversationId: string;
    sender: string;
    text: string | null;
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'OPERATOR_JOIN';
    attachmentUrl?: string | null;
    isRead: boolean;
    isNote?: boolean;
    mentions?: string | null; // JSON array of userIds
    createdAt: string;
    senderId?: string;
    user?: {
        name: string;
        avatarUrl?: string;
        title?: string;
    };
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
    isPinned?: boolean;
    createdAt: string;
    updatedAt: string;
    visitor: Visitor;
    operator: { id: string; name: string; email: string } | null;
    project: { id: string; name: string };
    messages: Message[];
    unreadCount?: number;
    operatorReplyCount?: number;
}

export interface LiveVisitor {
    visitorId: string;
    conversationId: string;
    name: string | null;
    email: string | null;
    url: string | null;
    title: string | null;
    referrer: string | null;
    connectedAt: string;
}

interface TypingData {
    isTyping: boolean;
    text?: string;
}

interface MentionNotif {
    conversationId: string;
    noteId: string;
    fromUserId: string;
    text: string;
    seenAt?: null;
}

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Message[];
    socket: Socket | null;
    typingStatus: Record<string, TypingData>;
    onlineVisitors: Set<string>;
    liveVisitors: LiveVisitor[];
    mentions: MentionNotif[];
    loading: boolean;

    fetchConversations: () => Promise<void>;
    setActiveConversation: (id: string | null) => Promise<void>;
    fetchMessages: (conversationId: string) => Promise<void>;
    addMessage: (message: Message) => void;
    addNote: (message: Message) => void;
    updateConversationPin: (conversationId: string, isPinned: boolean) => void;
    connectSocket: (token: string, projectIds: string[]) => void;
    disconnectSocket: () => void;
    sendTyping: (conversationId: string, isTyping: boolean) => void;
    clearMention: (noteId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    messages: [],
    socket: null,
    typingStatus: {},
    onlineVisitors: new Set<string>(),
    liveVisitors: [],
    mentions: [],
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

    setActiveConversation: async (id: string | null) => {
        if (!id) {
            set({ activeConversationId: null, messages: [] });
            return;
        }
        set({ activeConversationId: id, messages: [] });
        await get().fetchMessages(id);

        try {
            const { markConversationAsRead } = await import('../api');
            await markConversationAsRead(id);
            set(state => ({
                conversations: state.conversations.map(c =>
                    c.id === id ? { ...c, unreadCount: 0 } : c
                )
            }));

            const { socket } = get();
            if (socket) {
                socket.emit('join_conversation', { conversationId: id });
            }
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
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
        if (state.activeConversationId === message.conversationId) {
            const exists = state.messages.some(m => m.id === message.id);
            if (!exists) {
                set({ messages: [...state.messages, message] });
            }
        }

        const isNewFromVisitor = message.sender === 'VISITOR';
        const isActive = state.activeConversationId === message.conversationId;
        const conversationExists = state.conversations.some(c => c.id === message.conversationId);

        if (isNewFromVisitor && !isActive && conversationExists) {
            playNotificationSound('new_message');
        }

        set({
            conversations: state.conversations.map(c =>
                c.id === message.conversationId
                    ? {
                        ...c,
                        messages: [message],
                        updatedAt: message.createdAt,
                        unreadCount: (isNewFromVisitor && !isActive)
                            ? (c.unreadCount || 0) + 1
                            : c.unreadCount
                    }
                    : c
            ).sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
        });

        if (isNewFromVisitor) {
            set(state => ({
                typingStatus: {
                    ...state.typingStatus,
                    [message.conversationId]: { isTyping: false, text: '' }
                }
            }));
        }
    },

    addNote: (message: Message) => {
        const state = get();
        if (state.activeConversationId === message.conversationId) {
            const exists = state.messages.some(m => m.id === message.id);
            if (!exists) {
                set({ messages: [...state.messages, message] });
            }
        }
    },

    updateConversationPin: (conversationId: string, isPinned: boolean) => {
        set(state => ({
            conversations: state.conversations.map(c =>
                c.id === conversationId ? { ...c, isPinned } : c
            ).sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
        }));
    },

    clearMention: (noteId: string) => {
        set(state => ({ mentions: state.mentions.filter(m => m.noteId !== noteId) }));
    },

    connectSocket: (token: string, projectIds: string[]) => {
        const socket = io('/', { transports: ['websocket'] });

        socket.on('connect', () => {
            const savedStatus = localStorage.getItem('operator_status') || 'online';
            socket.emit('operator_connect', { token, projectIds, status: savedStatus });
        });

        socket.on('new_message', (message: Message) => {
            get().addMessage(message);
        });

        socket.on('operator_note', (message: Message) => {
            get().addNote(message);
        });

        socket.on('operator_mention', (data: MentionNotif) => {
            playNotificationSound('mention');
            set(state => ({ mentions: [data, ...state.mentions].slice(0, 20) }));
        });

        socket.on('new_conversation', () => {
            playNotificationSound('new_conversation');
            get().fetchConversations();
        });

        socket.on('conversation_updated', () => {
            get().fetchConversations();
        });

        socket.on('typing_status', (data: { conversationId: string; sender: 'VISITOR' | 'OPERATOR'; isTyping: boolean; text?: string }) => {
            if (data.sender === 'VISITOR') {
                set(state => ({
                    typingStatus: {
                        ...state.typingStatus,
                        [data.conversationId]: { isTyping: data.isTyping, text: data.text }
                    }
                }));
            }
        });

        socket.on('visitor_online', (data: { conversationId: string; visitorId: string }) => {
            set(state => {
                const next = new Set(state.onlineVisitors);
                next.add(data.visitorId);
                return { onlineVisitors: next };
            });
        });

        socket.on('visitor_offline', (data: { conversationId: string; visitorId: string }) => {
            set(state => {
                const next = new Set(state.onlineVisitors);
                next.delete(data.visitorId);
                return { onlineVisitors: next };
            });
        });

        socket.on('live_visitors', (data: { projectId: string; visitors: LiveVisitor[] }) => {
            set({ liveVisitors: data.visitors });
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
}));;
