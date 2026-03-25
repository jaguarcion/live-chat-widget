import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getProjects,
    getAllUsers,
    createProject,
    freezeProject,
    unfreezeProject,
    archiveProject,
    reassignAdmin,
    getProjectDeleteImpact,
    deleteProject,
} from '../api';

interface Project {
    id: string;
    name: string;
    status: string;
    ownerId: string;
    owner: { id: string; name: string; email: string };
    members: any[];
    conversations: any[];
    createdAt: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface DeleteImpact {
    project: { id: string; name: string; status: string };
    impact: {
        memberCount: number;
        conversationCount: number;
        messageCount: number;
        webhookCount: number;
        quickReplyCount: number;
    };
}

const getProjectAdminName = (project: Project) => {
    const adminMember = project.members?.find((member: any) => member.projectRole === 'ADMIN' || member.projectRole === 'OWNER');
    return adminMember?.user?.name || project.owner?.name || 'N/A';
};

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAdmin, setSelectedAdmin] = useState<string>('');
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectTimezone, setNewProjectTimezone] = useState('Europe/Moscow');
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [showCreateWizard, setShowCreateWizard] = useState(false);
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState(() => localStorage.getItem('sa_filter_search') || '');
    const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'FROZEN' | 'ARCHIVED' | 'ALL'>(
        () => (localStorage.getItem('sa_filter_status') as 'ACTIVE' | 'FROZEN' | 'ARCHIVED' | 'ALL') || 'ALL'
    );
    const [adminFilter, setAdminFilter] = useState(() => localStorage.getItem('sa_filter_admin') || '');
    const [activityFilter, setActivityFilter] = useState<number>(() => Number(localStorage.getItem('sa_filter_activity') || 0));
    const [deleteCandidate, setDeleteCandidate] = useState<Project | null>(null);
    const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [reassignCandidate, setReassignCandidate] = useState<Project | null>(null);
    const [reassignUserId, setReassignUserId] = useState('');
    const [reassigning, setReassigning] = useState(false);
    const [pageError, setPageError] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadData();
        }, 250);

        return () => clearTimeout(timeout);
    }, [search, statusFilter, adminFilter, activityFilter]);

    useEffect(() => {
        localStorage.setItem('sa_filter_search', search);
        localStorage.setItem('sa_filter_status', statusFilter);
        localStorage.setItem('sa_filter_admin', adminFilter);
        localStorage.setItem('sa_filter_activity', String(activityFilter));
    }, [search, statusFilter, adminFilter, activityFilter]);

    const getErrorMessage = (error: any, fallback: string) => {
        const apiMessage = error?.response?.data?.error;
        if (typeof apiMessage === 'string' && apiMessage.trim()) {
            return apiMessage;
        }
        return fallback;
    };

    const clearTransientMessages = () => {
        setActionError('');
        setActionSuccess('');
    };

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('ALL');
        setAdminFilter('');
        setActivityFilter(0);
    };

    const hasActiveFilters = Boolean(search.trim() || adminFilter || activityFilter || statusFilter !== 'ALL');

    const loadData = async () => {
        try {
            setLoading(true);
            setPageError('');
            const [projectsRes, usersRes] = await Promise.all([
                getProjects({
                    status: statusFilter,
                    q: search || undefined,
                    adminUserId: adminFilter || undefined,
                    hasActivityDays: activityFilter || undefined,
                }),
                getAllUsers()
            ]);
            setProjects(projectsRes.data || []);
            setUsers(usersRes.data || []);
        } catch (err) {
            console.error('Failed to load data:', err);
            setPageError(getErrorMessage(err, 'Не удалось загрузить данные проектов. Попробуйте обновить страницу.'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim() || !selectedAdmin) {
            setActionError('Заполните все поля мастера перед созданием проекта.');
            return;
        }

        try {
            clearTransientMessages();
            setCreating(true);
            const res = await createProject(newProjectName.trim(), selectedAdmin, newProjectTimezone);
            setProjects([...projects, res.data]);
            setNewProjectName('');
            setSelectedAdmin('');
            setNewProjectTimezone('Europe/Moscow');
            setWizardStep(1);
            setShowCreateWizard(false);
            setActionSuccess(`Проект "${res.data?.name || newProjectName.trim()}" создан.`);
        } catch (err) {
            console.error('Failed to create project:', err);
            setActionError(getErrorMessage(err, 'Ошибка при создании проекта.'));
        } finally {
            setCreating(false);
        }
    };

    const openDeleteModal = async (project: Project) => {
        try {
            clearTransientMessages();
            setDeleteCandidate(project);
            setDeleteConfirmText('');
            const { data } = await getProjectDeleteImpact(project.id);
            setDeleteImpact(data);
        } catch (error) {
            console.error('Failed to load delete impact:', error);
            setActionError(getErrorMessage(error, 'Не удалось загрузить impact удаления проекта.'));
            setDeleteCandidate(null);
            setDeleteImpact(null);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteCandidate) return;
        if (deleteConfirmText.trim() !== deleteCandidate.name) {
            setActionError('Подтверждение не совпадает с названием проекта.');
            return;
        }

        try {
            clearTransientMessages();
            setDeleting(true);
            await deleteProject(deleteCandidate.id, deleteConfirmText.trim());
            setActionSuccess(`Проект "${deleteCandidate.name}" удален.`);
            setDeleteCandidate(null);
            setDeleteImpact(null);
            setDeleteConfirmText('');
            await loadData();
        } catch (error) {
            console.error('Failed to delete project:', error);
            setActionError(getErrorMessage(error, 'Ошибка при удалении проекта.'));
        } finally {
            setDeleting(false);
        }
    };

    const handleReassignAdmin = async () => {
        if (!reassignCandidate || !reassignUserId) {
            setActionError('Выберите пользователя для назначения администратором.');
            return;
        }

        try {
            clearTransientMessages();
            setReassigning(true);
            await reassignAdmin(reassignCandidate.id, reassignUserId);
            setActionSuccess(`Администратор проекта "${reassignCandidate.name}" обновлен.`);
            setReassignCandidate(null);
            setReassignUserId('');
            await loadData();
        } catch (error) {
            console.error('Failed to reassign admin:', error);
            setActionError(getErrorMessage(error, 'Ошибка при переназначении администратора.'));
        } finally {
            setReassigning(false);
        }
    };

    const handleFreezeToggle = async (project: Project) => {
        try {
            clearTransientMessages();
            if (project.status === 'FROZEN') {
                await unfreezeProject(project.id);
                setActionSuccess(`Проект "${project.name}" разморожен.`);
            } else {
                await freezeProject(project.id);
                setActionSuccess(`Проект "${project.name}" заморожен.`);
            }
            await loadData();
        } catch (err) {
            console.error('Failed to update freeze state:', err);
            setActionError(getErrorMessage(err, 'Ошибка при изменении статуса проекта.'));
        }
    };

    const handleArchiveProject = async (projectId: string) => {
        if (!confirm('Архивировать проект? Его можно будет найти через фильтр ARCHIVED.')) return;

        try {
            clearTransientMessages();
            const project = projects.find(item => item.id === projectId);
            await archiveProject(projectId);
            if (project) {
                setActionSuccess(`Проект "${project.name}" архивирован.`);
            }
            await loadData();
        } catch (err) {
            console.error('Failed to archive project:', err);
            setActionError(getErrorMessage(err, 'Ошибка при архивировании проекта.'));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface p-6">
                <div className="max-w-6xl mx-auto animate-pulse">
                    <div className="h-9 w-72 bg-surface-secondary rounded-md mb-8" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="rounded-lg border border-border bg-surface-secondary p-4">
                                <div className="h-3 w-20 bg-surface rounded mb-2" />
                                <div className="h-7 w-14 bg-surface rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="rounded-lg border border-border bg-surface-secondary p-6 mb-6">
                        <div className="h-5 w-48 bg-surface rounded mb-3" />
                        <div className="h-4 w-80 bg-surface rounded" />
                    </div>
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                        <div className="h-11 w-full bg-surface rounded mb-3" />
                        <div className="h-11 w-full bg-surface rounded mb-3" />
                        <div className="h-11 w-full bg-surface rounded" />
                    </div>
                </div>
            </div>
        );
    }

    const activeCount = projects.filter(project => project.status === 'ACTIVE').length;
    const frozenCount = projects.filter(project => project.status === 'FROZEN').length;
    const archivedCount = projects.filter(project => project.status === 'ARCHIVED').length;
    const totalConversations = projects.reduce((sum, project) => sum + (project.conversations?.length || 0), 0);

    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-text-primary mb-8">Управление проектами</h1>

                {pageError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex flex-wrap items-center justify-between gap-3">
                        <span>{pageError}</span>
                        <button
                            onClick={loadData}
                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium border-none cursor-pointer"
                        >
                            Повторить
                        </button>
                    </div>
                )}

                {!pageError && actionError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
                        <span>{actionError}</span>
                        <button
                            onClick={() => setActionError('')}
                            className="text-xs font-medium text-red-700 border-none bg-transparent cursor-pointer"
                        >
                            Скрыть
                        </button>
                    </div>
                )}

                {!pageError && actionSuccess && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center justify-between gap-2">
                        <span>{actionSuccess}</span>
                        <button
                            onClick={() => setActionSuccess('')}
                            className="text-xs font-medium text-green-700 border-none bg-transparent cursor-pointer"
                        >
                            Скрыть
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                        <div className="text-xs text-text-muted">Активные проекты</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">{activeCount}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                        <div className="text-xs text-text-muted">Замороженные</div>
                        <div className="text-2xl font-bold text-amber-600 mt-1">{frozenCount}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                        <div className="text-xs text-text-muted">Архивные</div>
                        <div className="text-2xl font-bold text-slate-600 mt-1">{archivedCount}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                        <div className="text-xs text-text-muted">Диалогов в портфеле</div>
                        <div className="text-2xl font-bold text-primary mt-1">{totalConversations}</div>
                    </div>
                </div>

                {/* Create Project Section */}
                <div className="bg-surface-secondary rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-text-primary">Создание проекта</h2>
                            <p className="text-sm text-text-muted mt-1">Используйте мастер для корректной инициализации проекта</p>
                        </div>
                        <button
                            onClick={() => setShowCreateWizard(true)}
                            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-medium border-none cursor-pointer"
                        >
                            Открыть мастер
                        </button>
                    </div>
                </div>

                <div className="bg-surface-secondary rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Поиск по названию"
                            className="px-3 py-2 rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as 'ACTIVE' | 'FROZEN' | 'ARCHIVED' | 'ALL')}
                            className="px-3 py-2 rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="ALL">Все статусы</option>
                            <option value="ACTIVE">Активные</option>
                            <option value="FROZEN">Замороженные</option>
                            <option value="ARCHIVED">Архивные</option>
                        </select>
                        <select
                            value={adminFilter}
                            onChange={e => setAdminFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Все админы</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                        <select
                            value={String(activityFilter)}
                            onChange={e => setActivityFilter(Number(e.target.value))}
                            className="px-3 py-2 rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="0">Без фильтра активности</option>
                            <option value="1">Активность за 1 день</option>
                            <option value="7">Активность за 7 дней</option>
                            <option value="30">Активность за 30 дней</option>
                        </select>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted">
                        <span>Найдено проектов: {projects.length}</span>
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="px-2.5 py-1.5 rounded-md bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors text-xs font-medium border-none cursor-pointer"
                            >
                                Сбросить фильтры
                            </button>
                        )}
                    </div>
                </div>

                {/* Projects Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-text-primary">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-4 py-3 font-semibold">Название</th>
                                <th className="px-4 py-3 font-semibold">Статус</th>
                                <th className="px-4 py-3 font-semibold">Администратор</th>
                                <th className="px-4 py-3 font-semibold">Членов</th>
                                <th className="px-4 py-3 font-semibold">Диалогов</th>
                                <th className="px-4 py-3 font-semibold">Создано</th>
                                <th className="px-4 py-3 font-semibold">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(project => (
                                <tr key={project.id} className="border-b border-border hover:bg-surface-secondary">
                                    <td className="px-4 py-3 font-medium">{project.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            project.status === 'ACTIVE'
                                                ? 'bg-green-100 text-green-700'
                                                : project.status === 'FROZEN'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {project.status === 'ACTIVE' ? 'Активный' : project.status === 'FROZEN' ? 'Замороженный' : 'Архивный'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{getProjectAdminName(project)}</td>
                                    <td className="px-4 py-3">{project.members?.length || 0}</td>
                                    <td className="px-4 py-3">{project.conversations?.length || 0}</td>
                                    <td className="px-4 py-3 text-text-muted text-xs">
                                        {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <button
                                                onClick={() => navigate(`/app/projects/${project.id}/chat`)}
                                                className="text-primary hover:text-primary-hover text-xs font-medium border-none bg-transparent cursor-pointer"
                                            >
                                                Чаты
                                            </button>
                                            <button
                                                onClick={() => navigate(`/app/projects/${project.id}/settings`)}
                                                className="text-text-primary hover:text-primary text-xs font-medium border-none bg-transparent cursor-pointer"
                                            >
                                                Редактировать
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setReassignCandidate(project);
                                                    setReassignUserId('');
                                                }}
                                                className="text-blue-600 hover:text-blue-700 text-xs font-medium border-none bg-transparent cursor-pointer"
                                            >
                                                Назначить админа
                                            </button>
                                            <button
                                                onClick={() => handleFreezeToggle(project)}
                                                className="text-amber-600 hover:text-amber-700 text-xs font-medium border-none bg-transparent cursor-pointer"
                                            >
                                                {project.status === 'FROZEN' ? 'Разморозить' : 'Заморозить'}
                                            </button>
                                            {project.status !== 'ARCHIVED' && (
                                                <button
                                                    onClick={() => handleArchiveProject(project.id)}
                                                    className="text-slate-600 hover:text-slate-800 text-xs font-medium border-none bg-transparent cursor-pointer"
                                                >
                                                    Архивировать
                                                </button>
                                            )}
                                            {project.status === 'ARCHIVED' && (
                                                <button
                                                    onClick={() => openDeleteModal(project)}
                                                    className="text-red-600 hover:text-red-700 text-xs font-medium border-none bg-transparent cursor-pointer"
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {projects.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-text-muted text-base">
                            {hasActiveFilters ? 'По текущим фильтрам проекты не найдены.' : 'Проекты пока не созданы.'}
                        </p>
                        <p className="text-text-muted text-sm mt-1">
                            {hasActiveFilters ? 'Измените параметры поиска или сбросьте фильтры.' : 'Откройте мастер и создайте первый проект.'}
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-3">
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary text-sm font-medium border-none cursor-pointer"
                                >
                                    Сбросить фильтры
                                </button>
                            )}
                            <button
                                onClick={() => setShowCreateWizard(true)}
                                className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-sm font-medium border-none cursor-pointer"
                            >
                                Создать проект
                            </button>
                        </div>
                    </div>
                )}

                {showCreateWizard && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                        <div className="w-full max-w-xl rounded-xl bg-surface border border-border shadow-2xl">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-text-primary">Мастер создания проекта</h3>
                                <button
                                    onClick={() => {
                                        setShowCreateWizard(false);
                                        setWizardStep(1);
                                    }}
                                    className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer"
                                >
                                    Закрыть
                                </button>
                            </div>
                            <div className="px-6 py-5 space-y-4">
                                <div className="text-xs text-text-muted">Шаг {wizardStep} из 3</div>

                                {wizardStep === 1 && (
                                    <div className="space-y-3">
                                        <label className="text-sm text-text-secondary">Название проекта</label>
                                        <input
                                            value={newProjectName}
                                            onChange={e => setNewProjectName(e.target.value)}
                                            placeholder="Например: Магазин RU"
                                            className="w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary"
                                        />
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="space-y-3">
                                        <label className="text-sm text-text-secondary">Назначить администратора</label>
                                        <select
                                            value={selectedAdmin}
                                            onChange={e => setSelectedAdmin(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary"
                                        >
                                            <option value="">Выберите администратора</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <div className="space-y-3">
                                        <label className="text-sm text-text-secondary">Часовой пояс</label>
                                        <select
                                            value={newProjectTimezone}
                                            onChange={e => setNewProjectTimezone(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary"
                                        >
                                            <option value="Europe/Moscow">Europe/Moscow</option>
                                            <option value="Europe/Berlin">Europe/Berlin</option>
                                            <option value="UTC">UTC</option>
                                            <option value="Asia/Tbilisi">Asia/Tbilisi</option>
                                        </select>
                                        <div className="rounded-lg bg-surface-secondary border border-border p-3 text-sm text-text-secondary">
                                            После создания проект будет доступен в каталоге и готов к настройке виджета.
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                                <button
                                    onClick={() => setWizardStep(prev => prev === 1 ? 1 : ((prev - 1) as 1 | 2 | 3))}
                                    className="px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-secondary"
                                    disabled={wizardStep === 1}
                                >
                                    Назад
                                </button>
                                {wizardStep < 3 ? (
                                    <button
                                        onClick={() => setWizardStep(prev => (prev + 1) as 1 | 2 | 3)}
                                        disabled={(wizardStep === 1 && !newProjectName.trim()) || (wizardStep === 2 && !selectedAdmin)}
                                        className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
                                    >
                                        Далее
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={creating || !newProjectName.trim() || !selectedAdmin}
                                        className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
                                    >
                                        {creating ? 'Создание...' : 'Создать проект'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {reassignCandidate && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                        <div className="w-full max-w-lg rounded-xl bg-surface border border-border shadow-2xl">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-text-primary">Переназначение администратора</h3>
                                <button
                                    onClick={() => {
                                        setReassignCandidate(null);
                                        setReassignUserId('');
                                    }}
                                    className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer"
                                >
                                    Закрыть
                                </button>
                            </div>
                            <div className="px-6 py-5 space-y-3">
                                <p className="text-sm text-text-secondary">Проект: <span className="text-text-primary font-medium">{reassignCandidate.name}</span></p>
                                <select
                                    value={reassignUserId}
                                    onChange={e => setReassignUserId(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary"
                                >
                                    <option value="">Выберите пользователя</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="px-6 py-4 border-t border-border flex justify-end">
                                <button
                                    onClick={handleReassignAdmin}
                                    disabled={reassigning || !reassignUserId}
                                    className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
                                >
                                    {reassigning ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {deleteCandidate && deleteImpact && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                        <div className="w-full max-w-xl rounded-xl bg-surface border border-border shadow-2xl">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-red-600">Удаление проекта</h3>
                                <button
                                    onClick={() => {
                                        setDeleteCandidate(null);
                                        setDeleteImpact(null);
                                        setDeleteConfirmText('');
                                    }}
                                    className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer"
                                >
                                    Закрыть
                                </button>
                            </div>
                            <div className="px-6 py-5 space-y-4">
                                <p className="text-sm text-text-secondary">Этот шаг необратим. Будут удалены:</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-lg bg-surface-secondary border border-border p-3">Участники: <b>{deleteImpact.impact.memberCount}</b></div>
                                    <div className="rounded-lg bg-surface-secondary border border-border p-3">Диалоги: <b>{deleteImpact.impact.conversationCount}</b></div>
                                    <div className="rounded-lg bg-surface-secondary border border-border p-3">Сообщения: <b>{deleteImpact.impact.messageCount}</b></div>
                                    <div className="rounded-lg bg-surface-secondary border border-border p-3">Webhooks: <b>{deleteImpact.impact.webhookCount}</b></div>
                                </div>
                                <div>
                                    <label className="text-sm text-text-secondary">Введите название проекта для подтверждения: <b>{deleteCandidate.name}</b></label>
                                    <input
                                        value={deleteConfirmText}
                                        onChange={e => setDeleteConfirmText(e.target.value)}
                                        className="mt-2 w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary"
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-border flex justify-end">
                                <button
                                    onClick={handleDeleteConfirmed}
                                    disabled={deleting || deleteConfirmText.trim() !== deleteCandidate.name}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
                                >
                                    {deleting ? 'Удаление...' : 'Удалить навсегда'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
