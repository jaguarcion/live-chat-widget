import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendMessage as sendMessageAPI, uploadFile, sendNote, pinConversation, getProjectMembers } from '../api';
import { playNotificationSound } from '../utils/soundUtils';
import QuickRepliesPanel from './QuickRepliesPanel';

export default function ChatWindow() {
    const { activeConversationId, messages, conversations, addMessage, typingStatus, sendTyping, addNote, updateConversationPin } = useChatStore();
    const [text, setText] = useState('');
    const [noteMode, setNoteMode] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionAnchor, setMentionAnchor] = useState<number | null>(null);
    const typingTimeoutRef = useRef<any>(null);
    const [sending, setSending] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const canSendMessage = !!activeConversationId && activeConversation?.status === 'OPEN';

    useEffect(() => {
        // Instant scroll when switching conversation
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [activeConversationId]);

    useEffect(() => {
        // Load project members for mentions
        const loadMembers = async () => {
            if (!activeConversationId) return;
            try {
                const conv = conversations.find(c => c.id === activeConversationId);
                if (conv) {
                    const { data } = await getProjectMembers(conv.projectId);
                    setMembers(data || []);
                }
            } catch (err) {
                console.error('Error loading members:', err);
            }
        };
        loadMembers();
    }, [activeConversationId, conversations]);

    useEffect(() => {
        // Smooth scroll for new messages (incoming or outgoing)
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    const insertScreenShare = () => {
        const jitsiLink = `https://meet.jit.si/${activeConversationId}-${Date.now()}`;
        const newText = text + (text ? '\n' : '') + `Давайте поговорим на видео: ${jitsiLink}`;
        setText(newText);
        textareaRef.current?.focus();
    };

    const handlePin = async () => {
        if (!activeConversationId) return;
        try {
            const conversation = conversations.find(c => c.id === activeConversationId);
            const newPinnedState = !conversation?.isPinned;
            await pinConversation(activeConversationId);
            updateConversationPin(activeConversationId, newPinnedState);
        } catch (err) {
            console.error('Pin error:', err);
        }
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
        // Ctrl/Cmd + Enter to send
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
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
        
        // Regular Enter (without Ctrl) doesn't send, just adds newline
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            return; // Default behavior: add newline
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

    if (!activeConversationId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">Выберите диалог</h3>
                <p className="text-sm text-text-muted">Выберите диалог из списка слева для начала общения</p>
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
            <div className="px-6 py-4 border-b border-border bg-surface flex items-center gap-3 shadow-sm z-10">
                <div className="w-10 h-10 rounded-full bg-surface-tertiary flex items-center justify-center border border-border">
                    <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                        {activeConversation?.visitor.name || activeConversation?.visitor.email || 'Посетитель'}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">{activeConversation?.project.name}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={handlePin}
                        title={activeConversation?.isPinned ? 'Открепить' : 'Закрепить'}
                        className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                    >
                        <svg className={`w-5 h-5 ${activeConversation?.isPinned ? 'text-primary fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                    <span className={`text-xs px-2 py-1 rounded-full ${activeConversation?.status === 'OPEN'
                        ? 'bg-success/15 text-success'
                        : 'bg-text-muted/15 text-text-muted'
                        }`}>
                        {activeConversation?.status === 'OPEN' ? 'Открыт' : 'Закрыт'}
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-text-muted text-sm py-8">Нет сообщений</div>
                )}
                {messages.map((msg) => {
                    const isJoin = msg.type === 'OPERATOR_JOIN';

                    if (isJoin) {
                        return (
                            <div key={msg.id} className="flex flex-col items-center justify-center py-6 animate-fade-in">
                                <div className="relative mb-3">
                                    {msg.user?.avatarUrl ? (
                                        <img src={msg.user.avatarUrl} className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-white" alt="Avatar" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-white">
                                            {msg.user?.name?.[0] || 'O'}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-text-primary">{msg.user?.name}</div>
                                    {msg.user?.title && <div className="text-xs text-text-muted mt-0.5">{msg.user.title}</div>}
                                    <div className="text-[11px] text-text-muted italic mt-1">теперь в чате</div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.sender === 'OPERATOR' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-1">
                                {msg.sender === 'OPERATOR' ? (
                                    msg.user?.avatarUrl ? (
                                        <img src={msg.user.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                                            {msg.user?.name?.[0] || 'O'}
                                        </div>
                                    )
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-[10px] font-bold text-text-muted">
                                        {activeConversation?.visitor.name?.[0] || 'V'}
                                    </div>
                                )}
                            </div>

                            <div className={`flex flex-col max-w-[75%] ${msg.sender === 'OPERATOR' ? 'items-end' : 'items-start'}`}>
                                {msg.sender === 'OPERATOR' && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] text-text-muted">
                                            {msg.user?.name || 'Оператор'}
                                        </span>
                                        {msg.isNote && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" opacity="0.3"/>
                                                    <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                                                </svg>
                                                Заметка
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className={`${
                                    msg.isNote
                                        ? 'bg-amber-100 text-amber-900 rounded-lg border border-amber-300'
                                        : msg.sender === 'OPERATOR'
                                        ? 'bg-primary text-white rounded-lg rounded-tr-none'
                                        : 'bg-surface-tertiary text-text-primary rounded-lg rounded-tl-none border border-border'
                                    } px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]`}>

                                    {msg.type === 'IMAGE' && msg.attachmentUrl && (
                                        <img
                                            src={msg.attachmentUrl}
                                            className="max-w-[300px] rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setLightboxImage(msg.attachmentUrl!)}
                                        />
                                    )}

                                    {msg.type === 'FILE' && msg.attachmentUrl && (
                                        <a
                                            href={msg.attachmentUrl}
                                            target="_blank"
                                            className={`flex items-center gap-2 p-3 rounded-xl mb-2 no-underline ${msg.sender === 'OPERATOR' ? 'bg-white/10 text-white' : 'bg-surface-tertiary text-text-primary'
                                                }`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-surface-primary/20 flex items-center justify-center">📄</div>
                                            <div className="overflow-hidden">
                                                <div className="text-xs font-semibold truncate">Файл</div>
                                                <div className="text-[10px] opacity-70">Нажмите для скачивания</div>
                                            </div>
                                        </a>
                                    )}

                                    {msg.text && <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

                                    <p className={`text-[10px] mt-1.5 ${msg.sender === 'OPERATOR' ? 'text-white/60 text-right' : 'text-text-muted'
                                        }`}>
                                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {activeConversationId && typingStatus[activeConversationId]?.isTyping && (
                    <div className="flex flex-col gap-2 mt-4 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center text-xs font-bold ring-2 ring-surface-primary">
                                {activeConversation?.visitor?.name?.[0] || 'V'}
                            </div>
                            <span className="text-xs font-semibold text-text-secondary">
                                {activeConversation?.visitor?.name || 'Посетитель'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                                ещё не отправлено
                            </span>
                        </div>
                        <div className="ml-10 text-sm text-text-muted opacity-60 break-words max-w-[80%] line-clamp-3">
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

                {/* Note Mode Indicator */}
                {noteMode && (
                    <div className="mb-2 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm flex items-center gap-2 font-medium">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" opacity="0.3"/>
                            <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                        </svg>
                        Режим заметок (видно только операторам)
                    </div>
                )}

                <div className="flex items-end gap-2 px-1">
                    <button
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        disabled={!canSendMessage}
                        className="w-10 h-10 rounded-lg bg-surface text-text-muted hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all flex-shrink-0 border border-border cursor-pointer shadow-sm"
                        title="Быстрые ответы (/)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canSendMessage}
                        className="w-10 h-10 rounded-lg bg-surface text-text-muted hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all flex-shrink-0 border border-border cursor-pointer shadow-sm"
                        title="Прикрепить файл"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setNoteMode(!noteMode)}
                        disabled={!canSendMessage}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all flex-shrink-0 border cursor-pointer shadow-sm ${
                            noteMode
                                ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : 'bg-surface text-text-muted hover:text-amber-600 hover:bg-amber-50 border-border'
                        }`}
                        title="Заметка (видна только операторам)"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" opacity="0.3"/>
                            <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                        </svg>
                    </button>

                    <button
                        onClick={insertScreenShare}
                        disabled={!canSendMessage}
                        className="w-10 h-10 rounded-lg bg-surface text-text-muted hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all flex-shrink-0 border border-border cursor-pointer shadow-sm"
                        title="Видео звонок (Jitsi Meet)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder={canSendMessage ? (noteMode ? 'Внутренняя заметка...' : 'Введите сообщение или введите @ для упоминания...') : 'Закрытый чат. Отправка отключена'}
                        rows={1}
                        disabled={!canSendMessage}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm min-h-[42px] shadow-sm"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || sending || !canSendMessage}
                        className="w-10 h-10 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0 border-none cursor-pointer shadow-md shadow-primary/20 "
                        title={noteMode ? 'Отправить заметку (Ctrl+Enter)' : 'Отправить (Ctrl+Enter)'}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
