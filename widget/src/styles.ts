export const widgetStyles = `
  :host {
    --primary-color: #6366f1;
    --white: #ffffff;
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border-color: #f1f5f9;
    --bg-light: #f8fafc;
    --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    
    position: fixed;
    bottom: max(16px, env(safe-area-inset-bottom));
    right: max(16px, env(safe-area-inset-right));
    z-index: var(--livechat-z-index, 2140);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  :host(.left) {
    right: auto;
    left: max(16px, env(safe-area-inset-left));
  }

  * { box-sizing: border-box; }

  .livechat-toggle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    will-change: transform, opacity, filter;
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, filter 180ms ease, box-shadow 220ms ease;
  }

  .livechat-toggle.horizontal {
    width: auto;
    height: 44px;
    border-radius: 12px;
    padding: 0 18px;
    gap: 10px;
  }

  .livechat-toggle.open {
    opacity: 0;
    transform: scale(0.88) translateY(8px);
    pointer-events: none;
  }

  .livechat-toggle-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
  }

  .livechat-toggle-text {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    color: white;
  }

  .livechat-toggle:hover {
    transform: translateY(-1px) scale(1.02);
    filter: brightness(1.05);
    box-shadow: 0 14px 30px -12px rgba(15, 23, 42, 0.38);
  }

  .livechat-toggle svg {
    width: 28px;
    height: 28px;
    fill: currentColor;
  }

  .livechat-toggle.open svg {
    transform: rotate(90deg);
  }

  .livechat-badge {
    position: absolute;
    top: -5px;
    right: 0px;
    background: #ef4444;
    color: white;
    font-size: 12px;
    font-weight: bold;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    border: 2px solid white;
  }

  .livechat-badge.show { display: flex; }

  .livechat-window {
    position: absolute;
    bottom: 0px;
    right: 0;
    width: min(380px, calc(100vw - 24px));
    height: min(600px, calc(100dvh - 96px));
    max-height: calc(100dvh - 96px);
    background: white;
    border-radius: 20px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform-origin: bottom right;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    will-change: transform, opacity;
    transform: translateY(14px) scale(0.96);
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, visibility 0s linear 180ms;
  }

  :host(.left) .livechat-window {
    right: auto;
    left: 0;
    transform-origin: bottom left;
  }

  .livechat-window.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0) scale(1);
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
  }

  .livechat-header {
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    flex-shrink: 0;
  }

  .livechat-header.colored {
    background: var(--primary-color);
    color: white;
    border-bottom: none;
  }

  .livechat-header-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
  }

  .livechat-header-dot.offline {
    background: #94a3b8;
  }

  .livechat-header-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
    flex: 1;
  }

  .livechat-header.colored .livechat-header-title {
    color: white;
  }

  .livechat-header-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 24px;
    cursor: pointer;
    line-height: 1;
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
  }

  .livechat-header-close:hover {
    background: rgba(148, 163, 184, 0.12);
    color: var(--text-main);
    transform: scale(1.04);
  }

  .livechat-header.colored .livechat-header-close {
    color: rgba(255, 255, 255, 0.8);
  }

  .livechat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: white;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
  }

  .livechat-welcome {
    text-align: center;
    padding: 20px 0;
    color: var(--text-muted);
    animation: livechat-fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .livechat-welcome-text {
    font-size: 14px;
    line-height: 1.5;
  }

  .livechat-msg {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 14px;
    line-height: 1.4;
    position: relative;
    animation: livechat-fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1);
    transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  }

  .livechat-msg.visitor {
    align-self: flex-end;
    background: var(--primary-color);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .livechat-msg.operator {
    align-self: flex-start;
    background: var(--bg-light);
    color: var(--text-main);
    border-bottom-left-radius: 4px;
    margin-left: 36px;
  }

  .livechat-msg-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    position: absolute;
    left: -36px;
    bottom: 0;
    object-fit: cover;
    background: var(--primary-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
  }

  .livechat-msg-author {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 4px;
    margin-left: 36px;
  }

  .livechat-event {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    width: 100%;
    animation: livechat-fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .livechat-event-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    margin-bottom: 10px;
    object-fit: cover;
  }

  .livechat-event-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
    text-align: center;
  }

  .livechat-event-subtext {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  @keyframes livechat-fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .livechat-msg-row {
    display: flex;
    flex-direction: column;
    width: 100%;
    position: relative;
    animation: livechat-fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .livechat-msg-time {
    font-size: 10px;
    margin-top: 4px;
    opacity: 0.7;
    text-align: right;
  }

  .livechat-input-area {
    padding: 0;
    background: white;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .livechat-input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--bg-light);
    border-radius: 20px;
    padding: 10px 14px;
    width: 100%;
    transition: box-shadow 180ms ease, background-color 180ms ease;
  }

  .livechat-input-row:focus-within {
    background: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.24), 0 0 0 4px rgba(99, 102, 241, 0.08);
  }

  .livechat-input {
    flex: 1;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 15px;
    line-height: 1.4;
    padding: 4px 0;
    resize: none;
    color: var(--text-main);
    outline: none;
    max-height: 126px; /* ~6 lines: 15px * 1.4 * 6 = 126px */
    overflow-y: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }

  .livechat-input::-webkit-scrollbar {
    display: none; /* Chrome/Safari/Webkit */
  }

  .livechat-action-btn, .livechat-send-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: color 0.2s, background-color 0.2s, transform 0.2s;
  }

  .livechat-action-btn:hover, .livechat-send-btn:hover {
    color: var(--text-main);
    background: rgba(148, 163, 184, 0.12);
    transform: translateY(-1px);
  }

  .livechat-send-btn {
    color: var(--primary-color);
  }

  .livechat-action-btn svg, .livechat-send-btn svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .livechat-send-btn svg {
    fill: currentColor;
    stroke: none;
  }

  .livechat-hidden { display: none !important; }

  .livechat-offline-form {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: livechat-fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .livechat-offline-text {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 8px;
    text-align: center;
  }

  .livechat-offline-email, .livechat-offline-msg {
    width: 100%;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-light);
    font-family: inherit;
    font-size: 14px;
    outline: none;
  }

  .livechat-offline-submit {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .livechat-offline-submit:hover { opacity: 0.9; }

  .livechat-offline-success {
    text-align: center;
    color: #22c55e;
    font-size: 14px;
    margin-top: 8px;
  }

  .livechat-powered {
    padding: 8px;
    text-align: center;
    font-size: 10px;
    color: var(--text-muted);
    background: white;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  /* Emojis */
  .livechat-emoji-picker {
    position: absolute;
    bottom: 70px;
    right: 16px;
    background: white;
    border-radius: 12px;
    box-shadow: var(--shadow);
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
    z-index: 10;
    border: 1px solid var(--border-color);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(8px) scale(0.98);
    transition: opacity 160ms ease, transform 180ms ease, visibility 0s linear 180ms;
  }

  .livechat-emoji-picker.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0) scale(1);
    transition: opacity 160ms ease, transform 180ms ease;
  }

  .livechat-emoji-item {
    cursor: pointer;
    font-size: 20px;
    padding: 5px;
    border-radius: 6px;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .livechat-emoji-item:hover { background: var(--bg-light); }

  /* Attachments */
  .livechat-msg-image {
    max-width: 100%;
    border-radius: 12px;
    cursor: pointer;
    display: block;
    margin-bottom: 5px;
  }

  .livechat-msg-file {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.05);
    padding: 10px;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
  }

  .livechat-msg.visitor .livechat-msg-file {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .livechat-file-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .livechat-file-info {
    overflow: hidden;
  }

  .livechat-file-name {
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .livechat-file-size {
    font-size: 11px;
    opacity: 0.7;
  }

  /* Lightbox */
  .livechat-lightbox {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: calc(var(--livechat-z-index, 2140) + 20);
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
    border-radius: 4px;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
  }

  /* Scrollbar */
  .livechat-messages::-webkit-scrollbar { width: 4px; }
  .livechat-messages::-webkit-scrollbar-track { background: transparent; }
  .livechat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

  .livechat-typing-indicator {
    display: none;
    padding: 0 16px;
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
    background: white;
    border-top: 0;
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
    transition: opacity 160ms ease, transform 180ms ease;
  }

  .livechat-typing-indicator.show {
    display: block;
    padding: 8px 16px;
    border-top: 1px solid var(--border-color);
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    :host {
      bottom: max(12px, env(safe-area-inset-bottom));
      right: max(12px, env(safe-area-inset-right));
    }

    :host(.left) {
      left: max(12px, env(safe-area-inset-left));
    }

    .livechat-window {
      width: min(100vw - 24px, 380px);
      height: min(70dvh, 560px);
      max-height: min(70dvh, 560px);
      border-radius: 18px;
    }

    .livechat-toggle.horizontal {
      max-width: min(280px, calc(100vw - 24px));
    }

    .livechat-toggle-text {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .livechat-toggle,
    .livechat-window,
    .livechat-msg,
    .livechat-msg-row,
    .livechat-event,
    .livechat-welcome,
    .livechat-offline-form,
    .livechat-typing-indicator,
    .livechat-emoji-picker,
    .livechat-action-btn,
    .livechat-send-btn,
    .livechat-header-close {
      animation: none !important;
      transition: none !important;
    }

    .livechat-messages {
      scroll-behavior: auto;
    }
  }
`;
