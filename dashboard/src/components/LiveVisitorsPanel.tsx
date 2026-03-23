import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

export default function LiveVisitorsPanel() {
    const { liveVisitors, setActiveConversation } = useChatStore();
    const { user } = useAuthStore();

    if (liveVisitors.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <svg className="w-12 h-12 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="text-text-muted text-sm">Нет посетителей онлайн</p>
                <p className="text-text-muted text-xs mt-1">Ожидание посетителей...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-surface-secondary overflow-y-auto">
            <div className="p-4 border-b border-border bg-surface sticky top-0 z-10">
                <h2 className="text-sm font-bold text-text-primary">Онлайн ({liveVisitors.length})</h2>
                <p className="text-xs text-text-muted mt-0.5">Посетители на сайте прямо сейчас</p>
            </div>

            <div className="flex-1 divide-y divide-border overflow-y-auto">
                {liveVisitors.map((visitor) => (
                    <div
                        key={visitor.visitorId}
                        onClick={() => visitor.conversationId && setActiveConversation(visitor.conversationId)}
                        className="p-4 hover:bg-surface-tertiary transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center border border-border">
                                    <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                    {visitor.name || visitor.email || 'Посетитель'}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                    {visitor.email && visitor.name ? visitor.email : ''}
                                </p>
                            </div>
                        </div>

                        {visitor.url && (
                            <div className="mb-2">
                                <p className="text-xs text-text-muted mb-1">Страница:</p>
                                <p className="text-xs bg-surface-secondary rounded px-2 py-1 truncate text-text-secondary">
                                    {visitor.url}
                                </p>
                            </div>
                        )}

                        {visitor.referrer && (
                            <div className="mb-2">
                                <p className="text-xs text-text-muted">Источник: <span className="text-text-secondary">{visitor.referrer}</span></p>
                            </div>
                        )}

                        <p className="text-[10px] text-text-muted">
                            Онлайн {new Date(visitor.connectedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                visitor.conversationId && setActiveConversation(visitor.conversationId);
                            }}
                            className="w-full mt-2 px-2 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors"
                        >
                            Открыть чат
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
