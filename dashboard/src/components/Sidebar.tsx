import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore } from '../store/themeStore';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    activeView: 'chat' | 'settings' | 'dialogs' | 'channels' | 'search' | 'analytics' | 'live-visitors';
    onViewChange: (view: 'chat' | 'settings' | 'dialogs' | 'channels' | 'search' | 'analytics' | 'live-visitors') => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
    const { user, logout } = useAuthStore();
    const { conversations, socket } = useChatStore();
    const navigate = useNavigate();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [status, setStatus] = useState<'online' | 'invisible' | 'offline'>(() => {
        return (localStorage.getItem('operator_status') as 'online' | 'invisible' | 'offline') || 'online';
    });
    const { theme, toggleTheme } = useThemeStore();

    const handleStatusChange = (newStatus: 'online' | 'invisible' | 'offline') => {
        setStatus(newStatus);
        localStorage.setItem('operator_status', newStatus);
        if (socket) {
            socket.emit('operator_status_change', { status: newStatus });
        }
    };

    const totalUnread = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="w-[250px] shrink-0 bg-surface flex flex-col h-full border-r border-border text-text-primary overflow-y-auto">
            {/* User Profile Area */}
            <div
                className="p-5 flex items-center justify-between border-b border-border/50 cursor-pointer hover:bg-surface-secondary transition-colors"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                                {user?.name?.[0] || 'U'}
                            </div>
                        )}
                        <div
                            className="absolute top-0 -left-1 w-3 h-3 rounded-full"
                            style={{
                                backgroundColor: status === 'online' ? '#22c55e' : status === 'offline' ? 'rgba(0,0,0,0.2)' : 'transparent',
                                border: status === 'invisible' ? '2px solid #22c55e' : '2px solid #fff'
                            }}
                        ></div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                            <span className="font-semibold text-[15px] truncate max-w-[150px]">
                                {status === 'online' ? 'Онлайн' : status === 'invisible' ? 'Невидимка' : 'Офлайн'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                        className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors text-text-muted hover:text-text-primary"
                        title={theme === 'light' ? 'Переключить на темную тему' : 'Переключить на светлую тему'}
                    >
                        {theme === 'light' ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4-9H3m15.364 6.364l-.707-.707M6.343 17.657l-.707-.707M16.95 16.95l-.707-.707M7.757 7.757l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                            </svg>
                        )}
                    </button>
                    <svg
                        className={`w-5 h-5 text-text-muted transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Collapsible User Menu */}
            {isUserMenuOpen && (
                <div className="bg-surface-secondary border-b border-border/50">
                    {/* Status Options */}
                    <div className="px-5 py-4 space-y-4 text-[15px] font-medium border-b border-border/50">
                        {status !== 'online' && (
                            <div
                                className="flex items-center gap-3 cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange('online'); setIsUserMenuOpen(false); }}
                            >
                                <div className="w-3 h-3 rounded-full bg-success shrink-0"></div>
                                Онлайн
                            </div>
                        )}
                        {status !== 'invisible' && (
                            <div
                                className="flex items-center gap-3 cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange('invisible'); setIsUserMenuOpen(false); }}
                            >
                                <div className="w-3 h-3 rounded-full border-2 border-success shrink-0"></div>
                                Невидимка
                            </div>
                        )}
                        {status !== 'offline' && (
                            <div
                                className="flex items-center gap-3 cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange('offline'); setIsUserMenuOpen(false); }}
                            >
                                <div className="w-3 h-3 rounded-full bg-text-muted shrink-0"></div>
                                Офлайн
                            </div>
                        )}
                    </div>

                    {/* Account Info */}
                    <div className="px-5 py-4 space-y-4 border-b border-border/50">
                        <div className="flex items-center gap-3 text-text-primary font-medium">
                            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Аккаунт
                        </div>
                        <div className="flex items-center gap-3 pl-8 text-[13px] text-text-secondary">
                            <div className="shrink-0 relative">
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                                        {user?.name?.[0] || 'U'}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="font-medium text-text-primary truncate max-w-[150px]">{user?.name}</div>
                                <div className="truncate max-w-[150px]" title={user?.email}>{user?.email}</div>
                            </div>
                        </div>
                        <div onClick={handleLogout} className="flex items-center gap-3 text-text-primary font-medium cursor-pointer hover:text-danger transition-colors pt-2">
                            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Выйти
                        </div>
                    </div>
                </div>
            )}

            {/* Main Navigation */}
            <div className="flex-1 flex flex-col bg-surface min-h-0 overflow-hidden">

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="px-3 py-4">
                        <div className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider px-2">Диалоги</div>
                        <div className="space-y-1 text-[15px]">
                            <div
                                onClick={() => onViewChange('search')}
                                className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeView === 'search' ? 'bg-primary/10 text-primary font-semibold' : 'text-text-secondary hover:bg-surface-secondary transition-colors font-semibold'}`}
                            >
                                <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Поиск
                            </div>
                            <div
                                onClick={() => onViewChange('chat')}
                                className={`flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeView === 'chat' ? 'bg-primary/10 text-primary font-semibold' : 'text-text-secondary hover:bg-surface-secondary transition-colors font-semibold'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Чат
                                </div>
                                {totalUnread > 0 && (
                                    <div className="px-2 py-0.5 rounded-full bg-danger text-white text-[11px] font-bold">
                                        {totalUnread}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-3 py-4 border-t border-border/50">
                        <div className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider px-2">Аналитика</div>
                        <div className="space-y-1 text-[15px]">
                            <div
                                onClick={() => onViewChange('analytics')}
                                className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeView === 'analytics' ? 'bg-primary/10 text-primary font-semibold' : 'text-text-secondary hover:bg-surface-secondary transition-colors font-semibold'}`}
                            >
                                <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Аналитика
                            </div>
                            <div
                                onClick={() => onViewChange('live-visitors')}
                                className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeView === 'live-visitors' ? 'bg-primary/10 text-primary font-semibold' : 'text-text-secondary hover:bg-surface-secondary transition-colors font-semibold'}`}
                            >
                                <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Посетители
                            </div>
                        </div>
                    </div>

                    <div className="px-3 py-4 border-t border-border/50">
                        <div className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider px-2">Настройки</div>
                        <div className="space-y-1 text-[15px]">
                            <div
                                onClick={() => onViewChange('settings')}
                                className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeView === 'settings' ? 'bg-primary/10 text-primary font-semibold' : 'text-text-secondary hover:bg-surface-secondary transition-colors font-semibold'}`}
                            >
                                <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Настройки
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
