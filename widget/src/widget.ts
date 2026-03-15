import { initWidget, getHistory, checkOnline, type MessageData } from './api';
import { ChatSocket } from './socket';
import { widgetStyles } from './styles';

export class LiveChatWidget {
    private root: ShadowRoot;
    private container: HTMLDivElement;
    private messagesEl!: HTMLDivElement;
    private inputEl!: HTMLTextAreaElement;
    private inputAreaEl!: HTMLDivElement;
    private windowEl!: HTMLDivElement;
    private toggleBtn!: HTMLButtonElement;
    private badgeEl!: HTMLSpanElement;
    private headerTitleEl!: HTMLSpanElement;
    private headerDotEl!: HTMLDivElement;
    private attachBtn!: HTMLButtonElement;
    private emojiBtn!: HTMLButtonElement;
    private sendBtn!: HTMLButtonElement;
    private fileInput!: HTMLInputElement;
    private emojiPickerEl!: HTMLDivElement;
    private lightboxEl!: HTMLDivElement;
    private lightboxImgEl!: HTMLImageElement;
    private typingIndicatorEl!: HTMLDivElement;
    private typingTimeout: any = null;

    private projectId: string;
    private visitorId: string | null = null;
    private conversationId: string | null = null;
    private chatSocket: ChatSocket;
    private isOpen = false;
    private isOnline = true;
    private unreadCount = 0;
    private messages: MessageData[] = [];
    private onlineOperators: any[] = [];
    private prechatFields: any[] = [];
    private leadCaptured = false;

    private onlineTitle = 'Напишите нам, мы онлайн!';
    private offlineTitle = 'Сейчас мы оффлайн';
    private welcomeText = 'Мы онлайн ежедневно без выходных.\\nОставьте сообщение — мы ответим на почту или здесь.';
    private buttonStyle = 'round';

    constructor(projectId: string) {
        this.projectId = projectId;
        this.chatSocket = new ChatSocket();

        this.container = document.createElement('div');
        this.container.id = 'livechat-widget-host';
        this.container.style.opacity = '0';
        this.container.style.transition = 'opacity 0.3s ease-in-out';
        document.body.appendChild(this.container);

        this.root = this.container.attachShadow({ mode: 'open' });

        const styleEl = document.createElement('style');
        styleEl.textContent = widgetStyles;
        this.root.appendChild(styleEl);

        this.buildToggleButton();
        this.buildChatWindow();
        this.init();
    }

    private async init() {
        this.visitorId = localStorage.getItem('livechat_visitor_id');
        this.leadCaptured = localStorage.getItem(`livechat_lead_captured_${this.projectId}`) === 'true';

        try {
            const status = await checkOnline(this.projectId);
            this.isOnline = status.online;

            const metadata = {
                referrer: document.referrer,
                device: navigator.userAgent,
                url: window.location.href,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                utm: this.getUtmFromUrl(),
            };

            const data = await initWidget(this.projectId, this.visitorId, metadata);
            this.visitorId = data.visitor.id;
            this.conversationId = data.conversation.id;
            localStorage.setItem('livechat_visitor_id', this.visitorId);

            if (data.settings) {
                this.applySettings(data.settings);
                if (data.settings.prechatFields) {
                    try {
                        let fields = data.settings.prechatFields;
                        if (typeof fields === 'string') {
                            fields = JSON.parse(fields);
                        }
                        if (Array.isArray(fields)) {
                            this.prechatFields = fields.filter((f: any) => f.enabled);
                        }
                    } catch (e) {
                        console.error('Failed to parse prechatFields', e);
                    }
                }
            }

            this.updateOnlineUI(status.offlineMessage, status.onlineOperators);

            const history = await getHistory(this.conversationId);
            this.messages = history;
            this.renderMessages();

            this.chatSocket.connect(this.conversationId, this.visitorId ?? undefined);
            this.startPageTracking();
            this.chatSocket.onMessage((msg) => {
                if (this.messages.find(m => m.id === msg.id)) return;

                let replaced = false;
                if (msg.sender === 'VISITOR') {
                    const tempIdx = this.messages.findIndex(m => m.id.startsWith('temp_') && m.text === msg.text);
                    if (tempIdx !== -1) {
                        this.messages[tempIdx] = msg;
                        replaced = true;
                    }
                }

                if (!replaced) {
                    this.messages.push(msg);
                }

                this.renderMessages();
                this.scrollToBottom();
                if (!this.isOpen) {
                    this.unreadCount++;
                    this.updateBadge();
                }
            });
            this.chatSocket.onTypingStatus((data) => {
                if (data.sender === 'OPERATOR') {
                    this.showTypingIndicator(data.isTyping);
                }
            });
            this.container.style.opacity = '1';
        } catch (err) {
            console.error('LiveChat init error:', err);
            this.container.style.opacity = '1';
        }
    }

