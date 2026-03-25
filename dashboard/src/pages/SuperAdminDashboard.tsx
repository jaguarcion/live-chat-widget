import { useEffect, useState } from 'react';
import { getProjects, getAllUsers, createProject, deleteProject } from '../api';

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

export default function SuperAdminDashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAdmin, setSelectedAdmin] = useState<string>('');
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [projectsRes, usersRes] = await Promise.all([
                getProjects(),
                getAllUsers()
            ]);
            setProjects(projectsRes.data || []);
            setUsers(usersRes.data || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim() || !selectedAdmin) {
            alert('Заполните все поля');
            return;
        }

        try {
            setCreating(true);
            const res = await createProject(newProjectName);
            setProjects([...projects, res.data]);
            setNewProjectName('');
            setSelectedAdmin('');
            alert('Проект создан');
        } catch (err) {
            console.error('Failed to create project:', err);
            alert('Ошибка при создании проекта');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Вы уверены? Это действие нельзя отменить.')) return;

        try {
            await deleteProject(projectId);
            setProjects(projects.filter(p => p.id !== projectId));
            alert('Проект удален');
        } catch (err) {
            console.error('Failed to delete project:', err);
            alert('Ошибка при удалении проекта');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="text-text-muted">Загрузка...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-text-primary mb-8">Управление проектами</h1>

                {/* Create Project Section */}
                <div className="bg-surface-secondary rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Создать новый проект</h2>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            placeholder="Название проекта"
                            className="flex-1 px-4 py-2 rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <select
                            value={selectedAdmin}
                            onChange={e => setSelectedAdmin(e.target.value)}
                            className="px-4 py-2 rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Выберите администратора</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleCreateProject}
                            disabled={creating}
                            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 font-medium border-none cursor-pointer"
                        >
                            {creating ? 'Создание...' : 'Создать'}
                        </button>
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
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {project.status === 'ACTIVE' ? 'Активный' : 'Замороженный'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{project.owner?.name || 'N/A'}</td>
                                    <td className="px-4 py-3">{project.members?.length || 0}</td>
                                    <td className="px-4 py-3">{project.conversations?.length || 0}</td>
                                    <td className="px-4 py-3 text-text-muted text-xs">
                                        {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleDeleteProject(project.id)}
                                            className="text-red-500 hover:text-red-700 text-xs font-medium border-none bg-transparent cursor-pointer"
                                        >
                                            Удалить
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {projects.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-text-muted">Проектов не найдено</p>
                    </div>
                )}
            </div>
        </div>
    );
}
