import { Server, Socket } from 'socket.io';
import { Player, Room, Character, WorldData, RoomDataPacket, Inventory } from '../shared/types';
import { WorldRepository } from './data/WorldRepository';
import { Command } from './commands/Command';
import { MoveCommand } from './commands/MoveCommand';
import { LookCommand } from './commands/LookCommand';
import { GetCommand } from './commands/GetCommand';
import { DropCommand } from './commands/DropCommand';
import { InventoryCommand } from './commands/InventoryCommand';
import { SayCommand } from './commands/SayCommand';
import { EmoteCommand } from './commands/EmoteCommand';
import { DebugCommand } from './commands/DebugCommand';
import { ExamineCommand } from './commands/ExamineCommand';
import { UnlockCommand } from './commands/UnlockCommand';
import { AttackCommand } from './commands/AttackCommand';
import { CombatManager } from './CombatManager';
import { FleeCommand } from './commands/FleeCommand';
import { DefendCommand } from './commands/DefendCommand';
import { HealCommand } from './commands/HealCommand';
import { ChallengeCommand } from './commands/ChallengeCommand';
import { AcceptCommand } from './commands/AcceptCommand';
import { CONFIG } from './config';
import { validateCommandInput, parseCommand, sanitizeInput, isValidMessage } from '../shared/validators';
import { PlayerManager } from './managers/PlayerManager';
import { RoomManager } from './managers/RoomManager';
import { GhostManager, Ghost } from './managers/GhostManager';
import { ConnectionManager } from './managers/ConnectionManager';
import { gameLogger, playerLogger } from './logger';

export class GameManager {
    io: Server;
    worldData: WorldData;

    // Entity managers
    playerManager: PlayerManager;
    roomManager: RoomManager;
    ghostManager: GhostManager;
    connectionManager: ConnectionManager;

    characters: Character[];
    combatManager: CombatManager;
    pendingChallenges: Map<string, { challengerId: string; targetId: string; timestamp: number }>;

    private repository: WorldRepository;
    private commands: Map<string, Command>;
    private roomOperationQueues: Map<string, Promise<any>>;

    constructor(io: Server) {
        this.io = io;

        // Initialize managers
        this.playerManager = new PlayerManager();
        this.roomManager = new RoomManager();
        this.ghostManager = new GhostManager(
            () => this.getRandomRoomId(),
            (startingRoomId) => this.getNearbyRoomId(startingRoomId)
        );

        this.worldData = { starting_room: '', rooms: {} };
        this.characters = [];

        this.repository = new WorldRepository();
        this.commands = new Map();
        this.combatManager = new CombatManager(this);
        this.pendingChallenges = new Map();
        this.roomOperationQueues = new Map();
        this.registerCommands();

        this.loadGame();

        // Initialize ConnectionManager with all dependencies
        this.connectionManager = new ConnectionManager(
            this.playerManager,
            this.roomManager,
            this.repository,
            () => this.characters,
            () => this.worldData,
            (roomId, message, excludeId) => this.broadcastToRoom(roomId, message, excludeId),
            (socket) => this.look(socket),
            (socket) => this.sendStats(socket),
            () => this.saveGame(),
            (socket, cmd) => this.handleCommand(socket, cmd)
        );

        this.startGhostLoop();
    }

