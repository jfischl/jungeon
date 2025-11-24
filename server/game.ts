import { Server, Socket } from 'socket.io';
import { Player, Room, Character, WorldData, RoomDataPacket, Inventory } from '../shared/types';
import { WorldRepository } from './data/WorldRepository';
import { CombatManager } from './CombatManager';
import { CONFIG } from './config';
import { sanitizeInput, isValidMessage } from '../shared/validators';
import { PlayerManager } from './managers/PlayerManager';
import { RoomManager } from './managers/RoomManager';
import { GhostManager, Ghost } from './managers/GhostManager';
import { ConnectionManager } from './managers/ConnectionManager';
import { CommandRegistry } from './commands/CommandRegistry';
import { WorldService } from './services/WorldService';
import { gameLogger, playerLogger } from './logger';

export class GameManager {
    io: Server;
    worldData: WorldData;

    // Entity managers
    playerManager: PlayerManager;
    roomManager: RoomManager;
    ghostManager: GhostManager;
    connectionManager: ConnectionManager;
    commandRegistry: CommandRegistry;
    worldService: WorldService;

    characters: Character[];
    combatManager: CombatManager;
    pendingChallenges: Map<string, { challengerId: string; targetId: string; timestamp: number }>;

    private repository: WorldRepository;
    private roomOperationQueues: Map<string, Promise<any>>;

    constructor(io: Server) {
        this.io = io;

        // Initialize managers
        this.playerManager = new PlayerManager();
        this.roomManager = new RoomManager();
        this.worldService = new WorldService(io, this.roomManager, this.playerManager);
        this.ghostManager = new GhostManager(
            () => this.worldService.getRandomRoomId(),
            (startingRoomId) => this.worldService.getNearbyRoomId(startingRoomId)
        );

        this.worldData = { starting_room: '', rooms: {} };
        this.characters = [];

        this.repository = new WorldRepository();
        this.commandRegistry = new CommandRegistry();
        this.combatManager = new CombatManager(this);
        this.pendingChallenges = new Map();
        this.roomOperationQueues = new Map();

        this.loadGame();

        // Initialize ConnectionManager with all dependencies
        this.connectionManager = new ConnectionManager(
            this.playerManager,
            this.roomManager,
            this.repository,
            () => this.characters,
            () => this.worldData,
            (roomId, message, excludeId) => this.worldService.broadcastToRoom(roomId, message, excludeId),
            (socket) => this.look(socket),
            (socket) => this.sendStats(socket),
            () => this.saveGame(),
            (socket, cmd) => this.handleCommand(socket, cmd)
        );

        this.startGhostLoop();
    }


    loadGame(): void {
        gameLogger.info('Loading game data...');
        const loadedWorld = this.repository.loadWorld();
        if (loadedWorld) {
            this.worldData = loadedWorld;
            this.roomManager.loadWorldData(loadedWorld);
            gameLogger.info({ roomCount: Object.keys(loadedWorld.rooms).length }, 'World loaded');
        } else {
            gameLogger.error('No world.json found! Run with --generate first');
        }

        this.characters = this.repository.loadCharacters();
        gameLogger.info({ characterCount: this.characters.length }, 'Characters loaded');
    }

    saveGame(): void {
        const playerCount = this.playerManager.getAllPlayers().length;
        gameLogger.debug({ playerCount }, 'Saving game...');

        // Save World
        const world = this.roomManager.getWorldData();
        this.repository.saveWorld(world);

        // Save Players
        const playersToSave: Record<string, { roomId: string; inventory: Inventory; exploredRooms: string[] }> = {};
        const allPlayers = this.playerManager.getAllPlayers();
        for (const p of allPlayers) {
            if (p.character) {
                playersToSave[p.character.id] = {
                    roomId: p.roomId,
                    inventory: p.inventory,
                    exploredRooms: Array.from(p.exploredRooms)
                };
            }
        }
        this.repository.savePlayers(playersToSave);
        gameLogger.debug({ playerCount }, 'Game saved successfully');
    }

    handleCommand(socket: Socket, commandString: string): void {
        if (!this.playerManager.hasPlayer(socket.id)) return;
        this.commandRegistry.execute(socket, commandString, this);
    }

