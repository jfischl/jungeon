// Main exports for @jungeon/client-core

// Socket service
export { SocketService } from './SocketService';
export type { SocketServiceConfig } from './SocketService';

// Game state store (Zustand)
export { createGameStore } from './GameStateStore';
export type {
    GameState,
    GameActions,
    GameStore,
    GameStoreInstance,
    PlayerStats,
    RoomState,
    ConnectionState,
    ChatMessage,
} from './GameStateStore';

// Sound manager interface
export type { ISoundManager } from './SoundManagerInterface';
export { SOUND_FILE_MAP } from './SoundManagerInterface';

// Main game client
export { GameClient } from './GameClient';
export type { GameClientConfig } from './GameClient';
