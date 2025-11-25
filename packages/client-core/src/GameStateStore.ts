import { createStore } from 'zustand/vanilla';
import type { Player, Inventory, Item, Character, SoundHint } from '@jungeon/shared';

/**
 * Player stats subset that updates frequently
 */
export interface PlayerStats {
    hp: number;
    maxHp: number;
    level: number;
    experience: number;
    attack: number;
    defense: number;
}

/**
 * Room state as received from server
 */
export interface RoomState {
    name: string;
    description: string;
    exits: string[];
    coins: number;
    players: string[];
    items: Item[];
    ghosts: string[];
    minimap: string;
}

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

/**
 * Chat message entry
 */
export interface ChatMessage {
    id: string;
    text: string;
    type: 'info' | 'error' | 'success' | 'warning' | 'command' | 'room-title' | 'room-desc';
    timestamp: number;
}

/**
 * Game state store interface
 */
export interface GameState {
    // Connection
    connectionState: ConnectionState;

    // Authentication
    isLoggedIn: boolean;
    availableCharacters: Character[];

    // Player
    player: Player | null;
    playerStats: PlayerStats | null;
    inventory: Inventory | null;

    // Room
    currentRoom: RoomState | null;

    // Chat
    messages: ChatMessage[];

    // Sound
    lastSoundHint: SoundHint | null;
}

/**
 * Game state actions
 */
export interface GameActions {
    // Connection
    setConnectionState: (state: ConnectionState) => void;

    // Authentication
    setAvailableCharacters: (characters: Character[]) => void;
    setLoggedIn: (player: Player, worldName: string) => void;
    logout: () => void;

    // Player updates
    updateStats: (stats: PlayerStats) => void;
    updateInventory: (inventory: Inventory) => void;

    // Room updates
    updateRoom: (room: RoomState) => void;

    // Chat
    addMessage: (text: string, type: ChatMessage['type']) => void;
    clearMessages: () => void;

    // Sound
    setSoundHint: (hint: SoundHint | null) => void;

    // Reset
    reset: () => void;
}

export type GameStore = GameState & GameActions;

const initialState: GameState = {
    connectionState: 'disconnected',
    isLoggedIn: false,
    availableCharacters: [],
    player: null,
    playerStats: null,
    inventory: null,
    currentRoom: null,
    messages: [],
    lastSoundHint: null,
};

let messageIdCounter = 0;

/**
 * Create a vanilla Zustand store for game state
 * This works in both React and React Native contexts
 */
export function createGameStore() {
    return createStore<GameStore>((set, get) => ({
        ...initialState,

        setConnectionState: (connectionState) => set({ connectionState }),

        setAvailableCharacters: (characters) => set({
            availableCharacters: characters
        }),

        setLoggedIn: (player, _worldName) => set({
            isLoggedIn: true,
            player,
            playerStats: {
                hp: player.hp,
                maxHp: player.maxHp,
                level: player.level,
                experience: player.experience,
                attack: player.attack,
                defense: player.defense,
            },
            inventory: player.inventory,
        }),

        logout: () => set({
            isLoggedIn: false,
            player: null,
            playerStats: null,
            inventory: null,
            currentRoom: null,
        }),

        updateStats: (stats) => set({ playerStats: stats }),

        updateInventory: (inventory) => set({ inventory }),

        updateRoom: (room) => set({ currentRoom: room }),

        addMessage: (text, type) => {
            const message: ChatMessage = {
                id: `msg-${++messageIdCounter}`,
                text,
                type,
                timestamp: Date.now(),
            };
            set((state) => ({
                messages: [...state.messages, message].slice(-500), // Keep last 500 messages
            }));
        },

        clearMessages: () => set({ messages: [] }),

        setSoundHint: (hint) => set({ lastSoundHint: hint }),

        reset: () => set(initialState),
    }));
}

export type GameStoreInstance = ReturnType<typeof createGameStore>;
