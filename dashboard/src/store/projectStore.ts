import { create } from 'zustand';
import { getProjects } from '../api';

interface Project {
    id: string;
    name: string;
    status: string;
}

interface ProjectState {
    projects: Project[];
    selectedProjectId: string;
    loading: boolean;
    setSelectedProjectId: (projectId: string) => void;
    loadProjects: (params?: {
        status?: 'ACTIVE' | 'FROZEN' | 'ARCHIVED' | 'ALL';
        q?: string;
        ownerId?: string;
        adminUserId?: string;
        hasActivityDays?: number;
    }) => Promise<Project[]>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    selectedProjectId: localStorage.getItem('last_selected_project_id') || '',
    loading: false,

    setSelectedProjectId: (projectId: string) => {
        localStorage.setItem('last_selected_project_id', projectId);
        set({ selectedProjectId: projectId });
    },

    loadProjects: async (params) => {
        set({ loading: true });
        try {
            const { data } = await getProjects(params);
            const projects = (data || []) as Project[];
            const currentSelected = get().selectedProjectId;
            const persistedSelected = localStorage.getItem('last_selected_project_id') || '';
            const candidateSelected = currentSelected || persistedSelected;
            const nextSelected = projects.some(project => project.id === candidateSelected)
                ? candidateSelected
                : (projects[0]?.id || '');
            if (nextSelected) {
                localStorage.setItem('last_selected_project_id', nextSelected);
            } else {
                localStorage.removeItem('last_selected_project_id');
            }
            set({ projects, selectedProjectId: nextSelected, loading: false });
            return projects;
        } catch (error) {
            console.error('Failed to load projects in store:', error);
            localStorage.removeItem('last_selected_project_id');
            set({ projects: [], selectedProjectId: '', loading: false });
            return [];
        }
    }
}));
