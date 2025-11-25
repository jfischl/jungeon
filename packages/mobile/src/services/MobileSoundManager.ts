import type { SoundHint } from '@jungeon/shared';
import type { ISoundManager } from '@jungeon/client-core';

/**
 * MobileSoundManager - Stub implementation of ISoundManager for SDK 54
 * expo-av is deprecated, expo-audio uses a different hook-based API
 * This is a placeholder until proper sound assets are added
 */
export class MobileSoundManager implements ISoundManager {
    private enabled: boolean = true;
    private volume: number = 0.5;
    private initialized: boolean = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log('MobileSoundManager initialized (sound playback disabled)');
    }

    async play(_hint: SoundHint): Promise<void> {
        // Sound playback disabled - expo-audio requires hook-based usage
        // Will be implemented when sound assets are bundled
    }

    playHint(hint?: SoundHint): void {
        if (hint) {
            this.play(hint);
        }
    }

    toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    getVolume(): number {
        return this.volume;
    }

    async cleanup(): Promise<void> {
        // No-op for stub implementation
    }
}
