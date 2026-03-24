import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { createProject, getProjects } from '../api';
import Sidebar from '../components/Sidebar';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import VisitorInfo from '../components/VisitorInfo';
import SettingsPage from './SettingsPage';
import SearchPanel from '../components/SearchPanel';
import AnalyticsPage from './AnalyticsPage';
import LiveVisitorsPanel from '../components/LiveVisitorsPanel';

export default function DashboardPage() {
    const { token } = useAuthStore();
    const { fetchConversations, connectSocket, disconnectSocket, activeConversationId, conversations, setActiveConversation } = useChatStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'settings' | 'dialogs' | 'channels' | 'search' | 'analytics' | 'live-visitors'>('chat');
    const [mobileShowInfo, setMobileShowInfo] = useState(false);

    useEffect(() => {
        // Global hotkey handlers
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setActiveView('search');
            }
            if (e.key === 'Escape') {
                if (activeView === 'search') setActiveView('chat');
                else if (activeConversationId) setActiveConversation(null);
                else if (activeView !== 'chat') setActiveView('chat');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeView, activeConversationId]);

    useEffect(() => {
        loadProjects();
        fetchConversations();
        const interval = setInterval(fetchConversations, 15000);
        return () => {
            clearInterval(interval);
            disconnectSocket();
        };
    }, []);

    useEffect(() => {
        if (token && projects.length > 0) {
            connectSocket(token, projects.map(p => p.id));
        }
    }, [token, projects]);

    const loadProjects = async () => {
        try {
            const { data } = await getProjects();
            setProjects(data);
            if (data.length === 0) {
                setShowCreateProject(true);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        setCreating(true);
        try {
            await createProject(newProjectName.trim());
            setNewProjectName('');
            setShowCreateProject(false);
            await loadProjects();
        } catch (err) {
            console.error('Failed to create project:', err);
        } finally {
            setCreating(false);
        }
    };

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    // On mobile: show chat panel when conversation is active or creating project
    const mobileShowChat = !!(activeConversationId || showCreateProject);

    // Shared panel structure for chat and search modes
    const renderPanels = (listContent: ReactNode) => (
        <div className="flex flex-1 min-w-0 min-h-0">

            {/* Conversation/Search list panel */}
            {/* Mobile: full-width when no active chat; hidden when chat is open */}
            {/* Tablet+: fixed width alongside chat */}
            <div className={[
                'flex-col flex-shrink-0 border-r border-border bg-surface-secondary',
                mobileShowChat
                    ? 'hidden md:flex md:w-64 lg:w-72 xl:w-80'
                    : 'flex w-full md:w-64 lg:w-72 xl:w-80',
            ].join(' ')}>
                {listContent}
            </div>

            {/* Main chat/content area */}
            <div className={[
                'flex-col min-w-0 flex-1',
                !mobileShowChat ? 'hidden md:flex' : 'flex',
            ].join(' ')}>
                {/* Mobile back bar — shown only when conversation is open */}
                {activeConversationId && (
                    <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border bg-surface shrink-0 min-w-0">
                        <button
                            onClick={() => setActiveConversation(null)}
                            className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors text-text-secondary shrink-0"
                            aria-label="Назад"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-[14px] font-semibold text-text-primary truncate flex-1 min-w-0">
                            {activeConversation?.visitor?.name || 'Посетитель'}
                        </span>
                        {activeConversation && (
                            <button
                                onClick={() => setMobileShowInfo(true)}
                                className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors text-text-muted shrink-0"
                                aria-label="Информация"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                {/* Chat or create project form */}
                {showCreateProject ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 overflow-y-auto">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 md:w-10 md:h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            {projects.length === 0 ? 'Создайте первый проект' : 'Новый проект'}
                        </h3>
                        <p className="text-sm text-text-muted mb-6 text-center max-w-xs">
                            Проект — это сайт или приложение, на котором будет установлен виджет чата
                        </p>
                        <div className="flex gap-2 w-full max-w-sm">
                            <input
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                                placeholder="Название проекта"
                                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-surface-tertiary border border-border text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                autoFocus
                            />
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim() || creating}
                                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all disabled:opacity-40 border-none cursor-pointer shrink-0"
                            >
                                {creating ? '...' : 'Создать'}
                            </button>
                        </div>
                        {projects.length > 0 && (
                            <button
                                onClick={() => setShowCreateProject(false)}
                                className="mt-3 text-xs text-text-muted hover:text-text-secondary transition-colors bg-transparent border-none cursor-pointer"
                            >
                                Отмена
                            </button>
                        )}
                        {projects.length > 0 && (
                            <div className="mt-8 w-full max-w-sm">
                                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Ваши проекты</h4>
                                <div className="space-y-2">
                                    {projects.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-tertiary/50">
                                            <span className="text-sm text-text-primary truncate">{p.name}</span>
                                            <span className="text-[10px] text-text-muted font-mono shrink-0 ml-2">{p.id.slice(0, 8)}...</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <ChatWindow />
                )}
            </div>

            {/* Visitor info — xl+ as persistent sidebar */}
            {activeConversation && !showCreateProject && (
                <div className="hidden xl:flex w-72 shrink-0 border-l border-border bg-surface-secondary flex-col">
                    <VisitorInfo conversation={activeConversation} />
                </div>
            )}

            {/* Visitor info — mobile/tablet overlay (slide-in from right) */}
            {activeConversation && !showCreateProject && mobileShowInfo && (
                <div className="xl:hidden fixed inset-0 z-50 flex justify-end" onClick={() => setMobileShowInfo(false)}>
                    <div className="w-80 max-w-[88vw] bg-surface-secondary border-l border-border flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                            <span className="font-semibold text-text-primary text-[15px]">Информация</span>
                            <button
                                onClick={() => setMobileShowInfo(false)}
                                className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors text-text-muted"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <VisitorInfo conversation={activeConversation} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar activeView={activeView} onViewChange={setActiveView} />

            {activeView === 'analytics' ? (
                <div className="flex-1 min-w-0 overflow-auto"><AnalyticsPage /></div>
            ) : activeView === 'live-visitors' ? (
                <div className="flex-1 min-w-0 overflow-auto"><LiveVisitorsPanel /></div>
            ) : activeView === 'settings' ? (
                <div className="flex-1 min-w-0 overflow-auto"><SettingsPage initialSection={'appearance'} /></div>
            ) : activeView === 'search' ? (
                renderPanels(
                    <SearchPanel onOpenConversation={() => setActiveView('chat')} />
                )
            ) : (
                renderPanels(
                    <>
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                            <h2 className="text-[16px] font-semibold text-text-primary">Диалоги</h2>
                        </div>
                        <ConversationList />
                    </>
                )
            )}
        </div>
    );
}
