import { SoundHint } from '../../../shared/types';

/**
 * SoundManager - Handles audio playback for game events
 * Uses Web Audio API for low-latency sound effects
 */
export class SoundManager {
    private audioContext: AudioContext | null = null;
    private sounds: Map<SoundHint, AudioBuffer> = new Map();
    private enabled: boolean = true;
    private volume: number = 0.5;
    private initialized: boolean = false;

    constructor() {
        // Audio context must be created after user interaction
        // We'll initialize lazily on first sound request
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            this.audioContext = new AudioContext();
            await this.loadAllSounds();
            this.initialized = true;
            console.log('SoundManager initialized');
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
        }
    }

    /**
     * Load all sound effects
     */
    private async loadAllSounds(): Promise<void> {
        const soundFiles: Partial<Record<SoundHint, string>> = {
            // Combat
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
            // Movement & Environment
            'door-locked': '/sounds/locked.mp3',
            'unlock': '/sounds/unlock.mp3',
            // Items
            'pickup-item': '/sounds/pickup.mp3',
            'pickup-coins': '/sounds/coins.mp3',
            'drop': '/sounds/drop.mp3',
            // Social
            'chat': '/sounds/chat.mp3',
            'challenge-received': '/sounds/challenge.mp3',
            'challenge-sent': '/sounds/challenge.mp3',
            'duel-start': '/sounds/duel.mp3',
            // Monsters
            'ghost-enters': '/sounds/ghost.mp3',
            'ghost-nearby': '/sounds/ghost-ambient.mp3',
            // Errors
            'error': '/sounds/error.mp3',
        };

        const loadPromises = Object.entries(soundFiles).map(async ([hint, path]) => {
            try {
                const buffer = await this.loadSound(path);
                if (buffer) {
                    this.sounds.set(hint as SoundHint, buffer);
                }
            } catch (error) {
                // Silently fail for missing sounds - they're optional
                console.debug(`Sound not found: ${path}`);
            }
        });

        await Promise.allSettled(loadPromises);
    }

    /**
     * Load a single sound file
     */
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

    /**
     * Play a sound by its hint
     */
    play(hint: SoundHint): void {
        if (!this.enabled || !this.audioContext || !this.initialized) {
            return;
        }

        const buffer = this.sounds.get(hint);
        if (!buffer) {
            // Sound not loaded - that's okay, not all sounds are required
            return;
        }

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

    /**
     * Play a sound hint if present
     */
    playHint(hint: SoundHint | undefined): void {
        if (hint) {
            this.play(hint);
        }
    }

    /**
     * Enable or disable all sounds
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if sounds are enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Set the master volume (0.0 to 1.0)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Get the current volume
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     * Toggle sound on/off
     */
    toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
