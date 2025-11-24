import { Socket } from 'socket.io';
import { PlayerManager } from './PlayerManager';
import { RoomManager } from './RoomManager';
import { WorldRepository } from '../data/WorldRepository';
import { Character, Player, Inventory, WorldData } from '../../shared/types';
import { sanitizeInput } from '../../shared/validators';
import { playerLogger } from '../logger';

/**
 * ConnectionManager handles player connection lifecycle
 * Responsibilities: connect, login, disconnect
 */
export class ConnectionManager {
    constructor(
        private playerManager: PlayerManager,
        private roomManager: RoomManager,
        private repository: WorldRepository,
        private getCharacters: () => Character[],
        private getWorldData: () => WorldData,
        private broadcastToRoom: (roomId: string, message: string, excludeId?: string) => void,
        private look: (socket: Socket) => void,
        private sendStats: (socket: Socket) => void,
        private saveGame: () => void,
        private handleCommand: (socket: Socket, cmd: string) => void
    ) {}

    /**
     * Handle new socket connection
     */
    handleConnect(socket: Socket): void {
        playerLogger.info({ socketId: socket.id }, 'Player connected');

        socket.on('disconnect', () => {
            if (this.playerManager.hasPlayer(socket.id)) {
                const player = this.playerManager.getPlayer(socket.id)!;
                playerLogger.info(
                    { socketId: socket.id, character: player.character.name },
                    'Player disconnected'
                );
                this.broadcastToRoom(player.roomId, `${player.character.name} has disconnected.`, socket.id);
                this.playerManager.removePlayer(socket.id);
                this.saveGame();
            }
        });

        socket.on('login', (charId: string) => {
            this.handleLogin(socket, charId);
        });

        socket.on('command', (cmd: string) => {
            this.handleCommand(socket, cmd);
        });

        socket.emit('welcome', {
            message: "Welcome to The Jungeon!",
            availableCharacters: this.getAvailableCharacters()
        });
    }

    /**
     * Handle player login with character selection
     */
    handleLogin(socket: Socket, charId: string): void {
        if (this.playerManager.hasPlayer(socket.id)) return;

        // Sanitize character ID
        const sanitizedCharId = sanitizeInput(charId, 50);

        const char = this.getCharacters().find(c => c.id === sanitizedCharId);
        if (!char) {
            playerLogger.warn(
                { socketId: socket.id, attemptedCharId: sanitizedCharId },
                'Login failed: invalid character'
            );
            socket.emit('error', "Invalid character.");
            return;
        }

        const isTaken = this.playerManager.getAllPlayers().some(p => p.character.id === sanitizedCharId);
        if (isTaken) {
            playerLogger.debug(
                { socketId: socket.id, character: char.name },
                'Login failed: character already in use'
            );
            socket.emit('error', "Character already taken.");
            socket.emit('updateCharacterList', this.getAvailableCharacters());
            return;
        }

        // Restore state
        let roomId = this.getWorldData().starting_room;
        let inventory: Inventory = { coins: 0, items: [] };
        let exploredRooms = new Set<string>();

        const savedPlayers = this.repository.loadPlayers() as Record<string, { roomId: string; inventory: Inventory; exploredRooms?: string[] }> | null;
        if (savedPlayers && savedPlayers[charId]) {
            if (this.roomManager.getRoom(savedPlayers[charId].roomId)) {
                roomId = savedPlayers[charId].roomId;
            }
            inventory = savedPlayers[charId].inventory;
            // Load explored rooms from saved data
            if (savedPlayers[charId].exploredRooms) {
                exploredRooms = new Set(savedPlayers[charId].exploredRooms);
            }
        }

        const player: Player = {
            id: socket.id,
            character: char,
            roomId: roomId,
            inventory: inventory,
            exploredRooms: exploredRooms,
            // Combat stats from character
            hp: char.baseHp,
            maxHp: char.baseHp,
            attack: char.baseAttack,
            defense: char.baseDefense,
            level: 1,
            experience: 0,
            inCombat: false,
            combatTarget: null,
            isDefending: false
        };

        this.playerManager.addPlayer(socket.id, player);

        playerLogger.info(
            {
                socketId: socket.id,
                character: player.character.name,
                startingRoom: player.roomId,
                returning: savedPlayers && savedPlayers[charId] ? true : false
            },
            'Player logged in'
        );

        socket.emit('loginSuccess', { player, worldName: "The Jungeon" });

        this.broadcastToRoom(player.roomId, `${player.character.name} has entered the game.`, socket.id);
        this.look(socket);
        this.sendStats(socket);

        // Show welcome message with saved state for returning players
        const isReturning = savedPlayers && savedPlayers[charId];
        if (isReturning) {
            const itemCount = inventory.items.length;
            const itemText = itemCount === 1 ? '1 item' : `${itemCount} items`;
            socket.emit('message', `Welcome back! Your progress has been restored: ${inventory.coins} coins, ${itemText}.`);
        } else {
            socket.emit('message', 'Welcome to The Jungeon! Type "look" to see your surroundings.');
        }
    }

    /**
     * Get list of available (not taken) characters
     */
    private getAvailableCharacters(): Character[] {
        const takenCharIds = this.playerManager.getAllPlayers().map(p => p.character.id);
        return this.getCharacters().filter(c => !takenCharIds.includes(c.id));
    }
}
