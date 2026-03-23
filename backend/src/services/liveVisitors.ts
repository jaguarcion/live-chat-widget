export interface LiveVisitorInfo {
    visitorId: string;
    conversationId: string;
    name: string | null;
    email: string | null;
    url: string | null;
    title: string | null;
    referrer: string | null;
    connectedAt: string; // ISO
}

// projectId -> Map<visitorId, LiveVisitorInfo>
const map = new Map<string, Map<string, LiveVisitorInfo>>();

export function addLiveVisitor(projectId: string, info: LiveVisitorInfo): void {
    if (!map.has(projectId)) map.set(projectId, new Map());
    map.get(projectId)!.set(info.visitorId, info);
}

export function updateLiveVisitorPage(projectId: string, visitorId: string, url: string, title?: string | null): void {
    const projectMap = map.get(projectId);
    if (!projectMap) return;
    const existing = projectMap.get(visitorId);
    if (existing) {
        projectMap.set(visitorId, { ...existing, url, title: title ?? null });
    }
}

export function removeLiveVisitor(projectId: string, visitorId: string): void {
    map.get(projectId)?.delete(visitorId);
}

export function getLiveVisitors(projectId: string): LiveVisitorInfo[] {
    const projectMap = map.get(projectId);
    return projectMap ? Array.from(projectMap.values()) : [];
}