    private applySettings(s: any) {
        if (s.chatColor) {
            this.container.style.setProperty('--primary-color', s.chatColor);
        }

        if (s.coloredHeader) {
            this.windowEl.querySelector('.livechat-header')?.classList.add('colored');
        }

        this.buttonStyle = s.buttonStyle || 'round';
        if (this.buttonStyle === 'horizontal') {
            this.toggleBtn.classList.add('horizontal');
            this.updateToggleContent();
        }

        if (s.buttonPosition === 'bottom-left') {
            this.container.classList.add('left');
        }

        this.onlineTitle = s.onlineTitle || 'Напишите нам, мы онлайн!';
        this.offlineTitle = s.offlineTitle || 'Сейчас мы оффлайн';
        this.welcomeText = s.welcomeText || '';

        if (s.showLogo === false) {
            (this.windowEl.querySelector('.livechat-powered') as HTMLElement).style.display = 'none';
        }
        if (s.fileUpload === false) {
            this.attachBtn.style.display = 'none';
        }

        if (this.buttonStyle === 'horizontal') {
            this.updateToggleContent();
        }
    }

    private updateToggleContent() {
        if (this.isOpen) {
            this.toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            `;
            this.toggleBtn.appendChild(this.badgeEl);
            return;
        }

        if (this.buttonStyle === 'round') {
            this.toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
                    <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                </svg>
            `;
        } else {
            const title = this.isOnline ? this.onlineTitle : this.offlineTitle;
            const iconColor = this.isOnline ? '#22c55e' : '#94a3b8';

            this.toggleBtn.innerHTML = `
                <div class="livechat-toggle-dot" style="background: ${iconColor}"></div>
                <span class="livechat-toggle-text">${this.escapeHtml(title)}</span>
            `;
        }
        this.toggleBtn.appendChild(this.badgeEl);
    }

