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
export const getProjects = (params?: {
    status?: 'ACTIVE' | 'FROZEN' | 'ARCHIVED' | 'ALL';
    q?: string;
    ownerId?: string;
    adminUserId?: string;
    hasActivityDays?: number;
}) => api.get('/projects', { params });
export const createProject = (name: string, adminUserId?: string, timezone?: string) =>
    api.post('/projects', { name, adminUserId, timezone });
export const getProjectMembers = (projectId: string) => api.get(`/projects/${projectId}/members`);
export const addProjectMember = (projectId: string, email: string, projectRole: string) =>
    api.post(`/projects/${projectId}/members`, { email, projectRole });
export const updateProjectMember = (projectId: string, userId: string, data: any) =>
    api.patch(`/projects/${projectId}/members/${userId}`, data);
export const removeProjectMember = (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`);

// Conversations
export const getConversations = (params?: {
    limit?: number;
    cursor?: string;
    projectId?: string;
    q?: string;
    status?: 'ALL' | 'OPEN' | 'CLOSED';
    operatorId?: 'me' | 'unassigned';
    isPinned?: 'true';
}) => api.get('/conversations', { params });
export const getMessages = (conversationId: string) =>
    api.get(`/conversations/${conversationId}/messages`);
export const sendMessage = (conversationId: string, text: string, type: string = 'TEXT', attachmentUrl?: string) =>
    api.post(`/conversations/${conversationId}/messages`, { text, type, attachmentUrl });

export const uploadFile = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData);
};
export const updateConversation = (conversationId: string, data: { status?: string; operatorId?: string | null }) =>
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

// Conversation notes and pin
export const sendNote = (conversationId: string, text: string, mentions?: string[]) =>
    api.post(`/conversations/${conversationId}/notes`, { text, mentions });
export const pinConversation = (conversationId: string) =>
    api.patch(`/conversations/${conversationId}/pin`);

// Analytics
export const getAnalyticsOverview = (projectId: string, params?: { from?: string; to?: string }) =>
    api.get(`/analytics/${projectId}/overview`, { params });
export const getAnalyticsOperators = (projectId: string, params?: { from?: string; to?: string }) =>
    api.get(`/analytics/${projectId}/operators`, { params });
export const getAnalyticsDailyChart = (projectId: string, params?: { from?: string; to?: string }) =>
    api.get(`/analytics/${projectId}/daily`, { params });
export const exportConversations = (
    projectId: string,
    params?: { from?: string; to?: string; format?: 'csv' | 'json'; status?: string }
) => api.get(`/analytics/${projectId}/export`, { params, responseType: 'blob' });
export const getLiveVisitorsRest = (projectId: string) =>
    api.get(`/analytics/${projectId}/live-visitors`);

// Webhooks
export const getWebhooks = (projectId: string) => api.get(`/webhooks/${projectId}`);
export const createWebhook = (projectId: string, data: any) => api.post(`/webhooks/${projectId}`, data);
export const updateWebhook = (id: string, data: any) => api.put(`/webhooks/${id}`, data);
export const deleteWebhook = (id: string) => api.delete(`/webhooks/${id}`);

// Project Management (SuperAdmin)
export const freezeProject = (projectId: string) => 
    api.patch(`/projects/${projectId}/freeze`, { freeze: true });
export const unfreezeProject = (projectId: string) =>
    api.patch(`/projects/${projectId}/freeze`, { freeze: false });
export const archiveProject = (projectId: string) =>
    api.patch(`/projects/${projectId}/archive`);
export const deleteProject = (projectId: string, confirmText: string) =>
    api.delete(`/projects/${projectId}`, { data: { confirmText } });
export const getProjectDeleteImpact = (projectId: string) =>
    api.get(`/projects/${projectId}/delete-impact`);
export const reassignAdmin = (projectId: string, newAdminUserId: string) => 
    api.patch(`/projects/${projectId}/admin`, { newAdminUserId });
export const getProjectStats = (projectId: string) => 
    api.get(`/projects/${projectId}/stats`);
export const getAllUsers = () => 
    api.get(`/projects/users/all`);

export default api;