    move(socket: Socket, direction: string): void {
        const player = this.playerManager.getPlayer(socket.id)!;
        const currentRoom = this.roomManager.getRoom(player.roomId)!;

        if (!currentRoom.exits[direction]) {
            socket.emit('message', "You can't go that way.");
            return;
        }

        if (currentRoom.locks && currentRoom.locks[direction]) {
            const keyId = currentRoom.locks[direction];
            const hasKey = player.inventory.items.some(i => i.id === keyId);
            if (!hasKey) {
                socket.emit('message', `The ${direction} door is locked. You need a key.`);
                return;
            } else {
                const key = player.inventory.items.find(i => i.id === keyId);
                socket.emit('message', `The ${direction} door is locked. Try 'unlock ${direction}' to use your ${key?.name}.`);
                return;
            }
        }

        const nextRoomId = currentRoom.exits[direction];
        const oldRoomId = player.roomId;
        this.worldService.broadcastToRoom(oldRoomId, `${player.character.name} leaves ${direction}.`, socket.id);

        player.roomId = nextRoomId;
        this.worldService.broadcastToRoom(nextRoomId, `${player.character.name} arrives from the ${this.getOppositeDirection(direction)}.`, socket.id);
        this.look(socket);
        this.saveGame();
    }

    getOppositeDirection(dir: string): string {
        if (dir === 'north') return 'south';
        if (dir === 'south') return 'north';
        if (dir === 'east') return 'west';
        if (dir === 'west') return 'east';
        return '';
    }

    look(socket: Socket): void {
        const player = this.playerManager.getPlayer(socket.id)!;
        const room = this.roomManager.getRoom(player.roomId)!;

        // Track exploration
        player.exploredRooms.add(player.roomId);

        const otherPlayers = this.playerManager.getAllPlayers()
            .filter(p => p.roomId === player.roomId && p.id !== socket.id)
            .map(p => p.character.name);

        const ghostsHere = this.ghostManager.getAllGhosts().filter(g => g.roomId === player.roomId);
        const ghostDescs = ghostsHere.map(g => `${g.name} is here. ${g.desc}`);

        const description: RoomDataPacket = {
            name: room.name,
            desc: room.description,
            exits: Object.keys(room.exits),
            coins: room.coins,
            players: otherPlayers,
            items: room.items, // Use room.items
            ghosts: ghostDescs,
            minimap: this.worldService.getMinimap(player)
        };

        socket.emit('roomData', description);
        this.sendStats(socket);
    }


    /**
     * Execute a room operation with queueing to prevent race conditions
     * This ensures that operations on the same room are processed sequentially
     */
    private async executeRoomOperation<T>(
        roomId: string,
        operation: () => T
    ): Promise<T> {
        // Get the existing queue for this room, or create a resolved promise
        const existing = this.roomOperationQueues.get(roomId) || Promise.resolve();

        // Chain the new operation after the existing queue
        const newOperation = existing
            .then(() => operation())
            .catch((error) => {
                gameLogger.error({ roomId, error }, 'Room operation failed');
                throw error;
            })
            .finally(() => {
                // Clean up resolved promises to prevent memory leaks
                // Only delete if no newer operation has replaced us
                if (this.roomOperationQueues.get(roomId) === newOperation) {
                    this.roomOperationQueues.delete(roomId);
                }
            });

        // Update the queue BEFORE returning
        this.roomOperationQueues.set(roomId, newOperation);

        return newOperation;
    }

    pickUpItem(socket: Socket, itemName: string): Promise<void> {
        const player = this.playerManager.getPlayer(socket.id)!;
        const roomId = player.roomId;

        // Use executeRoomOperation to prevent race conditions
        return this.executeRoomOperation(roomId, () => {
            const room = this.roomManager.getRoom(roomId)!;
            const itemIndex = room.items.findIndex(i => i.name.toLowerCase().includes(itemName.toLowerCase()));

            if (itemIndex !== -1) {
                const item = room.items.splice(itemIndex, 1)[0];
                player.inventory.items.push(item);
                socket.emit('message', `You picked up ${item.name}.`);
                socket.emit('updateInventory', player.inventory);
                this.worldService.broadcastToRoom(roomId, `${player.character.name} picks up ${item.name}.`, socket.id);
                this.look(socket);
            } else {
                socket.emit('message', "You don't see that here.");
            }
        }).catch((error) => {
            gameLogger.error({ playerId: player.id, error }, 'Failed to pick up item');
            socket.emit('error', 'Failed to pick up item.');
        });
    }

    collect(socket: Socket): Promise<void> {
        const player = this.playerManager.getPlayer(socket.id)!;
        const roomId = player.roomId;

        // Use executeRoomOperation to prevent race conditions
        return this.executeRoomOperation(roomId, () => {
            const room = this.roomManager.getRoom(roomId)!;

            if (room.coins > 0) {
                const amount = room.coins;
                room.coins = 0; // Clear room coins atomically after reading
                player.inventory.coins += amount;
                socket.emit('message', `You collected ${amount} coins.`);
                socket.emit('updateInventory', player.inventory);
                this.worldService.broadcastToRoom(roomId, `${player.character.name} collects some coins.`, socket.id);
                this.look(socket);
            } else {
                socket.emit('message', "There are no coins here.");
            }
        }).catch((error) => {
            gameLogger.error({ playerId: player.id, error }, 'Failed to collect coins');
            socket.emit('error', 'Failed to collect coins.');
        });
    }

