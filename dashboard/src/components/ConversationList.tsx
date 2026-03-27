import { useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import type { Conversation } from '../store/chatStore';
import { getDiceBearUrl } from '../utils/avatarUtils';
import { useProjectStore } from '../store/projectStore';

const ITEM_HEIGHT = 92;
const OVERSCAN = 8;

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
            className={`w-full text-left px-3 py-3 border-b border-border transition-all cursor-pointer border-x-0 border-t-0 hover:bg-surface-secondary ${isActive
                ? 'bg-primary/5 !border-l-[3px] !border-l-primary'
                : 'bg-transparent'
                }`}
        >
            <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <img
                    src={getDiceBearUrl(conversation.visitor.name || conversation.visitor.email || conversation.visitor.id)}
                    className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                    alt=""
                />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[13px] font-semibold text-text-primary truncate flex items-center gap-1.5 leading-[1.3]">
                            {conversation.visitor.name || conversation.visitor.email || `Посетитель`}
                            {isOnline && (
                                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                </span>
                            )}
                        </span>
                        <span className="text-[11px] font-normal text-text-muted flex-shrink-0 ml-2 leading-[1.3]">
                            {timeAgo(conversation.updatedAt)}
                        </span>
                    </div>
                    <p className="text-[12px] font-normal text-text-muted truncate leading-[1.4] mt-0.5">
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-danger text-white font-semibold leading-none">
                                {conversation.unreadCount}
                            </span>
                        )}
                        <span className="text-[11px] font-normal text-text-muted truncate leading-none">
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

export default function ConversationList({ conversations: inputConversations }: { conversations?: Conversation[] }) {
    const {
        conversations,
        activeConversationId,
        loading,
        onlineVisitors,
        typingStatus,
        loadMoreConversations,
        hasMoreConversations,
        loadingMoreConversations,
        fetchConversations,
        setConversationFilters,
    } = useChatStore();
    const { selectedProjectId } = useProjectStore();
    const filterScope = selectedProjectId || 'all-projects';
    const statusStorageKey = `operator_status_filter_${filterScope}`;
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>(() =>
        (localStorage.getItem(statusStorageKey) as 'ALL' | 'OPEN' | 'CLOSED') || 'ALL'
    );
    const listRef = useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(620);
    const sourceConversations = inputConversations ?? conversations;

    const persistFilters = (nextStatus: 'ALL' | 'OPEN' | 'CLOSED') => {
        localStorage.setItem(statusStorageKey, nextStatus);
    };

    useEffect(() => {
        const nextStatus = (localStorage.getItem(statusStorageKey) as 'ALL' | 'OPEN' | 'CLOSED') || 'ALL';
        setStatusFilter(nextStatus);
    }, [statusStorageKey]);

    useEffect(() => {
        if (!listRef.current) return;
        setViewportHeight(listRef.current.clientHeight || 620);
    }, []);

    useEffect(() => {
        setConversationFilters({
            query: '',
            status: statusFilter,
            operator: 'all',
        });

        const timer = setTimeout(() => {
            fetchConversations({
                reset: true,
                projectId: selectedProjectId || undefined,
                query: '',
                status: statusFilter,
                operator: 'all',
            });
        }, 250);

        return () => clearTimeout(timer);
    }, [statusFilter, selectedProjectId]);

    const visibleConversations = useMemo(() => {
        let filtered = [...sourceConversations];

        // Apply status filter
        if (statusFilter === 'OPEN') {
            filtered = filtered.filter(c => c.status === 'OPEN');
        } else if (statusFilter === 'CLOSED') {
            filtered = filtered.filter(c => c.status === 'CLOSED');
        }

        // Sort by most recently updated
        filtered.sort((a, b) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        return filtered;
    }, [sourceConversations, statusFilter]);

    const startIndex = Math.max(Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN, 0);
    const endIndex = Math.min(
        Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + OVERSCAN,
        visibleConversations.length
    );
    const virtualConversations = visibleConversations.slice(startIndex, endIndex);
    const topSpacer = startIndex * ITEM_HEIGHT;
    const bottomSpacer = (visibleConversations.length - endIndex) * ITEM_HEIGHT;

    if (loading && sourceConversations.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-text-muted text-sm">Загрузка...</div>
            </div>
        );
    }

    if (sourceConversations.length === 0) {
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
            <div className="px-3 py-2.5 border-b border-border bg-surface-secondary flex items-center gap-1.5 flex-shrink-0">
                <button
                    onClick={() => { setStatusFilter('ALL'); persistFilters('ALL'); }}
                    className={`text-[12px] font-medium px-2.5 py-1 rounded-md transition-all ${
                        statusFilter === 'ALL'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:bg-surface-tertiary'
                    }`}
                >
                    Все
                </button>
                <button
                    onClick={() => { setStatusFilter('OPEN'); persistFilters('OPEN'); }}
                    className={`text-[12px] font-medium px-2.5 py-1 rounded-md transition-all ${
                        statusFilter === 'OPEN'
                            ? 'bg-success text-white'
                            : 'text-text-secondary hover:bg-surface-tertiary'
                    }`}
                >
                    Открыты
                </button>
                <button
                    onClick={() => { setStatusFilter('CLOSED'); persistFilters('CLOSED'); }}
                    className={`text-[12px] font-medium px-2.5 py-1 rounded-md transition-all ${
                        statusFilter === 'CLOSED'
                            ? 'bg-danger text-white'
                            : 'text-text-secondary hover:bg-surface-tertiary'
                    }`}
                >
                    Закрыты
                </button>
            </div>

            {/* Conversations List */}
            <div
                ref={listRef}
                onScroll={(e) => {
                    const target = e.currentTarget;
                    setScrollTop(target.scrollTop);
                    setViewportHeight(target.clientHeight);
                }}
                className="flex-1 overflow-y-auto"
            >
                {visibleConversations.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-text-muted">
                        Для этого фильтра диалогов нет
                    </div>
                ) : (
                    <>
                        {topSpacer > 0 && <div style={{ height: topSpacer }} />}
                        {virtualConversations.map((conv) => (
                            <ConversationItem
                                key={conv.id}
                                conversation={conv}
                                isActive={activeConversationId === conv.id}
                                isOnline={onlineVisitors.has(conv.visitorId)}
                                isTyping={typingStatus[conv.id]?.isTyping || false}
                            />
                        ))}
                        {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
                    </>
                )}
                {hasMoreConversations && (
                    <div className="p-3 border-t border-border bg-surface-secondary">
                        <button
                            onClick={() => loadMoreConversations(selectedProjectId || undefined)}
                            disabled={loadingMoreConversations}
                            className="w-full py-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {loadingMoreConversations ? 'Загрузка...' : 'Загрузить еще'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
