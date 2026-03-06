import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    activeView: 'chat' | 'settings';
    onViewChange: (view: 'chat' | 'settings') => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="w-16 bg-surface flex flex-col items-center py-4 border-r border-border gap-4">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>

            {/* Chat icon */}
            <button
                onClick={() => onViewChange('chat')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer ${activeView === 'chat'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-transparent text-text-muted hover:bg-surface-tertiary hover:text-text-primary'
                    }`}
                title="Чаты"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
            </button>

            {/* Settings */}
            <button
                onClick={() => onViewChange('settings')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer ${activeView === 'settings'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-transparent text-text-muted hover:bg-surface-tertiary hover:text-text-primary'
                    }`}
                title="Настройки"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Online indicator */}
            <div className="flex flex-col items-center gap-1 mb-2">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-text-muted">Online</span>
            </div>

            {/* User avatar / logout */}
            <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-surface-tertiary text-text-secondary flex items-center justify-center hover:bg-danger/20 hover:text-danger transition-all border-none cursor-pointer"
                title={`${user?.name || 'User'} — Выйти`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
        </div>
    );
}
