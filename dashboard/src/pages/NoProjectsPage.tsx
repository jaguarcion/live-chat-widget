import { useAuthStore } from '../store/authStore';

export default function NoProjectsPage() {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-2xl bg-surface-secondary flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-text-primary mb-2">
                    {isSuperAdmin ? 'Добро пожаловать, супер админ!' : 'Здесь ничего нет'}
                </h1>

                <p className="text-text-muted mb-6">
                    {isSuperAdmin
                        ? 'Создайте свой первый проект, чтобы начать работать с живым чатом'
                        : 'У вас еще нет назначенных проектов. Обратитесь к супер администратору, чтобы создать или назначить вам доступ к проекту.'}
                </p>

                {isSuperAdmin && (
                    <div className="bg-surface-secondary rounded-lg p-6 text-left space-y-4">
                        <div>
                            <h3 className="font-semibold text-text-primary mb-1">Что дальше?</h3>
                            <ul className="text-sm text-text-muted space-y-2">
                                <li>• Создайте новый проект</li>
                                <li>• Назначьте администратора проекта</li>
                                <li>• Управляйте проектами и пользователями</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
