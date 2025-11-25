import { io, Socket } from 'socket.io-client';
import type { RoomDataPacket, Inventory, Player, SoundHint, Character } from '@jungeon/shared';

type MessageCallback = (message: string, soundHint?: SoundHint) => void;
type SoundCallback = (soundHint: SoundHint) => void;
type RoomDataCallback = (data: RoomDataPacket) => void;
type InventoryCallback = (inventory: Inventory) => void;
type StatsCallback = (stats: {
    hp: number;
    maxHp: number;
    level: number;
    experience: number;
    attack: number;
    defense: number;
}) => void;
type WelcomeCallback = (data: { message: string; availableCharacters: Character[] }) => void;
type LoginSuccessCallback = (data: { player: Player; worldName: string }) => void;
type ConnectionCallback = () => void;

export interface SocketServiceConfig {
    serverUrl: string;
    transports?: ('websocket' | 'polling')[];
    reconnectionDelay?: number;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    timeout?: number;
}

/**
 * SocketService - Platform-agnostic Socket.IO client abstraction
 * Provides typed methods for all game socket events
 *
 * This service is designed to work on both web and React Native platforms.
 * The serverUrl must be passed in explicitly (no reliance on import.meta.env).
 */
export class SocketService {
    private socket: Socket;
    private config: SocketServiceConfig;

    constructor(config: SocketServiceConfig) {
        this.config = {
            transports: ['websocket', 'polling'],
            reconnectionDelay: 1000,
            reconnection: true,
            reconnectionAttempts: 10,
            timeout: 20000,
            ...config
        };

        this.socket = io(this.config.serverUrl, {
            transports: this.config.transports,
            reconnectionDelay: this.config.reconnectionDelay,
            reconnection: this.config.reconnection,
            reconnectionAttempts: this.config.reconnectionAttempts,
            timeout: this.config.timeout,
            forceNew: true
        });
    }

    // Connection events
    onConnect(callback: ConnectionCallback): void {
        this.socket.on('connect', callback);
    }

    onDisconnect(callback: ConnectionCallback): void {
        this.socket.on('disconnect', callback);
    }

    // Game events
    onWelcome(callback: WelcomeCallback): void {
        this.socket.on('welcome', callback);
    }

    onLoginSuccess(callback: LoginSuccessCallback): void {
        this.socket.on('loginSuccess', callback);
    }

    onMessage(callback: MessageCallback): void {
        this.socket.on('message', (data: string | { message: string; soundHint?: SoundHint }) => {
            // Handle both legacy string messages and new object format
            if (typeof data === 'string') {
                callback(data);
            } else {
                callback(data.message, data.soundHint);
            }
        });
    }

    onError(callback: MessageCallback): void {
        this.socket.on('error', (data: string | { message: string; soundHint?: SoundHint }) => {
            if (typeof data === 'string') {
                callback(data, 'error');
            } else {
                callback(data.message, data.soundHint || 'error');
            }
        });
    }

    onSound(callback: SoundCallback): void {
        this.socket.on('sound', callback);
    }

    onRoomData(callback: RoomDataCallback): void {
        this.socket.on('roomData', callback);
    }

    onUpdateInventory(callback: InventoryCallback): void {
        this.socket.on('updateInventory', callback);
    }

    onUpdateStats(callback: StatsCallback): void {
        this.socket.on('updateStats', callback);
    }

    // Outgoing commands
    sendLogin(characterId: string): void {
        this.socket.emit('login', characterId);
    }

    sendCommand(command: string): void {
        this.socket.emit('command', command);
    }

    // Utility
    disconnect(): void {
        this.socket.disconnect();
    }

    isConnected(): boolean {
        return this.socket.connected;
    }

    getSocketId(): string | undefined {
        return this.socket.id;
    }
}
