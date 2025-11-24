import { Room, WorldData } from '../../shared/types';

/**
 * RoomManager - Manages all room-related operations
 * Handles room lookups, exits, and world data
 */
export class RoomManager {
    private rooms: Record<string, Room>;
    private worldData: WorldData;

    constructor() {
        this.rooms = {};
        this.worldData = { starting_room: '', rooms: {} };
    }

    /**
     * Load world data
     */
    loadWorldData(worldData: WorldData): void {
        this.worldData = worldData;
        this.rooms = worldData.rooms;
    }

    /**
     * Get a room by ID
     */
    getRoom(roomId: string): Room | undefined {
        return this.rooms[roomId];
    }

    /**
     * Get all rooms
     */
    getAllRooms(): Record<string, Room> {
        return this.rooms;
    }

    /**
     * Get starting room ID
     */
    getStartingRoomId(): string {
        return this.worldData.starting_room;
    }

    /**
     * Get a random room ID
     */
    getRandomRoomId(): string {
        const roomIds = Object.keys(this.rooms);
        return roomIds[Math.floor(Math.random() * roomIds.length)];
    }

    /**
     * Check if an exit exists in a direction
     */
    hasExit(roomId: string, direction: string): boolean {
        const room = this.rooms[roomId];
        return room && !!room.exits[direction];
    }

    /**
     * Get the room ID in a given direction
     */
    getExitRoomId(roomId: string, direction: string): string | undefined {
        const room = this.rooms[roomId];
        return room?.exits[direction];
    }

    /**
     * Check if a door is locked
     */
    isLocked(roomId: string, direction: string): boolean {
        const room = this.rooms[roomId];
        return room?.locks?.[direction] !== undefined;
    }

    /**
     * Get the key ID required for a locked door
     */
    getRequiredKeyId(roomId: string, direction: string): string | undefined {
        const room = this.rooms[roomId];
        return room?.locks?.[direction];
    }

    /**
     * Unlock a door
     */
    unlockDoor(roomId: string, direction: string): void {
        const room = this.rooms[roomId];
        if (room?.locks) {
            delete room.locks[direction];
        }
    }

    /**
     * Get available exits for a room
     */
    getExits(roomId: string): string[] {
        const room = this.rooms[roomId];
        return room ? Object.keys(room.exits) : [];
    }

    /**
     * Get world data for saving
     */
    getWorldData(): WorldData {
        return {
            starting_room: this.worldData.starting_room,
            rooms: this.rooms
        };
    }

    /**
     * Check if room exists
     */
    hasRoom(roomId: string): boolean {
        return !!this.rooms[roomId];
    }
}
