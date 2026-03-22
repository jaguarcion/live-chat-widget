import { LiveChatWidget } from './widget';

declare global {
  interface Window {
    LiveChat?: {
      projectId: string;
    };
  }
}

function detectAndSetApiUrl(): void {
  if ((window as any).__LIVECHAT_API__) return; // already set by embed code
  try {
    // Find this script element to derive the backend URL from where widget.js was loaded
    const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
    const self = scripts.find(s => s.src.includes('widget.js'));
    if (self) {
      const origin = new URL(self.src).origin;
      (window as any).__LIVECHAT_API__ = `${origin}/api`;
      (window as any).__LIVECHAT_WS__ = origin;
    }
  } catch {}
}

function boot() {
  detectAndSetApiUrl();
  const config = window.LiveChat;
  if (!config || !config.projectId) {
    console.warn('LiveChat: missing projectId. Add window.LiveChat = { projectId: "YOUR_ID" } before the script.');
    return;
  }

  new LiveChatWidget(config.projectId);
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
