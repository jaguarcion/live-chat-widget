const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/glass/svg';

export function getDiceBearUrl(seed: string | null | undefined, fallback = 'default'): string {
    const s = (seed || fallback).trim() || fallback;
    return `${DICEBEAR_BASE}?seed=${encodeURIComponent(s)}&radius=50`;
}

/** Returns the avatar src: custom upload if set, otherwise DiceBear */
export function getAvatarSrc(avatarUrl: string | null | undefined, seed: string | null | undefined): string {
    if (avatarUrl) return avatarUrl;
    return getDiceBearUrl(seed);
}
