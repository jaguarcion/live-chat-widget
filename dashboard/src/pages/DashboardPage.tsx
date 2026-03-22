import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { createProject, getProjects } from '../api';
import Sidebar from '../components/Sidebar';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import VisitorInfo from '../components/VisitorInfo';
import SettingsPage from './SettingsPage';
import SearchPanel from '../components/SearchPanel';

export default function DashboardPage() {
    const { token } = useAuthStore();
    const { fetchConversations, connectSocket, disconnectSocket, activeConversationId, conversations } = useChatStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'settings' | 'dialogs' | 'channels' | 'search'>('chat');

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

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar activeView={activeView} onViewChange={setActiveView} />

            {activeView === 'settings' ? (
                <SettingsPage initialSection={'appearance'} />
            ) : activeView === 'search' ? (
                <div className="flex flex-1 min-w-0">
                    <div className="w-80 flex-shrink-0 border-r border-border bg-surface-secondary flex flex-col">
                        <SearchPanel onOpenConversation={() => setActiveView('chat')} />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                        <ChatWindow />
                    </div>
                    {activeConversationId && activeConversation && (
                        <div className="w-72 flex-shrink-0 border-l border-border bg-surface-secondary">
                            <VisitorInfo conversation={activeConversation} />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-1 min-w-0">
                    {/* Conversations list */}
                    <div className="w-80 flex-shrink-0 border-r border-border bg-surface-secondary flex flex-col">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-text-primary">Диалоги</h2>
                        </div>
                        <ConversationList />
                    </div>

                    {/* Chat area or Create Project */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {showCreateProject ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8">
                                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-text-primary mb-2">
                                    {projects.length === 0 ? 'Создайте первый проект' : 'Новый проект'}
                                </h3>
                                <p className="text-sm text-text-muted mb-6 text-center max-w-sm">
                                    Проект — это сайт или приложение, на котором будет установлен виджет чата
                                </p>
                                <div className="flex gap-2 w-full max-w-sm">
                                    <input
                                        value={newProjectName}
                                        onChange={e => setNewProjectName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                                        placeholder="Название проекта (например: Мой сайт)"
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-surface-tertiary border border-border text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={!newProjectName.trim() || creating}
                                        className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all disabled:opacity-40 border-none cursor-pointer"
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
                                                    <span className="text-sm text-text-primary">{p.name}</span>
                                                    <span className="text-[10px] text-text-muted font-mono">{p.id.slice(0, 8)}...</span>
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

                    {/* Visitor info panel */}
                    {activeConversation && !showCreateProject && (
                        <div className="w-72 flex-shrink-0 border-l border-border bg-surface-secondary">
                            <VisitorInfo conversation={activeConversation} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
