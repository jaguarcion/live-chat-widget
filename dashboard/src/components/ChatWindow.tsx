import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendMessage as sendMessageAPI, uploadFile, sendNote, getProjectMembers, updateConversation } from '../api';
import { playNotificationSound } from '../utils/soundUtils';
import { getAvatarSrc, getDiceBearUrl } from '../utils/avatarUtils';
import { useAuthStore } from '../store/authStore';
import QuickRepliesPanel from './QuickRepliesPanel';

const OUTCOME_OPTIONS = [
    { value: '', label: 'Без итога' },
    { value: 'RESOLVED', label: 'Решено' },
    { value: 'ESCALATED', label: 'Эскалация' },
    { value: 'NO_RESPONSE', label: 'Нет ответа' },
    { value: 'SPAM', label: 'Спам' },
];

const PRESET_TAGS = ['billing', 'support', 'bug', 'sales', 'urgent', 'vip'];

export default function ChatWindow() {
    const MAX_TEXTAREA_ROWS = 5;
    const { user } = useAuthStore();
    const { activeConversationId, messages, conversations, addMessage, typingStatus, sendTyping, addNote, fetchConversations } = useChatStore();
    const [text, setText] = useState('');
    const [noteMode, setNoteMode] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionAnchor, setMentionAnchor] = useState<number | null>(null);
    const typingTimeoutRef = useRef<any>(null);
    const [sending, setSending] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [updatingConversation, setUpdatingConversation] = useState(false);
    const [actionError, setActionError] = useState('');
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [tagsDraft, setTagsDraft] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [outcomeDraft, setOutcomeDraft] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const canSendMessage = !!activeConversationId && activeConversation?.status === 'OPEN';
    const hasText = text.trim().length > 0;
    const isAssignedToMe = !!(user?.id && activeConversation?.operatorId === user.id);
    const canClaimConversation = Boolean(activeConversationId && user?.id && !activeConversation?.operatorId && activeConversation?.status === 'OPEN');
    const canEscalateConversation = Boolean(activeConversationId && isAssignedToMe && activeConversation?.status === 'OPEN');
    const canTransferConversation = Boolean(
        activeConversationId
        && activeConversation?.status === 'OPEN'
        && (isAssignedToMe || user?.role === 'SUPER_ADMIN')
    );
    const assignmentCandidates = members.filter(member => {
        const memberUserId = member.user?.id || member.id;
        return Boolean(memberUserId && memberUserId !== activeConversation?.operatorId);
    });

    const formatMsgTime = (value: string | Date) =>
        new Date(value).toLocaleTimeString('ru-RU', { hour: 'numeric', minute: '2-digit' });

    const formatMsgDate = (value: string | Date) =>
        new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

    const parseConversationTags = (rawTags: unknown): string[] => {
        if (Array.isArray(rawTags)) {
            return rawTags
                .map(tag => String(tag || '').trim().toLowerCase())
                .filter(Boolean);
        }
        if (typeof rawTags === 'string' && rawTags.trim()) {
            try {
                const decoded = JSON.parse(rawTags);
                if (Array.isArray(decoded)) {
                    return decoded
                        .map(tag => String(tag || '').trim().toLowerCase())
                        .filter(Boolean);
                }
            } catch {
                return rawTags
                    .split(',')
                    .map(tag => tag.trim().toLowerCase())
                    .filter(Boolean);
            }
        }
        return [];
    };

    useEffect(() => {
        // Instant scroll when switching conversation
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [activeConversationId]);

    useEffect(() => {
        // Load project members for mentions — only re-run when the active conversation changes,
        // NOT on every conversations array update (would re-fetch on every socket event).
        const loadMembers = async () => {
            if (!activeConversationId) return;
            try {
                const conv = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
                if (conv) {
                    const { data } = await getProjectMembers(conv.projectId);
                    const normalizedMembers = (data || []).map((member: any) => ({
                        ...member,
                        id: member.user?.id || member.id,
                        name: member.user?.name || member.name,
                        email: member.user?.email || member.email,
                    }));
                    setMembers(normalizedMembers);
                }
            } catch (err) {
                console.error('Error loading members:', err);
            }
        };
        loadMembers();
    }, [activeConversationId]); // 'conversations' intentionally omitted — read imperatively via getState()

    useEffect(() => {
        // Smooth scroll for new messages (incoming or outgoing)
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const nextTags = parseConversationTags(activeConversation?.tags);
        setTagsDraft(nextTags);
        setOutcomeDraft(activeConversation?.outcome || '');
        setTagInput('');
    }, [activeConversationId, activeConversation?.tags, activeConversation?.outcome]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';

        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
        const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

        const maxHeight =
            lineHeight * MAX_TEXTAREA_ROWS + paddingTop + paddingBottom + borderTop + borderBottom;
        const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

        textarea.style.height = `${nextHeight}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [text]);

    const handleSend = async () => {
        if (!text.trim() || !activeConversationId || !canSendMessage) return;
        setSending(true);
        try {
            // Extract mentions in format @userId
            const mentions = text.match(/@\[(\w+)\]/g)?.map(m => m.slice(2, -1)) || [];
            
            if (noteMode) {
                // Send as internal note
                const { data } = await sendNote(activeConversationId, text.trim(), mentions);
                addNote(data);
                playNotificationSound('new_message');
            } else {
                // Send as regular message
                const { data } = await sendMessageAPI(activeConversationId, text.trim());
                addMessage(data);
                if (mentions.length > 0) playNotificationSound('mention');
            }
            
            setText('');
            setMentionQuery('');
            setMentionAnchor(null);
            setNoteMode(false);
            sendTyping(activeConversationId, false);
        } catch (err) {
            console.error('Send error:', err);
        } finally {
            setSending(false);
        }
    };

    const extractMentions = (textContent: string) => {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        const beforeCursor = textContent.slice(0, cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        
        if (lastAtIndex === -1) {
            setMentionAnchor(null);
            setMentionQuery('');
            return;
        }
        
        const query = beforeCursor.slice(lastAtIndex + 1);
        // Only show mention dropdown if typing after @ and haven't completed mention yet
        if (query && !query.includes(' ') && !query.includes('\n')) {
            setMentionQuery(query);
            setMentionAnchor(lastAtIndex);
        } else {
            setMentionAnchor(null);
            setMentionQuery('');
        }
    };

    const insertMention = (memberId: string, memberName: string) => {
        if (!textareaRef.current || mentionAnchor === null) return;
        
        const before = text.slice(0, mentionAnchor);
        const after = text.slice(mentionAnchor + mentionQuery.length + 1);
        const newText = `${before}@[${memberName}](${memberId}) ${after}`;
        
        setText(newText);
        setMentionAnchor(null);
        setMentionQuery('');
        
        // Reset cursor position
        setTimeout(() => {
            if (textareaRef.current) {
                const newPos = before.length + memberName.length + 5;
                textareaRef.current.selectionStart = newPos;
                textareaRef.current.selectionEnd = newPos;
                textareaRef.current.focus();
            }
        }, 0);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeConversationId || !canSendMessage) return;

        try {
            const { data } = await uploadFile(file);
            const type = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
            const { data: msgData } = await sendMessageAPI(activeConversationId, '', type, data.url);
            addMessage(msgData);
        } catch (err) {
            console.error('Upload error:', err);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Enter sends message, Shift+Enter adds newline
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
            return;
        }
        
        // Esc to close mention dropdown or clear note mode
        if (e.key === 'Escape') {
            if (mentionAnchor !== null) {
                setMentionAnchor(null);
                setMentionQuery('');
            } else if (noteMode) {
                setNoteMode(false);
            }
            return;
        }
        
        // Shift+Enter keeps default behavior (newline)
        if (e.key === 'Enter' && e.shiftKey) {
            return;
        }
        
        if (e.key === '/' && text === '') {
            e.preventDefault();
            setShowQuickReplies(true);
        }
    };

    const handleInsertQuickReply = (replyText: string) => {
        setText(replyText);
        setShowQuickReplies(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        // Slash at start of empty input → open quick replies
        if (newText === '/') {
            setText('');
            setShowQuickReplies(true);
            return;
        }
        setText(newText);
        extractMentions(newText);
        
        if (!activeConversationId || !canSendMessage) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        else sendTyping(activeConversationId, true);

        typingTimeoutRef.current = setTimeout(() => {
            sendTyping(activeConversationId, false);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const refreshConversationList = async () => {
        if (!activeConversation) return;
        await fetchConversations({ reset: true, projectId: activeConversation.projectId });
    };

    const handleClaimConversation = async () => {
        if (!activeConversationId || !user?.id) return;
        setActionError('');
        setUpdatingConversation(true);
        try {
            await updateConversation(activeConversationId, { operatorId: user.id });
            await refreshConversationList();
        } catch (err: any) {
            setActionError(err?.response?.data?.error || 'Не удалось назначить диалог на вас');
        } finally {
            setUpdatingConversation(false);
        }
    };

    const handleEscalateConversation = async () => {
        if (!activeConversationId || !activeConversation) return;
        setActionError('');
        setUpdatingConversation(true);
        try {
            await updateConversation(activeConversationId, { operatorId: null, status: 'OPEN' });
            await sendNote(activeConversationId, 'Эскалация: диалог передан в общую очередь для старшего оператора.');
            await refreshConversationList();
        } catch (err: any) {
            setActionError(err?.response?.data?.error || 'Не удалось выполнить эскалацию');
        } finally {
            setUpdatingConversation(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!activeConversationId || !activeConversation) return;
        setActionError('');
        setUpdatingConversation(true);
        try {
            const nextStatus = activeConversation.status === 'OPEN' ? 'CLOSED' : 'OPEN';
            await updateConversation(activeConversationId, { status: nextStatus });
            await refreshConversationList();
        } catch (err: any) {
            setActionError(err?.response?.data?.error || 'Не удалось изменить статус диалога');
        } finally {
            setUpdatingConversation(false);
        }
    };

    const handleTransferConversation = async (targetUserId: string, targetUserName: string) => {
        if (!activeConversationId) return;
        setActionError('');
        setUpdatingConversation(true);
        try {
            await updateConversation(activeConversationId, { operatorId: targetUserId, status: 'OPEN' });
            await sendNote(activeConversationId, `Передача диалога: назначен оператор ${targetUserName}.`);
            setShowTransferModal(false);
            await refreshConversationList();
        } catch (err: any) {
            setActionError(err?.response?.data?.error || 'Не удалось передать диалог оператору');
        } finally {
            setUpdatingConversation(false);
        }
    };

    const addTagDraft = (rawTag: string) => {
        const normalized = rawTag.trim().toLowerCase();
        if (!normalized) return;
        setTagsDraft(prev => (prev.includes(normalized) ? prev : [...prev, normalized].slice(0, 10)));
        setTagInput('');
    };

    const removeTagDraft = (tag: string) => {
        setTagsDraft(prev => prev.filter(existing => existing !== tag));
    };

    const handleSaveClassification = async () => {
        if (!activeConversationId) return;
        setActionError('');
        setUpdatingConversation(true);
        try {
            await updateConversation(activeConversationId, {
                tags: tagsDraft,
                outcome: outcomeDraft || null,
            });
            await refreshConversationList();
        } catch (err: any) {
            setActionError(err?.response?.data?.error || 'Не удалось сохранить теги и итог диалога');
        } finally {
            setUpdatingConversation(false);
        }
    };

    if (!activeConversationId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary mb-1">Выберите диалог</h3>
                <p className="text-[13px] font-normal text-text-muted">Выберите диалог из списка слева для начала общения</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-surface relative">
            {/* Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center cursor-zoom-out"
                    onClick={() => setLightboxImage(null)}
                >
                    <img src={lightboxImage} className="max-w-[90%] max-h-[90%] object-contain rounded shadow-2xl" />
                </div>
            )}

            {/* Header */}
            <div className="px-4 md:px-6 py-3 border-b border-border bg-surface flex items-center gap-3 z-10">
                <img
                    src={getDiceBearUrl(activeConversation?.visitor.name || activeConversation?.visitor.email || activeConversation?.visitor.id)}
                    className="w-10 h-10 rounded-full"
                    alt=""
                />
                <div>
                    <h3 className="text-[13px] font-semibold text-text-primary leading-[1.3]">
                        {activeConversation?.visitor.name || activeConversation?.visitor.email || 'Посетитель'}
                    </h3>
                    <p className="text-[11px] font-normal text-text-muted mt-0.5 leading-none">{activeConversation?.project.name}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {canClaimConversation && (
                        <button
                            onClick={handleClaimConversation}
                            disabled={updatingConversation}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 border-none cursor-pointer"
                        >
                            Взять
                        </button>
                    )}
                    {canEscalateConversation && (
                        <button
                            onClick={handleEscalateConversation}
                            disabled={updatingConversation}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 border-none cursor-pointer"
                        >
                            Эскалация
                        </button>
                    )}
                    {canTransferConversation && (
                        <button
                            onClick={() => setShowTransferModal(true)}
                            disabled={updatingConversation}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 border-none cursor-pointer"
                        >
                            Передать
                        </button>
                    )}
                    {activeConversation?.status && (
                        <button
                            onClick={handleToggleStatus}
                            disabled={updatingConversation}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface-secondary text-text-secondary hover:bg-surface-tertiary disabled:opacity-50 border border-border cursor-pointer"
                        >
                            {activeConversation.status === 'OPEN' ? 'Закрыть' : 'Открыть'}
                        </button>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${activeConversation?.status === 'OPEN'
                        ? 'bg-success/15 text-success'
                        : 'bg-text-muted/15 text-text-muted'
                        }`}>
                        {activeConversation?.status === 'OPEN' ? 'Открыт' : 'Закрыт'}
                    </span>
                </div>
            </div>

            <div className="px-4 md:px-6 py-2.5 border-b border-border bg-surface-secondary flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-text-secondary">Теги:</span>
                {tagsDraft.length === 0 && (
                    <span className="text-[11px] text-text-muted">не заданы</span>
                )}
                {tagsDraft.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        #{tag}
                        <button
                            onClick={() => removeTagDraft(tag)}
                            className="border-none bg-transparent text-primary cursor-pointer p-0 leading-none"
                            aria-label={`Удалить тег ${tag}`}
                        >
                            ×
                        </button>
                    </span>
                ))}

                <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTagDraft(tagInput);
                        }
                    }}
                    placeholder="добавить тег"
                    className="px-2 py-1 rounded-md border border-border bg-surface text-[11px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                />

                <div className="flex items-center gap-1">
                    {PRESET_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={() => addTagDraft(tag)}
                            className="px-1.5 py-0.5 rounded-md text-[10px] bg-surface border border-border text-text-secondary hover:text-text-primary cursor-pointer"
                        >
                            #{tag}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-text-secondary">Итог:</span>
                    <select
                        value={outcomeDraft}
                        onChange={(e) => setOutcomeDraft(e.target.value)}
                        className="px-2 py-1 rounded-md border border-border bg-surface text-[11px] text-text-primary"
                    >
                        {OUTCOME_OPTIONS.map(option => (
                            <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSaveClassification}
                        disabled={updatingConversation}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 border-none cursor-pointer"
                    >
                        Сохранить
                    </button>
                </div>
            </div>

            {actionError && (
                <div className="px-4 md:px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
                    <span>{actionError}</span>
                    <button
                        onClick={() => setActionError('')}
                        className="text-red-700 text-xs font-medium border-none bg-transparent cursor-pointer"
                    >
                        Скрыть
                    </button>
                </div>
            )}

            {showTransferModal && (
                <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowTransferModal(false)}>
                    <div className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-text-primary">Передать диалог оператору</h3>
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer"
                            >
                                Закрыть
                            </button>
                        </div>
                        <div className="max-h-[340px] overflow-y-auto p-3 space-y-2">
                            {assignmentCandidates.length === 0 ? (
                                <div className="text-sm text-text-muted p-3">Нет доступных операторов для передачи</div>
                            ) : assignmentCandidates.map(member => {
                                const memberUserId = member.user?.id || member.id;
                                const memberName = member.user?.name || member.name || 'Оператор';
                                const memberEmail = member.user?.email || member.email || '';
                                return (
                                    <button
                                        key={memberUserId}
                                        onClick={() => handleTransferConversation(memberUserId, memberName)}
                                        disabled={updatingConversation}
                                        className="w-full text-left px-3 py-2.5 rounded-lg border border-border bg-surface-secondary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-medium text-text-primary">{memberName}</div>
                                                <div className="text-xs text-text-muted">{memberEmail}</div>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-text-secondary font-semibold">
                                                {member.projectRole || 'OPERATOR'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 bg-surface">
                {messages.length === 0 && (
                    <div className="text-center text-text-muted text-sm py-8">Нет сообщений</div>
                )}
                {messages.map((msg, idx) => {
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showDateSeparator =
                        !prev ||
                        new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                    const isJoin = msg.type === 'OPERATOR_JOIN';
                    const isSystem = msg.type === 'SYSTEM';

                    if (isSystem) {
                        return (
                            <div key={msg.id}>
                                {showDateSeparator && (
                                    <div className="relative my-4">
                                        <div className="h-px bg-border" />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="px-3 text-[11px] font-semibold text-text-muted bg-surface leading-none uppercase tracking-[0.08em]">
                                                {formatMsgDate(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-center my-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-normal max-w-[90%]">
                                        <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="truncate">{msg.text}</span>
                                        <span className="flex-shrink-0 opacity-60">{formatMsgTime(msg.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (isJoin) {
                        return (
                            <div key={msg.id}>
                                {showDateSeparator && (
                                    <div className="relative my-4">
                                        <div className="h-px bg-border" />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="px-3 text-[11px] font-semibold text-text-muted bg-surface leading-none uppercase tracking-[0.08em]">
                                                {formatMsgDate(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 py-2.5">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <img
                                            src={getAvatarSrc(msg.user?.avatarUrl, msg.user?.name || msg.user?.title)}
                                            className="w-9 h-9 rounded-full object-cover"
                                            alt=""
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="text-[13px] font-semibold text-text-primary leading-none">{msg.user?.name || 'Оператор'}</span>
                                            <span className="text-[11px] font-normal text-text-muted leading-none">{formatMsgTime(msg.createdAt)}</span>
                                        </div>
                                        <div className="text-[12px] font-normal italic text-text-muted mt-0.5 leading-none">теперь в чате</div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id}>
                            {showDateSeparator && (
                                <div className="relative my-4">
                                    <div className="h-px bg-border" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="px-3 text-[11px] font-semibold text-text-muted bg-surface leading-none uppercase tracking-[0.08em]">
                                            {formatMsgDate(msg.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 py-2">
                                {/* Avatar */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {msg.sender === 'OPERATOR' ? (
                                        <img
                                            src={getAvatarSrc(msg.user?.avatarUrl, msg.user?.name || msg.user?.title)}
                                            className="w-9 h-9 rounded-full object-cover"
                                            alt=""
                                        />
                                    ) : (
                                        <img
                                            src={getDiceBearUrl(activeConversation?.visitor.name || activeConversation?.visitor.email || activeConversation?.visitor.id)}
                                            className="w-9 h-9 rounded-full"
                                            alt=""
                                        />
                                    )}
                                </div>

                                <div className="min-w-0 max-w-full">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-base font-semibold text-text-primary leading-none">
                                            {msg.sender === 'OPERATOR'
                                                ? (msg.user?.name || 'Оператор')
                                                : (activeConversation?.visitor.name || activeConversation?.visitor.email || 'Посетитель')}
                                        </span>
                                        <span className="text-[11px] font-normal text-text-muted leading-none">{formatMsgTime(msg.createdAt)}</span>
                                        {msg.isAutomatic && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold leading-none flex-shrink-0">
                                                авто
                                            </span>
                                        )}
                                        {msg.isNote && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 flex items-center gap-1 leading-none">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                только операторы
                                            </span>
                                        )}
                                    </div>

                                    <div className={`${msg.isNote ? 'mt-1 p-3 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60' : 'mt-0.5'}`}>

                                    {msg.type === 'IMAGE' && msg.attachmentUrl && (
                                        <img
                                            src={msg.attachmentUrl}
                                            className="max-w-[300px] rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setLightboxImage(msg.attachmentUrl!)}
                                        />
                                    )}

                                    {msg.type === 'FILE' && msg.attachmentUrl && (
                                        <a href={msg.attachmentUrl} target="_blank" className="flex items-center gap-2 p-3 rounded-xl mb-2 no-underline bg-surface-tertiary text-text-primary border border-border">
                                            <div className="w-8 h-8 rounded-lg bg-surface-primary/20 flex items-center justify-center">📄</div>
                                            <div className="overflow-hidden">
                                                <div className="text-xs font-semibold truncate">Файл</div>
                                                <div className="text-[10px] opacity-70">Нажмите для скачивания</div>
                                            </div>
                                        </a>
                                    )}

                                    {msg.text && <p className="break-words text-base font-normal leading-[1.5] whitespace-pre-wrap text-text-primary">{msg.text}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {activeConversationId && typingStatus[activeConversationId]?.isTyping && (
                    <div className="flex flex-col gap-2 mt-4 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <img
                                src={getDiceBearUrl(activeConversation?.visitor?.name || activeConversation?.visitor?.email || activeConversation?.visitor?.id)}
                                className="w-8 h-8 rounded-full"
                                alt=""
                            />
                            <span className="text-[13px] font-semibold text-text-primary">
                                {activeConversation?.visitor?.name || 'Посетитель'}
                            </span>
                            <span className="text-[11px] font-normal text-text-muted italic">печатает...</span>
                        </div>
                        <div className="ml-10 text-sm text-text-muted opacity-70 break-words max-w-[80%] line-clamp-3">
                            {typingStatus[activeConversationId]?.text || '...'}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t border-border bg-surface-secondary relative">
                {activeConversation && (
                    <QuickRepliesPanel
                        projectId={activeConversation.projectId}
                        onInsert={handleInsertQuickReply}
                        visible={showQuickReplies}
                        onClose={() => setShowQuickReplies(false)}
                    />
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />

                {/* Mention Dropdown */}
                {mentionAnchor !== null && mentionQuery && (
                    <div className="absolute bottom-[100%] left-4 right-4 mb-1 bg-surface-tertiary border border-border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                        <div className="py-1">
                            {members
                                .filter(m => m.name && m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                                .slice(0, 10)
                                .map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => insertMention(member.id, member.name)}
                                        className="px-3 py-2 hover:bg-primary/10 cursor-pointer text-sm text-text-primary flex items-center gap-2 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {member.name?.[0]?.toUpperCase()}
                                        </div>
                                        <span>{member.name}</span>
                                    </div>
                                ))}
                            {members.filter(m => m.name && m.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-sm text-text-muted">Нет совпадений</div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-end">
                    {/* Textarea wrapper with right controls */}
                    <div className={`flex-1 flex items-end rounded-lg border transition-all shadow-sm overflow-hidden ${
                        noteMode
                            ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/50 ring-2 ring-amber-200 dark:ring-amber-700/50'
                            : 'border-border bg-surface focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary'
                    }`}>
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                !canSendMessage
                                    ? 'Закрытый чат. Отправка отключена'
                                    : noteMode
                                    ? 'Внутренняя заметка (видна только операторам)...'
                                    : 'Сообщение... или / для быстрых ответов, @ для упоминания'
                            }
                            rows={1}
                            disabled={!canSendMessage}
                            className={`flex-1 px-3 py-2.5 bg-transparent text-text-primary placeholder-text-muted resize-none focus:outline-none text-[13px] leading-[1.5] min-h-[40px] ${
                                noteMode ? 'placeholder-amber-400' : ''
                            }`}
                            style={{ overflowY: 'hidden' }}
                        />
                        <div className="self-end mb-1.5 mr-1.5 flex items-center gap-1.5">
                            {/* Lock icon toggle */}
                            <button
                                onClick={() => canSendMessage && setNoteMode(!noteMode)}
                                disabled={!canSendMessage}
                                title={noteMode ? 'Заметка: видна только операторам. Нажмите, чтобы отправлять клиенту' : 'Обычное сообщение. Нажмите, чтобы переключить в режим заметки'}
                                className={`w-7 h-7 flex items-center justify-center rounded-md transition-all flex-shrink-0 cursor-pointer border-none ${
                                    noteMode
                                        ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                                        : 'text-text-muted hover:text-primary hover:bg-primary/5 bg-transparent'
                                }`}
                            >
                                {noteMode ? (
                                    /* Lock closed */
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                ) : (
                                    /* Lock open */
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>

                            {/* Attach or send action */}
                            <button
                                onClick={hasText ? handleSend : () => fileInputRef.current?.click()}
                                disabled={!canSendMessage || (hasText && sending)}
                                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0 border-none cursor-pointer ${
                                    hasText
                                        ? noteMode
                                            ? 'bg-transparent text-amber-600 hover:text-amber-700'
                                            : 'bg-transparent text-primary hover:text-primary-hover'
                                        : 'bg-transparent text-text-muted hover:text-primary hover:bg-primary/5'
                                }`}
                                title={
                                    hasText
                                        ? noteMode
                                            ? 'Сохранить заметку (Enter)'
                                            : 'Отправить (Enter)'
                                        : 'Прикрепить файл'
                                }
                            >
                                {hasText ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
