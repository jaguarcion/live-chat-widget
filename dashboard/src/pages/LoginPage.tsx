import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                await register(email, password, name);
            } else {
                await login(email, password);
            }
            navigate('/app');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-surface">
            <div className="w-full max-w-md p-8 rounded-2xl bg-surface-secondary border border-border shadow-2xl">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary">LiveChat</h1>
                </div>

                <h2 className="text-xl font-semibold text-center mb-6 text-text-primary">
                    {isRegister ? 'Создать аккаунт' : 'Войти в систему'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Имя</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                placeholder="Ваше имя"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="operator@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
                    </button>
                </form>

                <p className="text-center text-text-muted text-sm mt-6">
                    {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
                    <button
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                        className="text-primary hover:text-primary-light transition-colors bg-transparent border-none cursor-pointer"
                    >
                        {isRegister ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                </p>
            </div>
        </div>
    );
}
