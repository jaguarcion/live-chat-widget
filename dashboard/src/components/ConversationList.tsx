import { useMemo, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import type { Conversation } from '../store/chatStore';

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'сейчас';
    if (mins < 60) return `${mins}м`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч`;
    return `${Math.floor(hours / 24)}д`;
}

function ConversationItem({ conversation, isActive, isOnline, isTyping }: { conversation: Conversation; isActive: boolean; isOnline: boolean; isTyping: boolean }) {
    const { setActiveConversation } = useChatStore();
    const lastMessage = conversation.messages[0];

    return (
        <button
            onClick={() => setActiveConversation(conversation.id)}
            className={`w-full text-left p-4 border-b border-border transition-all cursor-pointer border-x-0 border-t-0 hover:bg-surface-secondary ${isActive
                ? 'bg-primary/5 !border-l-4 !border-l-primary'
                : 'bg-transparent'
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-surface-tertiary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                            {conversation.isPinned && (
                                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                            )}
                            {conversation.visitor.name || conversation.visitor.email || `Посетитель`}
                            {isOnline && (
                                <span className="relative flex h-2 w-2 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            )}
                        </span>
                        <span className="text-xs text-text-muted flex-shrink-0 ml-2">
                            {timeAgo(conversation.updatedAt)}
                        </span>
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                        {isTyping ? (
                            <span className="flex items-center gap-1">
                                <span>печатает</span>
                                <span className="flex gap-0.5">
                                    <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                    <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                    <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                </span>
                            </span>
                        ) : (
                            lastMessage ? lastMessage.text : 'Нет сообщений'
                        )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        {!!conversation.unreadCount && conversation.unreadCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-danger text-white font-semibold">
                                {conversation.unreadCount}
                            </span>
                        )}
                        <span className="text-[10px] text-text-muted truncate">
                            {conversation.status === 'OPEN' ? (
                                <span className="text-success">Открыт</span>
                            ) : (
                                <span className="text-text-muted">Закрыт</span>
                            )}
                            {' • '}
                            {conversation.project.name}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}

export default function ConversationList() {
    const { conversations, activeConversationId, loading, onlineVisitors, typingStatus } = useChatStore();
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
    const [pinnedFilter, setPinnedFilter] = useState(false);

    const visibleConversations = useMemo(() => {
        let filtered = conversations;

        // Apply status filter
        if (statusFilter === 'OPEN') {
            filtered = filtered.filter(c => c.status === 'OPEN');
        } else if (statusFilter === 'CLOSED') {
            filtered = filtered.filter(c => c.status === 'CLOSED');
        }

        // Apply pinned filter
        if (pinnedFilter) {
            filtered = filtered.filter(c => c.isPinned);
        }

        // Sort: pinned first, then by updatedAt
        filtered.sort((a, b) => {
            if (a.isPinned !== b.isPinned) {
                return (a.isPinned ? 0 : 1) - (b.isPinned ? 0 : 1);
            }
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        return filtered;
    }, [conversations, statusFilter, pinnedFilter]);

    if (loading && conversations.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-text-muted text-sm">Загрузка...</div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <svg className="w-12 h-12 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-text-muted text-sm">Нет диалогов</p>
                <p className="text-text-muted text-xs mt-1">Ожидание сообщений от посетителей</p>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-surface">
            {/* Filter Bar */}
            <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                        statusFilter === 'ALL'
                            ? 'bg-primary text-white'
                            : 'bg-surface text-text-secondary hover:bg-surface-tertiary'
                    }`}
                >
                    Все
                </button>
                <button
                    onClick={() => setStatusFilter('OPEN')}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                        statusFilter === 'OPEN'
                            ? 'bg-success text-white'
                            : 'bg-surface text-text-secondary hover:bg-surface-tertiary'
                    }`}
                >
                    Открыты
                </button>
                <button
                    onClick={() => setStatusFilter('CLOSED')}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                        statusFilter === 'CLOSED'
                            ? 'bg-danger text-white'
                            : 'bg-surface text-text-secondary hover:bg-surface-tertiary'
                    }`}
                >
                    Закрыты
                </button>

                <div className="w-px h-4 bg-border mx-1"></div>

                <button
                    onClick={() => setPinnedFilter(!pinnedFilter)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1 ${
                        pinnedFilter
                            ? 'bg-primary/20 text-primary'
                            : 'bg-surface text-text-secondary hover:bg-surface-tertiary'
                    }`}
                >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Закреп.
                </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {visibleConversations.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-text-muted">
                        Для этого фильтра диалогов нет
                    </div>
                ) : visibleConversations.map((conv) => (
                <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    isOnline={onlineVisitors.has(conv.visitorId)}
                    isTyping={typingStatus[conv.id]?.isTyping || false}
                />
                ))}
            </div>
        </div>
    );
}
