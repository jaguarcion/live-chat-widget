import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
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

// Projects
export const getProjects = () => api.get('/projects');
export const createProject = (name: string) => api.post('/projects', { name });

// Conversations
export const getConversations = () => api.get('/conversations');
export const getMessages = (conversationId: string) =>
    api.get(`/conversations/${conversationId}/messages`);
export const sendMessage = (conversationId: string, text: string, type: string = 'TEXT', attachmentUrl?: string) =>
    api.post(`/conversations/${conversationId}/messages`, { text, type, attachmentUrl });

export const uploadFile = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/widget/upload', formData);
};
export const updateConversation = (conversationId: string, data: { status?: string; operatorId?: string }) =>
    api.patch(`/conversations/${conversationId}`, data);

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

// Project Settings
export const getProjectSettings = (projectId: string) => api.get(`/settings/${projectId}`);
export const updateProjectSettings = (projectId: string, data: any) =>
    api.put(`/settings/${projectId}`, data);

export default api;
