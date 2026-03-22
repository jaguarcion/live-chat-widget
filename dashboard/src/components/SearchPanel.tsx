import { useState, useRef, useCallback } from 'react';
import { searchConversations } from '../api';
import { useChatStore } from '../store/chatStore';

interface SearchConversation {
    id: string;
    status: string;
    updatedAt: string;
    visitor: { id: string; name?: string; email?: string };
    project: { id: string; name: string };
    messages: Array<{ text?: string }>;
}

interface MessageHit {
    messageId: string;
    text: string;
    sender: string;
    createdAt: string;
    conversation: SearchConversation;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'сейчас';
    if (mins < 60) return `${mins}м`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч`;
    return `${Math.floor(hours / 24)}д`;
}

function visitorName(v: SearchConversation['visitor']) {
    return v.name || v.email || 'Посетитель';
}

function highlight(text: string, query: string) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-primary/20 text-primary rounded-sm">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

type Tab = 'visitors' | 'messages';

interface Props {
    onOpenConversation: () => void;
}

export default function SearchPanel({ onOpenConversation }: Props) {
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState<Tab>('visitors');
    const [loading, setLoading] = useState(false);
    const [visitors, setVisitors] = useState<SearchConversation[]>([]);
    const [messages, setMessages] = useState<MessageHit[]>([]);
    const [searched, setSearched] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { setActiveConversation } = useChatStore();

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setVisitors([]);
            setMessages([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        try {
            const { data } = await searchConversations(q.trim());
            setVisitors(data.visitors || []);
            setMessages(data.messages || []);
            setSearched(true);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 350);
    };

    const openConversation = (id: string) => {
        setActiveConversation(id);
        onOpenConversation();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary mb-3">Поиск</h2>
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={handleChange}
                        placeholder="Поиск по посетителям и сообщениям..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-tertiary border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {(['visitors', 'messages'] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2.5 text-sm font-medium border-none cursor-pointer transition-colors ${tab === t ? 'text-primary border-b-2 border-primary bg-transparent' : 'text-text-muted bg-transparent hover:text-text-primary'}`}
                    >
                        {t === 'visitors' ? 'Посетители' : 'Сообщения'}
                        {searched && (
                            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-surface-tertiary text-text-muted">
                                {t === 'visitors' ? visitors.length : messages.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
                {!searched && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <svg className="w-12 h-12 text-text-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-sm text-text-muted">Введите запрос для поиска</p>
                        <p className="text-xs text-text-muted/70 mt-1">По имени, email посетителя или тексту сообщений</p>
                    </div>
                )}

                {searched && tab === 'visitors' && (
                    visitors.length === 0 ? (
                        <div className="text-center text-sm text-text-muted py-12">Посетители не найдены</div>
                    ) : visitors.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => openConversation(conv.id)}
                            className="w-full text-left px-4 py-3.5 border-b border-border hover:bg-surface-secondary transition-colors cursor-pointer bg-transparent"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-surface-tertiary flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-text-primary truncate">
                                            {highlight(visitorName(conv.visitor), query)}
                                        </span>
                                        <span className="text-xs text-text-muted flex-shrink-0 ml-2">{timeAgo(conv.updatedAt)}</span>
                                    </div>
                                    <p className="text-xs text-text-muted truncate mt-0.5">
                                        {conv.messages[0]?.text || 'Нет сообщений'}
                                    </p>
                                    <span className="text-[10px] text-text-muted">{conv.project.name}</span>
                                </div>
                            </div>
                        </button>
                    ))
                )}

                {searched && tab === 'messages' && (
                    messages.length === 0 ? (
                        <div className="text-center text-sm text-text-muted py-12">Сообщения не найдены</div>
                    ) : messages.map(hit => (
                        <button
                            key={hit.messageId}
                            onClick={() => openConversation(hit.conversation.id)}
                            className="w-full text-left px-4 py-3.5 border-b border-border hover:bg-surface-secondary transition-colors cursor-pointer bg-transparent"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${hit.sender === 'OPERATOR' ? 'bg-primary/10' : 'bg-surface-tertiary'}`}>
                                    <svg className={`w-4 h-4 ${hit.sender === 'OPERATOR' ? 'text-primary' : 'text-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-sm font-medium text-text-primary truncate">
                                            {visitorName(hit.conversation.visitor)}
                                        </span>
                                        <span className="text-xs text-text-muted flex-shrink-0 ml-2">{timeAgo(hit.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary line-clamp-2">
                                        {highlight(hit.text, query)}
                                    </p>
                                    <span className="text-[10px] text-text-muted">{hit.conversation.project.name}</span>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