    drop(socket: Socket): Promise<void> {
        const player = this.playerManager.getPlayer(socket.id)!;
        const roomId = player.roomId;

        // Use executeRoomOperation to prevent race conditions
        return this.executeRoomOperation(roomId, () => {
            const room = this.roomManager.getRoom(roomId)!;

            if (player.inventory.coins > 0) {
                const amount = player.inventory.coins;
                player.inventory.coins = 0;
                room.coins += amount;
                socket.emit('message', `You dropped ${amount} coins.`);
                socket.emit('updateInventory', player.inventory);
                this.worldService.broadcastToRoom(roomId, `${player.character.name} drops some coins.`, socket.id);
                this.look(socket);
            } else {
                socket.emit('message', "You have no coins to drop.");
            }
        }).catch((error) => {
            gameLogger.error({ playerId: player.id, error }, 'Failed to drop coins');
            socket.emit('error', 'Failed to drop coins.');
        });
    }

    inventory(socket: Socket): void {
        const player = this.playerManager.getPlayer(socket.id)!;
        socket.emit('message', `Inventory: ${player.inventory.coins} coins.`);
        if (player.inventory.items.length > 0) {
            const names = player.inventory.items.map(i => i.name).join(', ');
            socket.emit('message', `Items: ${names}`);
        } else {
            socket.emit('message', "You have no items.");
        }
    }

    say(socket: Socket, message: string): void {
        const player = this.playerManager.getPlayer(socket.id)!;

        // Validate message
        if (!isValidMessage(message)) {
            socket.emit('error', 'Invalid message (empty, too long, or contains prohibited content)');
            return;
        }

        const sanitized = sanitizeInput(message);
        this.worldService.broadcastToRoom(player.roomId, `${player.character.name} says: "${sanitized}"`, socket.id);
        socket.emit('message', `You say: "${sanitized}"`);
    }

    emote(socket: Socket, action: string): void {
        const player = this.playerManager.getPlayer(socket.id)!;

        // Validate action
        if (!isValidMessage(action)) {
            socket.emit('error', 'Invalid action (empty, too long, or contains prohibited content)');
            return;
        }

        const sanitized = sanitizeInput(action);
        this.worldService.broadcastToRoom(player.roomId, `${player.character.name} ${sanitized}`, socket.id);
        socket.emit('message', `You ${sanitized}`);
    }

    debug(socket: Socket): void {
        const player = this.playerManager.getPlayer(socket.id)!;
        const room = this.roomManager.getRoom(player.roomId)!;
        gameLogger.debug(
            {
                player: player.character.name,
                roomId: player.roomId,
                x: room.x,
                y: room.y,
                hp: player.hp,
                level: player.level
            },
            'Debug info requested'
        );
        socket.emit('message', `DEBUG: Room ${room.id} at ${room.x},${room.y}`);
    }


    startGhostLoop(): void {
        this.ghostManager.spawnInitialGhosts(this.worldData.starting_room);
        const ghosts = this.ghostManager.getAllGhosts();
        gameLogger.info({ count: ghosts.length, ghosts: ghosts.map(g => ({ name: g.name, roomId: g.roomId })) }, 'Ghosts spawned');
        this.ghostManager.startMovementLoop(() => this.moveGhosts());
    }

    moveGhosts(): void {
        const allGhosts = this.ghostManager.getAllGhosts();
        for (const ghost of allGhosts) {
            const room = this.roomManager.getRoom(ghost.roomId);
            if (!room) continue;

            const exits = Object.keys(room.exits);
            if (exits.length === 0) continue;

            const dir = exits[Math.floor(Math.random() * exits.length)];

            // Skip locked doors
            if (room.locks && room.locks[dir]) continue;

            const nextRoomId = room.exits[dir];
            this.worldService.broadcastToRoom(ghost.roomId, `${ghost.name} floats ${dir}.`);

            this.ghostManager.moveGhost(ghost, exits, (direction: string) =>
                this.roomManager.getExitRoomId(ghost.roomId, direction)
            );

            this.worldService.broadcastToRoom(nextRoomId, `${ghost.name} floats in from the ${this.getOppositeDirection(dir)}.`);
        }
    }


    sendStats(socket: Socket): void {
        const player = this.playerManager.getPlayer(socket.id);
        if (!player) return;

        socket.emit('updateStats', {
            hp: player.hp,
            maxHp: player.maxHp,
            level: player.level,
            experience: player.experience,
            attack: player.attack,
            defense: player.defense
        });
    }
}
