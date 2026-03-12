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

function ConversationItem({ conversation, isActive, isOnline }: { conversation: Conversation; isActive: boolean; isOnline: boolean }) {
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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${conversation.status === 'OPEN'
                            ? 'bg-success/15 text-success'
                            : 'bg-text-muted/15 text-text-muted'
                            }`}>
                            {conversation.status === 'OPEN' ? 'Открыт' : 'Закрыт'}
                        </span>
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
    const { conversations, activeConversationId, loading, onlineVisitors } = useChatStore();

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
        <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
                <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    isOnline={onlineVisitors.has(conv.visitorId)}
                />
            ))}
        </div>
    );
}
