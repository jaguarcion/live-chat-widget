import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendMessage as sendMessageAPI, uploadFile } from '../api';
import QuickRepliesPanel from './QuickRepliesPanel';

export default function ChatWindow() {
    const { activeConversationId, messages, conversations, addMessage, typingStatus, sendTyping } = useChatStore();
    const [text, setText] = useState('');
    const typingTimeoutRef = useRef<any>(null);
    const [sending, setSending] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const canSendMessage = !!activeConversationId && activeConversation?.status === 'OPEN';

    useEffect(() => {
        // Instant scroll when switching conversation
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [activeConversationId]);

    useEffect(() => {
        // Smooth scroll for new messages (incoming or outgoing)
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || !activeConversationId || !canSendMessage) return;
        setSending(true);
        try {
            const { data } = await sendMessageAPI(activeConversationId, text.trim());
            addMessage(data);
            setText('');
            sendTyping(activeConversationId, false);
        } catch (err) {
            console.error('Send error:', err);
        } finally {
            setSending(false);
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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
        setText(e.target.value);
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
                                    <span className="text-[11px] text-text-muted mb-1 mr-1">
                                        {msg.user?.name || 'Оператор'}
                                    </span>
                                )}

                                <div className={`${msg.sender === 'OPERATOR'
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

                    <textarea
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder={canSendMessage ? 'Введите сообщение...' : 'Закрытый чат. Отправка отключена'}
                        rows={1}
                        disabled={!canSendMessage}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm min-h-[42px] shadow-sm"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || sending || !canSendMessage}
                        className="w-10 h-10 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0 border-none cursor-pointer shadow-md shadow-primary/20 "
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
