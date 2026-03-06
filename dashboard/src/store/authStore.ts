import { create } from 'zustand';
import { loginAPI, registerAPI } from '../api';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
}

// Hydrate from localStorage on store creation (synchronous, no race condition)
function getInitialState(): { token: string | null; user: User | null; isAuthenticated: boolean } {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                token,
                user: { id: payload.userId, email: '', name: '', role: payload.role },
                isAuthenticated: true,
            };
        } catch {
            localStorage.removeItem('token');
        }
    }
    return { token: null, user: null, isAuthenticated: false };
}

const initial = getInitialState();

export const useAuthStore = create<AuthState>((set) => ({
    token: initial.token,
    user: initial.user,
    isAuthenticated: initial.isAuthenticated,

    login: async (email, password) => {
        const { data } = await loginAPI(email, password);
        localStorage.setItem('token', data.token);
        set({ token: data.token, user: data.user, isAuthenticated: true });
    },

    register: async (email, password, name) => {
        const { data } = await registerAPI(email, password, name);
        localStorage.setItem('token', data.token);
        set({ token: data.token, user: data.user, isAuthenticated: true });
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
    },
}));
