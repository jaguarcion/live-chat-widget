import axios from 'axios';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const getAuthToken = (): string | null => authToken;

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const loginAPI = (email: string, password: string) =>
    api.post('/auth/login', { email, password });

export const registerAPI = (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name });

export const authMeAPI = () => api.get('/auth/me');
export const logoutAPI = () => api.post('/auth/logout');
export const logoutAllAPI = () => api.post('/auth/logout-all');
export const refreshAPI = () => api.post('/auth/refresh');

// Projects & Members
export const getProjects = () => api.get('/projects');
export const createProject = (name: string) => api.post('/projects', { name });
export const getProjectMembers = (projectId: string) => api.get(`/projects/${projectId}/members`);
export const addProjectMember = (projectId: string, email: string, projectRole: string) =>
    api.post(`/projects/${projectId}/members`, { email, projectRole });
export const updateProjectMember = (projectId: string, userId: string, data: any) =>
    api.patch(`/projects/${projectId}/members/${userId}`, data);
export const removeProjectMember = (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`);

// Conversations
export const getConversations = () => api.get('/conversations');
export const getMessages = (conversationId: string) =>
    api.get(`/conversations/${conversationId}/messages`);
export const sendMessage = (conversationId: string, text: string, type: string = 'TEXT', attachmentUrl?: string) =>
    api.post(`/conversations/${conversationId}/messages`, { text, type, attachmentUrl });

export const uploadFile = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData);
};
export const updateConversation = (conversationId: string, data: { status?: string; operatorId?: string }) =>
    api.patch(`/conversations/${conversationId}`, data);
export const markConversationAsRead = (conversationId: string) =>
    api.patch(`/conversations/${conversationId}/read`);

// Quick Replies
export const getQuickReplies = (projectId: string) => api.get(`/quick-replies/project/${projectId}`);
export const createQuickReply = (projectId: string, data: { title: string; text: string; shortcut?: string }) =>
    api.post(`/quick-replies/project/${projectId}`, data);
export const updateQuickReply = (id: string, data: { title?: string; text?: string; shortcut?: string }) =>
    api.put(`/quick-replies/${id}`, data);
export const deleteQuickReply = (id: string) => api.delete(`/quick-replies/${id}`);

// Visitors
export const updateVisitor = (id: string, data: { notes?: string; email?: string; name?: string }) =>
    api.patch(`/visitors/${id}`, data);
export const getVisitorPages = (id: string) => api.get(`/visitors/${id}/pages`);

// Project Settings
export const getProjectSettings = (projectId: string) => api.get(`/settings/${projectId}`);
export const updateProjectSettings = (projectId: string, data: any) =>
    api.put(`/settings/${projectId}`, data);

// Auto Actions
export const getAutoActions = (projectId: string) => api.get(`/auto-actions/${projectId}`);
export const updateAutoActions = (projectId: string, data: { rules: any[] }) =>
    api.put(`/auto-actions/${projectId}`, data);
export const getAutoActionTriggers = (
    projectId: string,
    params?: {
        limit?: number;
        ruleId?: string;
        replied?: 'all' | 'true' | 'false';
        from?: string;
        to?: string;
    }
) => api.get(`/auto-actions/${projectId}/triggers`, { params: { limit: 200, ...params } });

export const exportAutoActionTriggersCsv = (
    projectId: string,
    params?: {
        ruleId?: string;
        replied?: 'all' | 'true' | 'false';
        from?: string;
        to?: string;
    }
) => api.get(`/auto-actions/${projectId}/triggers`, {
    params: { ...params, format: 'csv', limit: 500 },
    responseType: 'blob'
});

// Search
export const searchConversations = (q: string) => api.get('/conversations/search', { params: { q } });

// Webhooks
export const getWebhooks = (projectId: string) => api.get(`/webhooks/${projectId}`);
export const createWebhook = (projectId: string, data: any) => api.post(`/webhooks/${projectId}`, data);
export const updateWebhook = (id: string, data: any) => api.put(`/webhooks/${id}`, data);
export const deleteWebhook = (id: string) => api.delete(`/webhooks/${id}`);

export default api;
