import { useState, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import {
    getProjects,
    getAnalyticsOverview,
    getAnalyticsOperators,
    getAnalyticsDailyChart,
    exportConversations as exportConversationsApi,
} from '../api';

export default function AnalyticsPage({ initialProjectId = '', projectLocked = false }: { initialProjectId?: string; projectLocked?: boolean }) {
    const [projects, setProjects] = useState<any[]>([]);
    const [activeProject, setActiveProject] = useState<string>(initialProjectId);
    const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [overview, setOverview] = useState<any>(null);
    const [operators, setOperators] = useState<any>([]);
    const [daily, setDaily] = useState<any>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const { data } = await getProjects();
                const availableProjects = data || [];
                setProjects(availableProjects);
                setActiveProject(current => {
                    if (initialProjectId && availableProjects.some((project: any) => project.id === initialProjectId)) {
                        return initialProjectId;
                    }
                    if (current && availableProjects.some((project: any) => project.id === current)) {
                        return current;
                    }
                    return availableProjects[0]?.id || '';
                });
            } catch (err) {
                console.error('Failed to load projects for analytics:', err);
            }
        };

        loadProjects();
    }, [initialProjectId]);

    const loadData = async () => {
        if (!activeProject) return;
        setLoading(true);
        try {
            const params = { from: fromDate, to: toDate };
            const [o, op, d] = await Promise.all([
                getAnalyticsOverview(activeProject, params),
                getAnalyticsOperators(activeProject, params),  
                getAnalyticsDailyChart(activeProject, params),
            ]);
            setOverview(o.data);
            setOperators(op.data);
            setDaily(d.data);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeProject, fromDate, toDate]);

    const handleExport = async (format: 'csv' | 'json') => {
        if (!activeProject) return;
        try {
            const response = await exportConversationsApi(activeProject, {
                from: fromDate,
                to: toDate,
                format,
            });
            const url = window.URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversations-${activeProject}.${format}`;
            a.click();
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const maxDailyCreated = Math.max(...(daily.map((d: any) => d.created) || [0]));
    const maxDailyClosed = Math.max(...(daily.map((d: any) => d.closed) || [0]));

    return (
        <div className="flex-1 flex flex-col bg-surface-secondary overflow-y-auto">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-text-primary mb-1">Аналитика</h2>
                    <p className="text-sm text-text-muted">Статистика по проектам и операторам</p>
                </div>

                {/* Controls */}
                <div className="bg-surface rounded-lg p-4 border border-border space-y-4">
                    <div className="flex gap-3 flex-wrap items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-text-secondary mb-2">Проект</label>
                            <select
                                value={activeProject}
                                onChange={(e) => setActiveProject(e.target.value)}
                                disabled={projectLocked}
                                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary text-sm"
                            >
                                <option value="">Выберите проект</option>
                                {projects.map((project: any) => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-text-secondary mb-2">С</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary text-sm"
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-text-secondary mb-2">По</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleExport('csv')}
                                disabled={!activeProject || loading}
                                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
                            >
                                CSV
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                disabled={!activeProject || loading}
                                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
                            >
                                JSON
                            </button>
                        </div>
                    </div>
                </div>

                {!activeProject ? (
                    <div className="flex items-center justify-center py-20 text-center">
                        <div>
                            <p className="text-text-muted text-sm">Выберите проект для просмотра аналитики</p>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-text-muted text-sm">Загрузка...</p>
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-surface rounded-lg p-4 border border-border">
                                <p className="text-xs text-text-muted mb-2">Всего диалогов</p>
                                <p className="text-3xl font-bold text-text-primary">{overview?.totalConversations || 0}</p>
                                <p className="text-[10px] text-text-muted mt-2">{fromDate} – {toDate}</p>
                            </div>
                            <div className="bg-surface rounded-lg p-4 border border-border">
                                <p className="text-xs text-text-muted mb-2">Закрыто</p>
                                <p className="text-3xl font-bold text-success">{overview?.closedConversations || 0}</p>
                                <p className="text-[10px] text-text-muted mt-2">{Math.round((overview?.closedConversations || 0) / (overview?.totalConversations || 1) * 100)}%</p>
                            </div>
                            <div className="bg-surface rounded-lg p-4 border border-border">
                                <p className="text-xs text-text-muted mb-2">Открыто</p>
                                <p className="text-3xl font-bold text-primary">{overview?.openConversations || 0}</p>
                                <p className="text-[10px] text-text-muted mt-2">{Math.round((overview?.openConversations || 0) / (overview?.totalConversations || 1) * 100)}%</p>
                            </div>
                            <div className="bg-surface rounded-lg p-4 border border-border">
                                <p className="text-xs text-text-muted mb-2">Сред. ответ</p>
                                <p className="text-3xl font-bold text-primary">{overview?.avgFirstResponseSec ? `${Math.round(overview.avgFirstResponseSec / 60)}м` : '—'}</p>
                                <p className="text-[10px] text-text-muted mt-2">первый ответ</p>
                            </div>
                        </div>

                        {/* Daily Chart */}
                        <div className="bg-surface rounded-lg p-6 border border-border">
                            <h3 className="text-sm font-semibold text-text-primary mb-4">Диалоги по дням</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {daily.length === 0 ? (
                                    <p className="text-xs text-text-muted py-4">Нет данных</p>
                                ) : (
                                    daily.slice(-30).map((d: any) => (
                                        <div key={d.date} className="flex items-center gap-3">
                                            <span className="text-xs text-text-muted w-20 text-right">{d.date}</span>
                                            <div className="flex-1 flex gap-1">
                                                <div className="flex items-end gap-1">
                                                    <div
                                                        className="rounded-sm bg-primary"
                                                        style={{
                                                            width: '20px',
                                                            height: `${(d.created / maxDailyCreated) * 60}px`,
                                                        }}
                                                        title={`Создано: ${d.created}`}
                                                    />
                                                    <span className="text-[10px] text-text-muted">{d.created}</span>
                                                </div>
                                                <div className="flex items-end gap-1">
                                                    <div
                                                        className="rounded-sm bg-success"
                                                        style={{
                                                            width: '20px',
                                                            height: `${(d.closed / maxDailyClosed) * 60}px`,
                                                        }}
                                                        title={`Закрыто: ${d.closed}`}
                                                    />
                                                    <span className="text-[10px] text-text-muted">{d.closed}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Operators Table */}
                        <div className="bg-surface rounded-lg border border-border overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <h3 className="text-sm font-semibold text-text-primary">По операторам</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-secondary border-b border-border">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary">Оператор</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-text-secondary">Диалогов</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-text-secondary">Сообщений</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-text-secondary">Сред. ответ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {operators.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-4 text-center text-xs text-text-muted">
                                                    Нет данных
                                                </td>
                                            </tr>
                                        ) : (
                                            operators.map((op: any) => (
                                                <tr key={op.operator?.id || 'unknown'} className="hover:bg-surface-secondary">
                                                    <td className="px-4 py-2 text-text-primary font-medium">
                                                        {op.operator?.name || 'Неизвестно'}
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-text-primary">{op.chatCount}</td>
                                                    <td className="px-4 py-2 text-center text-text-primary">{op.messageCount}</td>
                                                    <td className="px-4 py-2 text-center text-text-primary">
                                                        {op.avgFirstResponseSec ? `${Math.round(op.avgFirstResponseSec / 60)}м` : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