    private buildOperatorsHtml(operators: any[]): string {
        let html = '<div class="livechat-operators-section" style="display:flex; flex-direction:column; align-items:center; padding:24px 16px 8px;">';
        html += '<div style="display:flex; justify-content:center; gap:24px; margin-bottom:16px;">';
        operators.forEach(op => {
            html += '<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">';
            html += '<div style="position:relative;">';
            if (op.avatarUrl) {
                html += `<img src="${this.escapeHtml(op.avatarUrl)}" alt="${this.escapeHtml(op.name)}" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.08);" />`;
            } else {
                const initial = op.name ? op.name.charAt(0).toUpperCase() : 'O';
                html += `<div style="width:64px; height:64px; border-radius:50%; background:var(--primary-color, #6366f1); display:flex; align-items:center; justify-content:center; color:#fff; font-size:24px; font-weight:600; border:2px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.08);">${initial}</div>`;
            }
            html += '<div style="position:absolute; bottom:2px; right:2px; width:14px; height:14px; background:#22c55e; border-radius:50%; border:2px solid #fff;"></div>';
            html += '</div>';
            html += `<span style="font-size:13px; color:#1e293b; font-weight:500; max-width:80px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this.escapeHtml(op.name)}</span>`;
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';
        return html;
    }

    private updateOnlineUI(offlineMessage?: string, onlineOperators?: any[]) {
        if (this.isOnline) {
            this.headerTitleEl.textContent = this.onlineTitle;
            this.headerDotEl.classList.remove('offline');
            this.inputAreaEl.style.display = 'flex';

            const offlineForm = this.windowEl.querySelector('.livechat-offline-form');
            if (offlineForm) offlineForm.remove();

            // Store operators for renderMessages usage
            if (onlineOperators && onlineOperators.length > 0) {
                this.onlineOperators = onlineOperators;
            }

            // Render online operators in welcome screen
            const welcomeEl = this.windowEl.querySelector('.livechat-welcome');
            if (welcomeEl && this.onlineOperators.length > 0) {
                const operatorsHtml = this.buildOperatorsHtml(this.onlineOperators);
                const formattedWelcome = this.welcomeText.replace(/\\n/g, '<br/>');
                welcomeEl.innerHTML = operatorsHtml + `<div class="livechat-welcome-text">${formattedWelcome}</div>`;
            }

        } else {
            this.headerTitleEl.textContent = this.offlineTitle;
            this.headerDotEl.classList.add('offline');
            this.inputAreaEl.style.display = 'none';
            this.showOfflineForm(offlineMessage || 'Оставьте сообщение — мы ответим на почту или здесь.');
        }

        if (this.buttonStyle === 'horizontal') {
            this.updateToggleContent();
        }
    }

    private showOfflineForm(message: string) {
        const existing = this.windowEl.querySelector('.livechat-offline-form');
        if (existing) existing.remove();

        const formEl = document.createElement('div');
        formEl.className = 'livechat-offline-form';
        formEl.innerHTML = `
      <p class="livechat-offline-text">${this.escapeHtml(message)}</p>
      <input type="email" class="livechat-offline-email" placeholder="Ваш email" />
      <textarea class="livechat-offline-msg" placeholder="Ваше сообщение..." rows="3"></textarea>
      <button class="livechat-offline-submit">Отправить</button>
      <div class="livechat-offline-success" style="display:none">Сообщение отправлено! ✓</div>
    `;

        const submitBtn = formEl.querySelector('.livechat-offline-submit')!;
        const emailInput = formEl.querySelector('.livechat-offline-email') as HTMLInputElement;
        const msgInput = formEl.querySelector('.livechat-offline-msg') as HTMLTextAreaElement;
        const successMsg = formEl.querySelector('.livechat-offline-success') as HTMLDivElement;

        submitBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const text = msgInput.value.trim();
            if (!email || !text || !this.conversationId) return;

            try {
                this.chatSocket.sendMessage(this.conversationId, `[Offline] Email: ${email}\\n${text}`);
                (submitBtn as HTMLButtonElement).disabled = true;
                emailInput.value = '';
                msgInput.value = '';
                successMsg.style.display = 'block';
                setTimeout(() => { successMsg.style.display = 'none'; (submitBtn as HTMLButtonElement).disabled = false; }, 3000);
            } catch (err) {
                console.error('Offline submit error:', err);
            }
        });

        const poweredBy = this.windowEl.querySelector('.livechat-powered')!;
        this.windowEl.insertBefore(formEl, poweredBy);
    }

