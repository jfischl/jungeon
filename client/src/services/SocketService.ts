import { io, Socket } from 'socket.io-client';
import { RoomDataPacket, Inventory, Player } from '../../../shared/types';

type MessageCallback = (message: string) => void;
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
type WelcomeCallback = (data: { message: string; availableCharacters: any[] }) => void;
type LoginSuccessCallback = (data: { player: Player; worldName: string }) => void;
type ConnectionCallback = () => void;

/**
 * SocketService - Abstraction over Socket.IO client
 * Provides typed methods for all game socket events
 */
export class SocketService {
    private socket: Socket;
    private serverUrl: string;

    constructor(serverUrl?: string) {
        this.serverUrl = serverUrl || import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
        console.log("Connecting to server at:", this.serverUrl);

        this.socket = io(this.serverUrl, {
            transports: ['websocket', 'polling'],
            reconnectionDelay: 1000,
            reconnection: true,
            reconnectionAttempts: 10,
            timeout: 20000,
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
        this.socket.on('message', callback);
    }

    onError(callback: MessageCallback): void {
        this.socket.on('error', callback);
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
}
