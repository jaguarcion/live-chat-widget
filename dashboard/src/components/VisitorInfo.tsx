import { useState, useEffect } from 'react';
import type { Conversation } from '../store/chatStore';
import { updateConversation, updateVisitor } from '../api';
import { useChatStore } from '../store/chatStore';

interface Props {
    conversation: Conversation;
}

export default function VisitorInfo({ conversation }: Props) {
    const { fetchConversations } = useChatStore();
    const { visitor } = conversation;

    const [notes, setNotes] = useState(visitor.notes || '');
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);

    // Sync notes when visitor changes
    useEffect(() => {
        setNotes(visitor.notes || '');
        setNotesSaved(false);
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

    return (
        <div className="p-4 flex flex-col h-full overflow-y-auto">
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
                Посетитель
            </h3>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-surface-tertiary flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
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
