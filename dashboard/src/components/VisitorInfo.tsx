import { useState, useEffect } from 'react';
import type { Conversation } from '../store/chatStore';
import { updateConversation, updateVisitor, getVisitorPages } from '../api';
import { useChatStore } from '../store/chatStore';
import { format } from 'date-fns';
import { getDiceBearUrl } from '../utils/avatarUtils';

interface Props {
    conversation: Conversation;
}

export default function VisitorInfo({ conversation }: Props) {
    const { fetchConversations } = useChatStore();
    const { visitor } = conversation;

    const [notes, setNotes] = useState(visitor.notes || '');
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);
    const [pages, setPages] = useState<any[]>([]);
    const [visiblePagesCount, setVisiblePagesCount] = useState(5);

    // Sync notes when visitor changes
    useEffect(() => {
        setNotes(visitor.notes || '');
        setNotesSaved(false);

        // Fetch pages
        getVisitorPages(visitor.id)
            .then(res => setPages(res.data))
            .catch(err => console.error('Failed to fetch pages:', err));
    }, [visitor.id, visitor.notes]);

    const handleSaveNotes = async () => {
        setSavingNotes(true);
        try {
            await updateVisitor(visitor.id, { notes });
            setNotesSaved(true);
            setTimeout(() => setNotesSaved(false), 2000);
        } catch (err) {
            console.error('Failed to save notes:', err);
        } finally {
            setSavingNotes(false);
        }
    };

    const handleClose = async () => {
        try {
            await updateConversation(conversation.id, { status: 'CLOSED' });
            fetchConversations();
        } catch (err) {
            console.error('Failed to close conversation:', err);
        }
    };

    const handleReopen = async () => {
        try {
            await updateConversation(conversation.id, { status: 'OPEN' });
            fetchConversations();
        } catch (err) {
            console.error('Failed to reopen conversation:', err);
        }
    };

    const infoItems = [
        { label: 'ID', value: visitor.id.slice(0, 8) + '...' },
        { label: 'Email', value: visitor.email || '—' },
        { label: 'Страна', value: visitor.country || '—' },
        { label: 'Устройство', value: visitor.device || '—' },
        { label: 'Referrer', value: visitor.referrer || '—' },
    ];

    let utmData = null;
    try {
        if ((visitor as any).utmData) {
            utmData = JSON.parse((visitor as any).utmData);
        }
    } catch (e) { }

    return (
        <div className="p-4 flex flex-col h-full overflow-y-auto">
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
                Посетитель
            </h3>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
                <img
                    src={getDiceBearUrl(visitor.name || visitor.email || visitor.id)}
                    className="w-16 h-16 rounded-full mb-2"
                    alt=""
                />
                <span className="text-sm font-medium text-text-primary">
                    {visitor.name || visitor.email || 'Аноним'}
                </span>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-6">
                {infoItems.map((item) => (
                    <div key={item.label}>
                        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">{item.label}</span>
                        <p className="text-sm text-text-secondary mt-0.5 break-all">{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Operator info */}
            {conversation.operator && (
                <div className="mb-6">
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Оператор</span>
                    <p className="text-sm text-text-secondary mt-0.5">{conversation.operator.name}</p>
                </div>
            )}

            {/* UTM */}
            {utmData && (
                <div className="mb-6">
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2 block">UTM Метки</span>
                    <div className="bg-surface-tertiary rounded-lg p-3 space-y-2">
                        {Object.entries(utmData).map(([key, value]) => value ? (
                            <div key={key} className="flex justify-between items-center text-xs">
                                <span className="text-text-muted">{key}:</span>
                                <span className="text-text-primary font-medium">{String(value)}</span>
                            </div>
                        ) : null)}
                    </div>
                </div>
            )}

            {/* Pages */}
            {pages.length > 0 && (
                <div className="mb-6">
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2 block">Последние страницы</span>
                    <div className="space-y-2">
                        {pages.slice(0, visiblePagesCount).map(page => (
                            <div key={page.id} className="bg-surface-tertiary rounded-lg p-2">
                                <a
                                    href={page.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-primary hover:underline font-medium line-clamp-1 block mb-1"
                                    title={page.title || page.url}
                                >
                                    {page.title || page.url}
                                </a>
                                <div className="text-[10px] text-text-muted flex justify-between">
                                    <span className="truncate mr-2 max-w-[150px]" title={page.url}>{new URL(page.url).pathname}</span>
                                    <span>{format(new Date(page.createdAt), 'HH:mm:ss')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {pages.length > visiblePagesCount && (
                        <button
                            onClick={() => setVisiblePagesCount(prev => prev + 5)}
                            className="w-full mt-2 py-1.5 rounded-lg bg-surface-tertiary text-text-muted text-xs font-medium hover:bg-surface-tertiary/80 hover:text-text-secondary transition-all border-none cursor-pointer"
                        >
                            Показать больше ({pages.length - visiblePagesCount})
                        </button>
                    )}
                </div>
            )}

            {/* Editable Notes */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Заметки</span>
                    {notesSaved && (
                        <span className="text-[10px] text-success">Сохранено ✓</span>
                    )}
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Добавить заметку..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes || notes === (visitor.notes || '')}
                    className="w-full mt-2 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-all disabled:opacity-40 border-none cursor-pointer"
                >
                    {savingNotes ? 'Сохранение...' : 'Сохранить заметку'}
                </button>
            </div>

            {/* Actions */}
            <div className="mt-auto">
                {conversation.status === 'OPEN' ? (
                    <button
                        onClick={handleClose}
                        className="w-full py-2 rounded-lg bg-danger/15 text-danger text-sm font-medium hover:bg-danger/25 transition-all border-none cursor-pointer"
                    >
                        Закрыть диалог
                    </button>
                ) : (
                    <button
                        onClick={handleReopen}
                        className="w-full py-2 rounded-lg bg-success/15 text-success text-sm font-medium hover:bg-success/25 transition-all border-none cursor-pointer"
                    >
                        Открыть диалог
                    </button>
                )}
            </div>
        </div>
    );
}
