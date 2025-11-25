import type { SoundHint } from '@jungeon/shared';

/**
 * Platform-agnostic interface for sound playback
 *
 * Web clients implement this using Web Audio API
 * Mobile clients implement this using expo-av or similar
 */
export interface ISoundManager {
    /**
     * Initialize the sound system
     * Should be called after user interaction (for browser autoplay policies)
     */
    initialize(): Promise<void>;

    /**
     * Play a sound by its hint identifier
     */
    play(hint: SoundHint): void;

    /**
     * Play a sound hint if provided
     */
    playHint(hint?: SoundHint): void;

    /**
     * Toggle sound on/off
     * @returns The new enabled state
     */
    toggle(): boolean;

    /**
     * Set master volume
     * @param volume 0.0 to 1.0
     */
    setVolume(volume: number): void;

    /**
     * Get current enabled state
     */
    isEnabled(): boolean;

    /**
     * Get current volume level
     */
    getVolume(): number;
}

/**
 * Map of sound hints to their associated audio file names
 */
export const SOUND_FILE_MAP: Record<SoundHint, string> = {
    // Combat
    'attack': 'attack.mp3',
    'attack-critical': 'attack-critical.mp3',
    'damage-taken': 'damage-taken.mp3',
    'defend': 'defend.mp3',
    'flee': 'flee.mp3',
    'flee-fail': 'flee-fail.mp3',
    'heal': 'heal.mp3',
    'victory': 'victory.mp3',
    'death': 'death.mp3',
    'level-up': 'level-up.mp3',

    // Movement & Environment
    'enter-room': 'enter-room.mp3',
    'door-locked': 'door-locked.mp3',
    'unlock': 'unlock.mp3',

    // Items
    'pickup-item': 'pickup-item.mp3',
    'pickup-coins': 'pickup-coins.mp3',
    'drop': 'drop.mp3',

    // Social
    'chat': 'chat.mp3',
    'challenge-received': 'challenge-received.mp3',
    'challenge-sent': 'challenge-sent.mp3',
    'duel-start': 'duel-start.mp3',

    // Monsters
    'ghost-enters': 'ghost-enters.mp3',
    'ghost-nearby': 'ghost-nearby.mp3',

    // Errors
    'error': 'error.mp3',
};
