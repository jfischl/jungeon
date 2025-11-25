import { SocketService, SocketServiceConfig } from './SocketService';
import { createGameStore, GameStoreInstance, RoomState } from './GameStateStore';
import type { ISoundManager } from './SoundManagerInterface';
import { validateCommandInput, sanitizeInput } from '@jungeon/shared';

export interface GameClientConfig {
    socketConfig: SocketServiceConfig;
    soundManager?: ISoundManager;
}

/**
 * GameClient - Platform-agnostic game client orchestrator
 *
 * Connects SocketService to GameStateStore and handles game logic.
 * UI components (platform-specific) subscribe to the store for updates.
 */
export class GameClient {
    private socket: SocketService;
    private store: GameStoreInstance;
    private soundManager?: ISoundManager;
    private previousHp: number = 0;

    constructor(config: GameClientConfig) {
        this.socket = new SocketService(config.socketConfig);
        this.store = createGameStore();
        this.soundManager = config.soundManager;

        this.setupSocketHandlers();
    }

    /**
     * Get the Zustand store for UI subscriptions
     */
    getStore(): GameStoreInstance {
        return this.store;
    }

    /**
     * Get the socket service for direct access if needed
     */
    getSocket(): SocketService {
        return this.socket;
    }

    /**
     * Set sound manager (can be set after construction)
     */
    setSoundManager(manager: ISoundManager): void {
        this.soundManager = manager;
    }

    private setupSocketHandlers(): void {
        const state = this.store.getState();

        // Connection events
        this.socket.onConnect(() => {
            state.setConnectionState('connected');
            state.addMessage('Connected to server.', 'success');
        });

        this.socket.onDisconnect(() => {
            state.setConnectionState('disconnected');
            state.addMessage('Disconnected from server.', 'error');
        });

        // Game events
        this.socket.onWelcome((data) => {
            state.addMessage(data.message, 'info');
            state.setAvailableCharacters(data.availableCharacters);
        });

        this.socket.onLoginSuccess((data) => {
            // Initialize sound on first user interaction (login)
            this.soundManager?.initialize();
            state.addMessage(
                `Logged in as ${data.player.character.name}. Welcome to ${data.worldName}!`,
                'success'
            );
            state.setLoggedIn(data.player, data.worldName);
            this.previousHp = data.player.hp;
        });

        this.socket.onMessage((msg, soundHint) => {
            state.addMessage(msg, 'info');
            if (soundHint) {
                state.setSoundHint(soundHint);
                this.soundManager?.playHint(soundHint);
            }
        });

        this.socket.onError((msg, soundHint) => {
            state.addMessage(`Error: ${msg}`, 'error');
            if (soundHint) {
                state.setSoundHint(soundHint);
                this.soundManager?.playHint(soundHint);
            }
        });

        this.socket.onRoomData((data) => {
            const room: RoomState = {
                name: data.name,
                description: data.desc,
                exits: data.exits,
                coins: data.coins,
                players: data.players,
                items: data.items,
                ghosts: data.ghosts,
                minimap: data.minimap,
            };
            state.updateRoom(room);

            // Add room info to chat
            state.addMessage(`\n=== ${data.name} ===`, 'room-title');
            state.addMessage(data.desc, 'room-desc');

            if (data.exits.length > 0) {
                state.addMessage(`Exits: ${data.exits.join(', ')}`, 'info');
            } else {
                state.addMessage('No visible exits.', 'info');
            }

            if (data.items && data.items.length > 0) {
                const itemNames = data.items.map(i => i.name).join(', ');
                state.addMessage(`You see: ${itemNames}`, 'info');
            }

            if (data.coins > 0) {
                state.addMessage(`You see ${data.coins} coins.`, 'info');
            }

            if (data.players && data.players.length > 0) {
                state.addMessage(`Also here: ${data.players.join(', ')}`, 'info');
            }

            if (data.ghosts && data.ghosts.length > 0) {
                for (const ghost of data.ghosts) {
                    state.addMessage(ghost, 'warning');
                }
            }

            if (data.soundHint) {
                state.setSoundHint(data.soundHint);
                this.soundManager?.playHint(data.soundHint);
            }
        });

        this.socket.onUpdateInventory((inventory) => {
            state.updateInventory(inventory);
        });

        this.socket.onUpdateStats((stats) => {
            this.previousHp = stats.hp;
            state.updateStats(stats);
        });

        // Standalone sound events
        this.socket.onSound((soundHint) => {
            state.setSoundHint(soundHint);
            this.soundManager?.play(soundHint);
        });
    }

    /**
     * Send login request
     */
    login(characterId: string): void {
        this.socket.sendLogin(characterId);
    }

    /**
     * Send a command to the server
     * Returns validation result for UI feedback
     */
    sendCommand(cmd: string): { success: boolean; error?: string } {
        if (!cmd) return { success: false, error: 'Command cannot be empty' };

        const sanitized = sanitizeInput(cmd);

        // Client-side validation for immediate feedback
        const validation = validateCommandInput(sanitized);
        if (!validation.valid) {
            this.store.getState().addMessage(`Error: ${validation.error}`, 'error');
            return { success: false, error: validation.error };
        }

        // Send to server
        this.socket.sendCommand(sanitized);
        this.store.getState().addMessage(`> ${sanitized}`, 'command');
        return { success: true };
    }

    /**
     * Check if client is connected
     */
    isConnected(): boolean {
        return this.socket.isConnected();
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        this.socket.disconnect();
        this.store.getState().reset();
    }
}
