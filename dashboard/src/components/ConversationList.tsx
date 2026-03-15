import { useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { Conversation } from '../store/chatStore';

type FilterKey = 'queue' | 'mine' | 'open' | 'closed';

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'сейчас';
    if (mins < 60) return `${mins}м`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч`;
    return `${Math.floor(hours / 24)}д`;
}

function getSlaState(conversation: Conversation): { label: string; tone: string } | null {
    if (conversation.status !== 'OPEN' || (conversation.operatorReplyCount || 0) > 0) {
        return null;
    }

    const minutes = Math.floor((Date.now() - new Date(conversation.createdAt).getTime()) / 60000);
    if (minutes < 5) {
        return { label: `SLA ${minutes}м`, tone: 'bg-primary/10 text-primary' };
    }
    if (minutes < 10) {
        return { label: `SLA ${minutes}м`, tone: 'bg-amber-500/15 text-amber-600' };
    }
    return { label: `SLA ${minutes}м`, tone: 'bg-danger/15 text-danger' };
}

function ConversationItem({ conversation, isActive, isOnline }: { conversation: Conversation; isActive: boolean; isOnline: boolean }) {
    const { setActiveConversation } = useChatStore();
    const lastMessage = conversation.messages[0];
    const sla = getSlaState(conversation);
    const assignmentLabel = conversation.status === 'CLOSED'
        ? 'Закрыт'
        : conversation.operator
            ? `Ведёт ${conversation.operator.name}`
            : 'Очередь';

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
                        {lastMessage ? lastMessage.text : 'Нет сообщений'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${conversation.operator
                            ? 'bg-primary/10 text-primary'
                            : conversation.status === 'OPEN'
                                ? 'bg-success/15 text-success'
                                : 'bg-text-muted/15 text-text-muted'
                            }`}>
                            {assignmentLabel}
                        </span>
                        {sla && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sla.tone}`}>
                                {sla.label}
                            </span>
                        )}
                        {!!conversation.unreadCount && conversation.unreadCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-danger text-white font-semibold">
                                {conversation.unreadCount}
                            </span>
                        )}
                        <span className="text-[10px] text-text-muted truncate">
                            {conversation.project.name}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}

export default function ConversationList() {
    const { user } = useAuthStore();
    const { conversations, activeConversationId, loading, onlineVisitors } = useChatStore();
    const [filter, setFilter] = useState<FilterKey>('queue');

    const counts = useMemo(() => ({
        queue: conversations.filter(conv => conv.status === 'OPEN' && !conv.operatorId).length,
        mine: conversations.filter(conv => conv.status === 'OPEN' && conv.operatorId === user?.id).length,
        open: conversations.filter(conv => conv.status === 'OPEN').length,
        closed: conversations.filter(conv => conv.status === 'CLOSED').length,
    }), [conversations, user?.id]);

    const visibleConversations = useMemo(() => conversations.filter(conv => {
        if (filter === 'queue') return conv.status === 'OPEN' && !conv.operatorId;
        if (filter === 'mine') return conv.status === 'OPEN' && conv.operatorId === user?.id;
        if (filter === 'closed') return conv.status === 'CLOSED';
        return conv.status === 'OPEN';
    }), [conversations, filter, user?.id]);

    const filterButtons: Array<{ key: FilterKey; label: string }> = [
        { key: 'queue', label: 'Очередь' },
        { key: 'mine', label: 'Мои' },
        { key: 'open', label: 'Открытые' },
        { key: 'closed', label: 'Закрытые' },
    ];

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
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-3 py-3 border-b border-border bg-surface-secondary/70 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-2">
                    {filterButtons.map(button => (
                        <button
                            key={button.key}
                            onClick={() => setFilter(button.key)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${filter === button.key
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-surface text-text-muted border-border hover:text-text-primary hover:bg-surface-tertiary'
                                }`}
                        >
                            {button.label} ({counts[button.key]})
                        </button>
                    ))}
                </div>
            </div>

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
                />
                ))}
            </div>
        </div>
    );
}
