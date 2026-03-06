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
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  :host(.left) {
    right: auto;
    left: 20px;
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
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
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
    transform: scale(0.2);
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
    transform: scale(1.02);
    filter: brightness(1.1);
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
    width: 380px;
    height: 600px;
    max-height: calc(100vh - 120px);
    background: white;
    border-radius: 20px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform-origin: bottom right;
    opacity: 0;
    visibility: hidden;
    transform: scale(0.1) translateY(20px);
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :host(.left) .livechat-window {
    right: auto;
    left: 0;
    transform-origin: bottom left;
  }

  .livechat-window.open {
    opacity: 1;
    visibility: visible;
    transform: scale(1) translateY(0);
  }

  .livechat-header {
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
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
    padding: 4px;
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
  }

  .livechat-welcome {
    text-align: center;
    padding: 20px 0;
    color: var(--text-muted);
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
  }

  .livechat-msg-time {
    font-size: 10px;
    margin-top: 4px;
    opacity: 0.7;
    text-align: right;
  }

  .livechat-input-area {
    padding: 12px 14px;
    background: white;
    border-top: 1px solid var(--border-color);
  }

  .livechat-input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--bg-light);
    border-radius: 20px;
    padding: 8px 14px;
    width: 100%;
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
    transition: color 0.2s;
  }

  .livechat-action-btn:hover { color: var(--text-main); }

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
    display: none;
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
    z-index: 10;
    border: 1px solid var(--border-color);
  }

  .livechat-emoji-picker.show { display: grid; }

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
    z-index: 9999999;
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
`;
