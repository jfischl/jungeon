import { Socket } from 'socket.io';
import { Player, Character, Inventory } from '../../shared/types';

/**
 * PlayerManager - Manages all player-related operations
 * Handles player CRUD, state management, and queries
 */
export class PlayerManager {
    private players: Map<string, Player>;

    constructor() {
        this.players = new Map();
    }

    /**
     * Add a new player to the game
     */
    addPlayer(socketId: string, player: Player): void {
        this.players.set(socketId, player);
    }

    /**
     * Remove a player from the game
     */
    removePlayer(socketId: string): void {
        this.players.delete(socketId);
    }

    /**
     * Get a player by socket ID
     */
    getPlayer(socketId: string): Player | undefined {
        return this.players.get(socketId);
    }

    /**
     * Get all players
     */
    getAllPlayers(): Player[] {
        return Array.from(this.players.values());
    }

    /**
     * Get all players in a specific room
     */
    getPlayersInRoom(roomId: string): Player[] {
        return Array.from(this.players.values()).filter(p => p.roomId === roomId);
    }

    /**
     * Get player names in a room (excluding specific player)
     */
    getPlayerNamesInRoom(roomId: string, excludeId?: string): string[] {
        return Array.from(this.players.values())
            .filter(p => p.roomId === roomId && p.id !== excludeId)
            .map(p => p.character.name);
    }

    /**
     * Find player by character ID
     */
    findByCharacterId(characterId: string): Player | undefined {
        return Array.from(this.players.values()).find(p => p.character.id === characterId);
    }

    /**
     * Check if a character is already in use
     */
    isCharacterTaken(characterId: string): boolean {
        return Array.from(this.players.values()).some(p => p.character.id === characterId);
    }

    /**
     * Get socket ID for a player
     */
    getSocketId(playerId: string): string | undefined {
        return Array.from(this.players.entries())
            .find(([_, p]) => p.id === playerId)?.[0];
    }

    /**
     * Create a new player instance
     */
    createPlayer(
        socketId: string,
        character: Character,
        roomId: string,
        inventory?: Inventory,
        exploredRooms?: Set<string>
    ): Player {
        return {
            id: socketId,
            character,
            roomId,
            inventory: inventory || { coins: 0, items: [] },
            exploredRooms: exploredRooms || new Set([roomId]),
            hp: character.baseHp,
            maxHp: character.baseHp,
            attack: character.baseAttack,
            defense: character.baseDefense,
            level: 1,
            experience: 0,
            inCombat: false,
            combatTarget: null,
            isDefending: false
        };
    }

    /**
     * Get all players as array for persistence
     */
    toArray(): Player[] {
        return Array.from(this.players.values());
    }

    /**
     * Get player count
     */
    count(): number {
        return this.players.size;
    }

    /**
     * Check if player exists
     */
    hasPlayer(socketId: string): boolean {
        return this.players.has(socketId);
    }
}
