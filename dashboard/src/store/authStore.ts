import { create } from 'zustand';
import { loginAPI, registerAPI, authMeAPI, logoutAPI, refreshAPI, setAuthToken } from '../api';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
    title?: string;
    showInGreeting?: boolean;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    fetchUser: () => Promise<void>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isInitializing: true,

    initialize: async () => {
        try {
            const { data } = await refreshAPI();
            setAuthToken(data.token);
            set({ token: data.token, user: data.user, isAuthenticated: true, isInitializing: false });
        } catch {
            setAuthToken(null);
            set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
        }
    },

    login: async (email, password) => {
        const { data } = await loginAPI(email, password);
        setAuthToken(data.token);
        set({ token: data.token, user: data.user, isAuthenticated: true });
    },

    register: async (email, password, name) => {
        const { data } = await registerAPI(email, password, name);
        setAuthToken(data.token);
        set({ token: data.token, user: data.user, isAuthenticated: true });
    },

    fetchUser: async () => {
        try {
            const { data } = await authMeAPI();
            set({ user: data.user });
        } catch (error) {
            console.error('Failed to fetch user:', error);
            setAuthToken(null);
            set({ token: null, user: null, isAuthenticated: false });
        }
    },

    logout: () => {
        // Best-effort server-side revoke for current token.
        logoutAPI().catch(() => undefined);
        setAuthToken(null);
        set({ token: null, user: null, isAuthenticated: false });
    },
}));
