import type { SoundHint } from '@jungeon/shared';
import type { ISoundManager } from '@jungeon/client-core';

/**
 * WebSoundManager - Web Audio API implementation of ISoundManager
 */
export class WebSoundManager implements ISoundManager {
    private audioContext: AudioContext | null = null;
    private sounds: Map<SoundHint, AudioBuffer> = new Map();
    private enabled: boolean = true;
    private volume: number = 0.5;
    private initialized: boolean = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            this.audioContext = new AudioContext();
            await this.loadAllSounds();
            this.initialized = true;
            console.log('WebSoundManager initialized');
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
        }
    }

    private async loadAllSounds(): Promise<void> {
        const soundFiles: Partial<Record<SoundHint, string>> = {
            'attack': '/sounds/attack.mp3',
            'attack-critical': '/sounds/critical.mp3',
            'damage-taken': '/sounds/damage.mp3',
            'defend': '/sounds/defend.mp3',
            'flee': '/sounds/flee.mp3',
            'flee-fail': '/sounds/flee-fail.mp3',
            'heal': '/sounds/heal.mp3',
            'victory': '/sounds/victory.mp3',
            'death': '/sounds/death.mp3',
            'level-up': '/sounds/levelup.mp3',
            'door-locked': '/sounds/locked.mp3',
            'unlock': '/sounds/unlock.mp3',
            'pickup-item': '/sounds/pickup.mp3',
            'pickup-coins': '/sounds/coins.mp3',
            'drop': '/sounds/drop.mp3',
            'chat': '/sounds/chat.mp3',
            'challenge-received': '/sounds/challenge.mp3',
            'challenge-sent': '/sounds/challenge.mp3',
            'duel-start': '/sounds/duel.mp3',
            'ghost-enters': '/sounds/ghost.mp3',
            'ghost-nearby': '/sounds/ghost-ambient.mp3',
            'error': '/sounds/error.mp3',
        };

        const loadPromises = Object.entries(soundFiles).map(async ([hint, path]) => {
            try {
                const buffer = await this.loadSound(path);
                if (buffer) {
                    this.sounds.set(hint as SoundHint, buffer);
                }
            } catch {
                console.debug(`Sound not found: ${path}`);
            }
        });

        await Promise.allSettled(loadPromises);
        console.log(`Loaded ${this.sounds.size} sounds`);
    }

    private async loadSound(url: string): Promise<AudioBuffer | null> {
        if (!this.audioContext) return null;

        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            const arrayBuffer = await response.arrayBuffer();
            return await this.audioContext.decodeAudioData(arrayBuffer);
        } catch {
            return null;
        }
    }

    play(hint: SoundHint): void {
        if (!this.enabled || !this.audioContext || !this.initialized) {
            return;
        }

        const buffer = this.sounds.get(hint);
        if (!buffer) return;

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            gainNode.gain.value = this.volume;

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start(0);
        } catch (error) {
            console.warn('Failed to play sound:', hint, error);
        }
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
}
