import { Server } from 'socket.io';
import { Player, Room } from '../../shared/types';
import { RoomManager } from '../managers/RoomManager';
import { PlayerManager } from '../managers/PlayerManager';

/**
 * WorldService - Manages world-related operations
 *
 * Responsibilities:
 * - Generate minimap for players
 * - Broadcast messages to rooms
 * - Provide room-related utilities (random room, nearby room)
 */
export class WorldService {
    constructor(
        private io: Server,
        private roomManager: RoomManager,
        private playerManager: PlayerManager
    ) {}

    /**
     * Generate a minimap for the player showing explored rooms
     */
    getMinimap(player: Player): string {
        const range = 7;
        const pRoom = this.roomManager.getRoom(player.roomId)!;
        const px = pRoom.x;
        const py = pRoom.y;

        let mapStr = "";

        for (let y = py - range; y <= py + range; y++) {
            let line1 = "";
            let line2 = "";

            for (let x = px - range; x <= px + range; x++) {
                const room = Object.values(this.roomManager.getAllRooms()).find(r => r.x === x && r.y === y);

                // Check if current room has exits to this cell (for showing unexplored exits)
                const roomAboveIsPlayer = (y === py - 1) && (x === px);
                const roomBelowIsPlayer = (y === py + 1) && (x === px);
                const roomToLeftIsPlayer = (y === py) && (x === px - 1);
                const roomToRightIsPlayer = (y === py) && (x === px + 1);
                const showNorthExitFromPlayer = roomAboveIsPlayer && pRoom.exits['north'];
                const showSouthExitFromPlayer = roomBelowIsPlayer && pRoom.exits['south'];
                const showWestExitFromPlayer = roomToLeftIsPlayer && pRoom.exits['west'];
                const showEastExitFromPlayer = roomToRightIsPlayer && pRoom.exits['east'];

                // Only show room if player has explored it OR it's adjacent to player with an exit
                if (room && player.exploredRooms.has(room.id)) {
                    let symbol = "   ";
                    if (room.id === player.roomId) {
                        symbol = " * ";
                    } else {
                        const others = this.playerManager.getAllPlayers().filter(p => p.roomId === room.id && p.id !== player.id);
                        if (others.length > 0) {
                            symbol = " P ";
                        } else {
                            symbol = "[ ]";
                        }
                    }

                    // Determine which exits to show
                    let showEastExit = false;
                    let showSouthExit = false;

                    if (room.id === player.roomId) {
                        // Current room: show ALL exits (even to unexplored rooms)
                        showEastExit = !!room.exits['east'];
                        showSouthExit = !!room.exits['south'];
                    } else {
                        // Other explored room: only show exits to explored rooms
                        if (room.exits['east']) {
                            const eastRoom = this.roomManager.getRoom(room.exits['east']);
                            showEastExit = !!eastRoom && player.exploredRooms.has(eastRoom.id);
                        }
                        if (room.exits['south']) {
                            const southRoom = this.roomManager.getRoom(room.exits['south']);
                            showSouthExit = !!southRoom && player.exploredRooms.has(southRoom.id);
                        }
                    }

                    // Override with exits from player room to unexplored areas
                    if (showEastExitFromPlayer) showEastExit = true;
                    if (showSouthExitFromPlayer) showSouthExit = true;
                    if (showWestExitFromPlayer) showEastExit = true;  // West exits show as east connection from left cell
                    if (showNorthExitFromPlayer) showSouthExit = true;  // North exits show as south connection from above cell

                    const east = showEastExit ? "-" : " ";
                    line1 += symbol + east;

                    const south = showSouthExit ? " | " : "   ";
                    line2 += south + " ";
                } else {
                    // Unexplored or no room - but check if we should show exits from player room
                    let symbol = "   ";
                    let showEastExit = showWestExitFromPlayer || showEastExitFromPlayer;
                    let showSouthExit = showNorthExitFromPlayer || showSouthExitFromPlayer;

                    const east = showEastExit ? "-" : " ";
                    line1 += symbol + east;

                    const south = showSouthExit ? " | " : "   ";
                    line2 += south + " ";
                }
            }
            mapStr += line1 + "\n" + line2 + "\n";
        }

        return mapStr;
    }

    /**
     * Broadcast a message to all players in a room
     */
    broadcastToRoom(roomId: string, message: string, excludeSocketId?: string): void {
        for (const player of this.playerManager.getAllPlayers()) {
            if (player.roomId === roomId && player.id !== excludeSocketId) {
                this.io.to(player.id).emit('message', message);
            }
        }
    }

    /**
     * Get a random room ID from the world
     */
    getRandomRoomId(): string {
        return this.roomManager.getRandomRoomId();
    }

    /**
     * Get a room ID near the starting room (for ghost spawning)
     */
    getNearbyRoomId(startingRoomId: string): string {
        const startRoom = this.roomManager.getRoom(startingRoomId);
        if (!startRoom) return this.getRandomRoomId();

        // Get all exits from starting room
        const exits = Object.values(startRoom.exits);
        if (exits.length === 0) return this.getRandomRoomId();

        // Pick a random adjacent room
        const randomExit = exits[Math.floor(Math.random() * exits.length)];
        return randomExit;
    }
}
