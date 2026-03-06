import { LiveChatWidget } from './widget';

declare global {
  interface Window {
    LiveChat?: {
      projectId: string;
    };
  }
}

function boot() {
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