    private registerCommands(): void {
        this.commands.set('n', new MoveCommand('north'));
        this.commands.set('north', new MoveCommand('north'));
        this.commands.set('s', new MoveCommand('south'));
        this.commands.set('south', new MoveCommand('south'));
        this.commands.set('e', new MoveCommand('east'));
        this.commands.set('east', new MoveCommand('east'));
        this.commands.set('w', new MoveCommand('west'));
        this.commands.set('west', new MoveCommand('west'));

        this.commands.set('look', new LookCommand());
        this.commands.set('l', new LookCommand()); // Added 'l' alias
        this.commands.set('get', new GetCommand());
        this.commands.set('collect', new GetCommand());
        this.commands.set('drop', new DropCommand());
        this.commands.set('inv', new InventoryCommand());
        this.commands.set('inventory', new InventoryCommand());

        this.commands.set('say', new SayCommand());
        this.commands.set('emote', new EmoteCommand());
        this.commands.set('me', new EmoteCommand()); // Added 'me' alias
        this.commands.set('debug', new DebugCommand());

        this.commands.set('examine', new ExamineCommand());
        this.commands.set('ex', new ExamineCommand()); // Short alias
        this.commands.set('unlock', new UnlockCommand());

        this.commands.set('attack', new AttackCommand());
        this.commands.set('kill', new AttackCommand()); // Alias
        this.commands.set('flee', new FleeCommand());
        this.commands.set('run', new FleeCommand()); // Alias
        this.commands.set('defend', new DefendCommand());
        this.commands.set('block', new DefendCommand()); // Alias
        this.commands.set('heal', new HealCommand());
        this.commands.set('drink', new HealCommand()); // Alias
        this.commands.set('challenge', new ChallengeCommand());
        this.commands.set('duel', new ChallengeCommand()); // Alias
        this.commands.set('accept', new AcceptCommand());
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

        // Validate input
        const validation = validateCommandInput(commandString);
        if (!validation.valid) {
            const player = this.playerManager.getPlayer(socket.id);
            gameLogger.warn(
                {
                    player: player?.character.name,
                    input: commandString.substring(0, 50),
                    error: validation.error
                },
                'Invalid command input'
            );
            socket.emit('error', validation.error || 'Invalid command');
            return;
        }

        // Parse and sanitize
        const { command: action, args } = parseCommand(commandString);

        const command = this.commands.get(action);
        if (command) {
            const player = this.playerManager.getPlayer(socket.id);
            gameLogger.debug(
                { player: player?.character.name, command: action, args },
                'Command executed'
            );
            command.execute(socket, args, this);
        } else {
            socket.emit('message', "Unknown command.");
        }
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
        this.broadcastToRoom(oldRoomId, `${player.character.name} leaves ${direction}.`, socket.id);

        player.roomId = nextRoomId;
        this.broadcastToRoom(nextRoomId, `${player.character.name} arrives from the ${this.getOppositeDirection(direction)}.`, socket.id);
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
            minimap: this.getMinimap(player)
        };

        socket.emit('roomData', description);
        this.sendStats(socket);
    }

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

                // Only show room if player has explored it
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

                    const east = showEastExit ? "-" : " ";
                    line1 += symbol + east;

                    const south = showSouthExit ? " | " : "   ";
                    line2 += south + " ";
                } else {
                    // Unexplored or no room - show blank
                    line1 += "    ";
                    line2 += "    ";
                }
            }
            mapStr += line1 + "\n" + line2 + "\n";
        }

        return mapStr;
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
        const newOperation = existing.then(() => operation()).catch((error) => {
            gameLogger.error({ roomId, error }, 'Room operation failed');
            throw error;
        });

        // Update the queue
        this.roomOperationQueues.set(roomId, newOperation);

        // Clean up resolved promises to prevent memory leaks
        newOperation.finally(() => {
            if (this.roomOperationQueues.get(roomId) === newOperation) {
                this.roomOperationQueues.delete(roomId);
            }
        });

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
                this.broadcastToRoom(roomId, `${player.character.name} picks up ${item.name}.`, socket.id);
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
                this.broadcastToRoom(roomId, `${player.character.name} collects some coins.`, socket.id);
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
                this.broadcastToRoom(roomId, `${player.character.name} drops some coins.`, socket.id);
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
        this.broadcastToRoom(player.roomId, `${player.character.name} says: "${sanitized}"`, socket.id);
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
        this.broadcastToRoom(player.roomId, `${player.character.name} ${sanitized}`, socket.id);
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

    broadcastToRoom(roomId: string, message: string, excludeSocketId?: string): void {
        for (const player of this.playerManager.getAllPlayers()) {
            if (player.roomId === roomId && player.id !== excludeSocketId) {
                this.io.to(player.id).emit('message', message);
            }
        }
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
            this.broadcastToRoom(ghost.roomId, `${ghost.name} floats ${dir}.`);

            this.ghostManager.moveGhost(ghost, exits, (direction: string) =>
                this.roomManager.getExitRoomId(ghost.roomId, direction)
            );

            this.broadcastToRoom(nextRoomId, `${ghost.name} floats in from the ${this.getOppositeDirection(dir)}.`);
        }
    }

    getRandomRoomId(): string {
        return this.roomManager.getRandomRoomId();
    }

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