    private buildToggleButton() {
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.className = 'livechat-toggle';
        this.toggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
      </svg>
    `;

        this.badgeEl = document.createElement('span');
        this.badgeEl.className = 'livechat-badge';
        this.toggleBtn.appendChild(this.badgeEl);
        this.toggleBtn.addEventListener('click', () => this.toggle());
        this.root.appendChild(this.toggleBtn);
    }

    private buildChatWindow() {
        this.windowEl = document.createElement('div');
        this.windowEl.className = 'livechat-window';
        this.windowEl.innerHTML = `
      <div class="livechat-header">
        <div class="livechat-header-dot"></div>
        <span class="livechat-header-title">Напишите нам, мы онлайн!</span>
        <button class="livechat-header-close">×</button>
      </div>
      <div class="livechat-messages">
        <div class="livechat-welcome">
          <div class="livechat-welcome-text">
            Мы онлайн ежедневно без выходных.<br/>
            Оставьте сообщение — мы ответим на почту или здесь.
          </div>
        </div>
      </div>
      <div class="livechat-input-area">
        <div class="livechat-input-row">
          <textarea class="livechat-input" placeholder="Сообщение..." rows="1"></textarea>
          <button class="livechat-action-btn livechat-emoji-btn" title="Смайлики">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <button class="livechat-action-btn livechat-attach-btn" title="Прикрепить файл">
            <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <button class="livechat-send-btn livechat-hidden" title="Отправить">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
      <div class="livechat-typing-indicator" style="display:none">Оператор печатает...</div>
      <div class="livechat-powered">Powered by LiveChat</div>
    `;

        this.messagesEl = this.windowEl.querySelector('.livechat-messages')!;
        this.inputEl = this.windowEl.querySelector('.livechat-input')!;
        this.inputAreaEl = this.windowEl.querySelector('.livechat-input-area')!;
        this.headerTitleEl = this.windowEl.querySelector('.livechat-header-title')!;
        this.headerDotEl = this.windowEl.querySelector('.livechat-header-dot')!;
        this.attachBtn = this.windowEl.querySelector('.livechat-attach-btn')!;
        this.emojiBtn = this.windowEl.querySelector('.livechat-emoji-btn')!;
        this.sendBtn = this.windowEl.querySelector('.livechat-send-btn')!;
        this.typingIndicatorEl = this.windowEl.querySelector('.livechat-typing-indicator')!;

        this.buildEmojiPicker();
        this.buildLightbox();
        this.buildFileInput();

        const closeBtn = this.windowEl.querySelector('.livechat-header-close')!;
        closeBtn.addEventListener('click', () => this.toggle());

        this.inputEl.addEventListener('input', () => {
            const hasText = this.inputEl.value.trim().length > 0;
            if (hasText) {
                this.attachBtn.classList.add('livechat-hidden');
                this.sendBtn.classList.remove('livechat-hidden');
            } else {
                this.attachBtn.classList.remove('livechat-hidden');
                this.sendBtn.classList.add('livechat-hidden');
            }

            this.inputEl.style.height = 'auto';
            const newHeight = Math.min(this.inputEl.scrollHeight, 126);
            this.inputEl.style.height = newHeight + 'px';

            this.handleTyping();
        });

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.send();
            }
        });

        this.sendBtn.addEventListener('click', () => this.send());

        this.root.appendChild(this.windowEl);
    }

    private buildEmojiPicker() {
        this.emojiPickerEl = document.createElement('div');
        this.emojiPickerEl.className = 'livechat-emoji-picker';
        const emojis = ['😊', '😂', '😍', '👋', '👍', '🙏', '🙌', '✨', '🔥', '🤔', '👀', '💡'];

        emojis.forEach(emoji => {
            const el = document.createElement('div');
            el.className = 'livechat-emoji-item';
            el.textContent = emoji;
            el.onclick = () => {
                this.inputEl.value += emoji;
                this.emojiPickerEl.classList.remove('show');
                this.inputEl.dispatchEvent(new Event('input'));
                this.inputEl.focus();
            };
            this.emojiPickerEl.appendChild(el);
        });

        this.windowEl.appendChild(this.emojiPickerEl);

        this.emojiBtn.onclick = (e) => {
            e.stopPropagation();
            this.emojiPickerEl.classList.toggle('show');
        };

        this.container.addEventListener('click', () => {
            this.emojiPickerEl.classList.remove('show');
        });
    }

    private buildLightbox() {
        this.lightboxEl = document.createElement('div');
        this.lightboxEl.className = 'livechat-lightbox';
        this.lightboxImgEl = document.createElement('img');
        this.lightboxImgEl.className = 'livechat-lightbox-img';
        this.lightboxEl.appendChild(this.lightboxImgEl);
        this.lightboxEl.onclick = () => this.lightboxEl.classList.remove('show');

        const globalStyle = document.createElement('style');
        globalStyle.textContent = `
            .livechat-lightbox {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 99999999;
                display: none;
                align-items: center;
                justify-content: center;
                cursor: zoom-out;
            }
            .livechat-lightbox.show { display: flex; }
            .livechat-lightbox-img {
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 0 40px rgba(0,0,0,0.8);
            }
        `;
        document.head.appendChild(globalStyle);
        document.body.appendChild(this.lightboxEl);
    }

    private buildFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.style.display = 'none';
        this.fileInput.onchange = async () => {
            const file = this.fileInput.files?.[0];
            if (!file || !this.conversationId) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const API_BASE = (window as any).__LIVECHAT_API__ || 'http://localhost:4001/api';
                const res = await fetch(`${API_BASE}/widget/upload`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                const type = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
                this.addLocalMessage('', type, data.url);
                this.chatSocket.sendMessage(this.conversationId, '', type, data.url);
            } catch (err) {
                console.error('Upload failed:', err);
            }
            this.fileInput.value = '';
        };
        this.container.appendChild(this.fileInput);
        this.attachBtn.onclick = () => this.fileInput.click();
    }

    private toggle() {
        this.isOpen = !this.isOpen;
        this.windowEl.classList.toggle('open', this.isOpen);
        this.toggleBtn.classList.toggle('open', this.isOpen);

        this.updateToggleContent();

        if (this.isOpen) {
            this.unreadCount = 0;
            this.updateBadge();
            this.scrollToBottom();
            if (this.isOnline) {
                this.inputEl.focus();
            }
        }
    }

    private addLocalMessage(text: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', url?: string) {
        const tempMsg: MessageData = {
            id: 'temp_' + Date.now(),
            conversationId: this.conversationId!,
            text,
            sender: 'VISITOR',
            type,
            attachmentUrl: url,
            isRead: true,
            createdAt: new Date().toISOString()
        };
        this.messages.push(tempMsg);
        this.renderMessages();
        this.scrollToBottom();
    }

    private async send() {
        const text = this.inputEl.value.trim();
        if (!text || !this.conversationId) return;

        this.addLocalMessage(text);

        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';
        this.attachBtn.classList.remove('livechat-hidden');
        this.sendBtn.classList.add('livechat-hidden');

        // Immediately clear typing status
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        this.chatSocket.sendTyping(this.conversationId, false);
        this.chatSocket.sendMessage(this.conversationId, text);
    }

    private renderMessages() {
        let hasVisitorMessage = false;

        if (this.messages.length === 0) {
            const formattedWelcome = this.welcomeText.replace(/\\n/g, '<br/>');
            let operatorsHtml = '';
            if (this.onlineOperators.length > 0) {
                operatorsHtml = this.buildOperatorsHtml(this.onlineOperators);
            }
            this.messagesEl.innerHTML = `
                <div class="livechat-welcome">
                    ${operatorsHtml}
                    <div class="livechat-welcome-text">
                        ${formattedWelcome}
                    </div>
                </div>`;
            return;
        }

        this.messagesEl.innerHTML = '';
        this.messages.forEach(msg => {
            const isJoin = msg.type === 'OPERATOR_JOIN';
            if (msg.sender === 'VISITOR') hasVisitorMessage = true;

            if (isJoin) {
                const eventEl = document.createElement('div');
                eventEl.className = 'livechat-event';

                let avatarHtml = '';
                if (msg.user?.avatarUrl) {
                    avatarHtml = `<img src="${msg.user.avatarUrl}" class="livechat-event-avatar" alt="Avatar">`;
                } else {
                    avatarHtml = `<div class="livechat-event-avatar" style="background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold;">${msg.user?.name?.[0] || 'O'}</div>`;
                }

                const titleHtml = msg.user?.title ? `<div class="livechat-event-subtext" style="font-weight: 500; color: var(--text-main); font-size: 11px; margin-top: 2px;">${msg.user.title}</div>` : '';

                eventEl.innerHTML = `
                    ${avatarHtml}
                    <div class="livechat-event-text">${msg.user?.name || 'Оператор'}</div>
                    ${titleHtml}
                    <div class="livechat-event-subtext">теперь в чате</div>
                `;
                this.messagesEl.appendChild(eventEl);
                return;
            }

            // Normal message
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.width = '100%';
            wrapper.style.position = 'relative';

            if (msg.sender === 'OPERATOR') {
                const authorEl = document.createElement('div');
                authorEl.className = 'livechat-msg-author';
                authorEl.textContent = msg.user?.name || 'Оператор';
                wrapper.appendChild(authorEl);
            }

            const msgEl = document.createElement('div');
            msgEl.className = `livechat-msg ${msg.sender.toLowerCase()}`;

            if (msg.sender === 'OPERATOR') {
                const avatarEl = document.createElement('div');
                avatarEl.className = 'livechat-msg-avatar';
                if (msg.user?.avatarUrl) {
                    avatarEl.innerHTML = `<img src="${msg.user.avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                } else {
                    avatarEl.textContent = msg.user?.name?.[0] || 'O';
                }
                msgEl.appendChild(avatarEl);
            }

            if (msg.type === 'IMAGE' && msg.attachmentUrl) {
                const img = document.createElement('img');
                img.src = msg.attachmentUrl;
                img.className = 'livechat-msg-image';
                img.onclick = () => {
                    this.lightboxImgEl.src = img.src;
                    this.lightboxEl.classList.add('show');
                };
                msgEl.appendChild(img);
            } else if (msg.type === 'FILE' && msg.attachmentUrl) {
                const link = document.createElement('a');
                link.href = msg.attachmentUrl;
                link.className = 'livechat-msg-file';
                link.target = '_blank';
                link.innerHTML = `
                    <div class="livechat-file-icon">📁</div>
                    <div class="livechat-file-info">
                        <div class="livechat-file-name">Файл</div>
                        <div class="livechat-file-size">Нажмите чтобы скачать</div>
                    </div>
                `;
                msgEl.appendChild(link);
            }

            if (msg.text) {
                const textEl = document.createElement('div');
                textEl.style.whiteSpace = 'pre-wrap';
                textEl.textContent = msg.text;
                msgEl.appendChild(textEl);
            }

            const timeEl = document.createElement('div');
            timeEl.className = 'livechat-msg-time';
            timeEl.textContent = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            msgEl.appendChild(timeEl);

            wrapper.appendChild(msgEl);
            this.messagesEl.appendChild(wrapper);
        });

        if (hasVisitorMessage && !this.leadCaptured && this.prechatFields.length > 0) {
            this.appendLeadForm();
        }
    }

    private appendLeadForm() {
        if (this.messagesEl.querySelector('.livechat-lead-form')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'livechat-lead-form-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.marginTop = '12px';
        wrapper.style.marginBottom = '12px';
        wrapper.style.width = '100%';

        const formEl = document.createElement('div');
        formEl.className = 'livechat-lead-form';
        formEl.style.background = '#f8fafc';
        formEl.style.border = '1px solid #e2e8f0';
        formEl.style.borderRadius = '12px';
        formEl.style.padding = '16px';
        formEl.style.width = '240px';
        formEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';

        let html = '<div style="font-weight:600; font-size:13px; color:#0f172a; margin-bottom:12px; text-align:center;">Пожалуйста, представьтесь</div>';

        this.prechatFields.forEach(f => {
            html += `<div style="margin-bottom:10px;">
                <label style="display:block; font-size:11px; color:#475569; margin-bottom:4px;">${this.escapeHtml(f.label)} ${f.required ? '<span style="color:#ef4444">*</span>' : ''}</label>
                <input class="livechat-lead-input" data-id="${f.id}" data-required="${f.required}" type="${f.type}" style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none;" />
            </div>`;
        });
        html += `<button class="livechat-lead-submit" style="width:100%; padding:8px; border:none; border-radius:6px; background:var(--primary-color, #6366f1); color:white; font-size:13px; font-weight:500; cursor:pointer; margin-top:4px; transition: opacity 0.2s;">Отправить</button>`;

        formEl.innerHTML = html;

        const submitBtn = formEl.querySelector('.livechat-lead-submit') as HTMLButtonElement;
        submitBtn.onclick = async () => {
            const inputs = formEl.querySelectorAll('.livechat-lead-input') as NodeListOf<HTMLInputElement>;
            const data: any = {};
            let valid = true;
            inputs.forEach(input => {
                const id = input.getAttribute('data-id')!;
                const req = input.getAttribute('data-required') === 'true';
                const val = input.value.trim();
                if (req && !val) {
                    input.style.borderColor = '#ef4444';
                    valid = false;
                } else {
                    input.style.borderColor = '#cbd5e1';
                }
                if (val) data[id] = val;
            });

            if (!valid) return;

            submitBtn.textContent = 'Отправка...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            try {
                const customFields: any = {};
                for (const key of Object.keys(data)) {
                    if (key !== 'name' && key !== 'email' && key !== 'phone') {
                        customFields[key] = data[key];
                    }
                }

                const API_BASE = (window as any).__LIVECHAT_API__ || 'http://localhost:4001/api';
                await fetch(`${API_BASE}/widget/visitor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        visitorId: this.visitorId,
                        name: data.name,
                        email: data.email,
                        phone: data.phone,
                        customFields
                    })
                });

                this.leadCaptured = true;
                localStorage.setItem(`livechat_lead_captured_${this.projectId}`, 'true');
                wrapper.remove();
            } catch (err) {
                console.error('Lead form error', err);
                submitBtn.textContent = 'Ошибка, попробуйте снова';
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        };

        wrapper.appendChild(formEl);
        this.messagesEl.appendChild(wrapper);
        this.scrollToBottom();
    }

    private scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        });
    }

    private updateBadge() {
        if (this.unreadCount > 0) {
            this.badgeEl.textContent = String(this.unreadCount);
            this.badgeEl.classList.add('show');
        } else {
            this.badgeEl.classList.remove('show');
        }
    }

    private handleTyping() {
        if (!this.conversationId) return;

        const currentText = this.inputEl.value.trim();

        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        } else {
            this.chatSocket.sendTyping(this.conversationId, true, currentText);
        }

        // Send intermediate text updates frequently
        this.chatSocket.sendTyping(this.conversationId, true, currentText);

        this.typingTimeout = setTimeout(() => {
            if (this.conversationId) {
                this.chatSocket.sendTyping(this.conversationId, false);
            }
            this.typingTimeout = null;
        }, 3000);
    }

    private showTypingIndicator(show: boolean) {
        if (this.typingIndicatorEl) {
            this.typingIndicatorEl.style.display = show ? 'block' : 'none';
            if (show) this.scrollToBottom();
        }
    }

    private getUtmFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return {
            source: params.get('utm_source') || '',
            medium: params.get('utm_medium') || '',
            campaign: params.get('utm_campaign') || '',
            term: params.get('utm_term') || '',
            content: params.get('utm_content') || '',
        };
    }

    private startPageTracking() {
        if (!this.visitorId) return;

        const sendCurrentPage = () => {
            if (!this.visitorId) return;
            this.chatSocket.sendPageView(this.visitorId, window.location.href, document.title, this.conversationId || undefined);
        };

        sendCurrentPage();

        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function (...args) {
            originalPushState.apply(this, args as any);
            setTimeout(sendCurrentPage, 0);
        };

        window.history.replaceState = function (...args) {
            originalReplaceState.apply(this, args as any);
            setTimeout(sendCurrentPage, 0);
        };

        window.addEventListener('popstate', () => setTimeout(sendCurrentPage, 0));
    }

    private escapeHtml(str: string | null): string {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
