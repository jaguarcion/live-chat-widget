export type SoundType = 'new_message' | 'new_conversation' | 'mention';

export function isSoundEnabled(): boolean {
    return localStorage.getItem('dashboard_sound') !== 'off';
}

export function setSoundEnabled(enabled: boolean): void {
    localStorage.setItem('dashboard_sound', enabled ? 'on' : 'off');
}

export function playNotificationSound(type: SoundType): void {
    if (!isSoundEnabled()) return;
    try {
        const ctx = new AudioContext();
        const configs: Record<SoundType, Array<{ freq: number; delay: number }>> = {
            new_message:      [{ freq: 880, delay: 0 }],
            new_conversation: [{ freq: 660, delay: 0 }, { freq: 880, delay: 0.15 }],
            mention:          [{ freq: 880, delay: 0 }, { freq: 1100, delay: 0.15 }, { freq: 1320, delay: 0.3 }],
        };
        for (const { freq, delay } of configs[type]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = ctx.currentTime + delay;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
            osc.start(start);
            osc.stop(start + 0.25);
        }
    } catch {
        // AudioContext not available (e.g., tab not focused)
    }
}
