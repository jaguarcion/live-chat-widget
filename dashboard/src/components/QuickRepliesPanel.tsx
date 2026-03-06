import { useState, useEffect } from 'react';
import { getQuickReplies, createQuickReply, deleteQuickReply } from '../api';

interface QuickReply {
    id: string;
    title: string;
    text: string;
    shortcut: string | null;
}

interface Props {
    projectId: string;
    onInsert: (text: string) => void;
    visible: boolean;
    onClose: () => void;
}

export default function QuickRepliesPanel({ projectId, onInsert, visible, onClose }: Props) {
    const [replies, setReplies] = useState<QuickReply[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newText, setNewText] = useState('');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (visible && projectId) {
            loadReplies();
        }
    }, [visible, projectId]);

    const loadReplies = async () => {
        try {
            const { data } = await getQuickReplies(projectId);
            setReplies(data);
        } catch (err) {
            console.error('Failed to load quick replies:', err);
        }
    };

    const handleAdd = async () => {
        if (!newTitle.trim() || !newText.trim()) return;
        try {
            await createQuickReply(projectId, { title: newTitle.trim(), text: newText.trim() });
            setNewTitle('');
            setNewText('');
            setShowAddForm(false);
            loadReplies();
        } catch (err) {
            console.error('Failed to add quick reply:', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteQuickReply(id);
            setReplies(r => r.filter(item => item.id !== id));
        } catch (err) {
            console.error('Failed to delete quick reply:', err);
        }
    };

    const filtered = replies.filter(r =>
        r.title.toLowerCase().includes(filter.toLowerCase()) ||
        r.text.toLowerCase().includes(filter.toLowerCase())
    );

    if (!visible) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-surface-secondary border border-border rounded-xl shadow-2xl max-h-80 flex flex-col overflow-hidden z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-text-primary">Быстрые ответы</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="text-xs text-primary hover:text-primary-light transition-colors bg-transparent border-none cursor-pointer"
                    >
                        {showAddForm ? 'Отмена' : '+ Добавить'}
                    </button>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer text-lg leading-none"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Add form */}
            {showAddForm && (
                <div className="p-3 border-b border-border space-y-2">
                    <input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Название (например: «Приветствие»)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-text-primary text-xs placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <textarea
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        placeholder="Текст быстрого ответа..."
                        rows={2}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-text-primary text-xs placeholder-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newTitle.trim() || !newText.trim()}
                        className="w-full py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-all disabled:opacity-40 border-none cursor-pointer"
                    >
                        Сохранить
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="px-3 py-2">
                <input
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-text-primary text-xs placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
                {filtered.length === 0 && (
                    <div className="p-4 text-center text-text-muted text-xs">
                        {replies.length === 0 ? 'Нет быстрых ответов. Нажмите «+ Добавить»' : 'Ничего не найдено'}
                    </div>
                )}
                {filtered.map(reply => (
                    <div
                        key={reply.id}
                        className="px-3 py-2 hover:bg-surface-tertiary/50 cursor-pointer transition-colors flex items-start gap-2 group"
                    >
                        <div className="flex-1 min-w-0" onClick={() => { onInsert(reply.text); onClose(); }}>
                            <span className="text-xs font-medium text-text-primary block">{reply.title}</span>
                            <span className="text-[11px] text-text-muted truncate block">{reply.text}</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(reply.id); }}
                            className="opacity-0 group-hover:opacity-100 text-danger text-xs bg-transparent border-none cursor-pointer transition-opacity flex-shrink-0 mt-0.5"
                            title="Удалить"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
