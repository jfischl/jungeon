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
import { gameLogger, playerLogger } from './logger';

export class GameManager {
    io: Server;
    // Legacy properties for backward compatibility
    players: Map<string, Player>;
    rooms: Record<string, Room>;
    ghosts: Ghost[];
    worldData: WorldData;

    // Entity managers
    private playerManager: PlayerManager;
    private roomManager: RoomManager;
    private ghostManager: GhostManager;

    characters: Character[];
    combatManager: CombatManager;
    pendingChallenges: Map<string, { challengerId: string; targetId: string; timestamp: number }>;

    private repository: WorldRepository;
    private commands: Map<string, Command>;

    constructor(io: Server) {
        this.io = io;

        // Initialize managers
        this.playerManager = new PlayerManager();
        this.roomManager = new RoomManager();
        this.ghostManager = new GhostManager(() => this.getRandomRoomId());

        // Legacy properties - proxy to managers
        const playerMap = new Map<string, Player>();
        this.players = new Proxy(playerMap, {
            get: (target, prop) => {
                if (prop === 'get') return (id: string) => this.playerManager.getPlayer(id);
                if (prop === 'set') return (id: string, player: Player) => {
                    this.playerManager.addPlayer(id, player);
                    return this.players;
                };
                if (prop === 'has') return (id: string) => this.playerManager.hasPlayer(id);
                if (prop === 'delete') return (id: string) => this.playerManager.removePlayer(id);
                if (prop === 'values') return () => this.playerManager.getAllPlayers().values();
                if (prop === 'entries') return () => {
                    const players = this.playerManager.getAllPlayers();
                    return players.map(p => [p.id, p] as [string, Player])[Symbol.iterator]();
                };
                if (prop === Symbol.iterator) return () => {
                    const players = this.playerManager.getAllPlayers();
                    return players.map(p => [p.id, p] as [string, Player])[Symbol.iterator]();
                };
                return Reflect.get(target, prop, target);
            }
        });

        this.rooms = new Proxy({}, {
            get: (target, prop: string) => this.roomManager.getRoom(prop)
        }) as Record<string, Room>;

        this.ghosts = new Proxy([], {
            get: (target, prop) => {
                const ghosts = this.ghostManager.getAllGhosts();
                if (typeof prop === 'string' && !isNaN(Number(prop))) {
                    return ghosts[Number(prop)];
                }
                return (ghosts as any)[prop];
            }
        }) as Ghost[];

        this.worldData = { starting_room: '', rooms: {} };
        this.characters = [];

        this.repository = new WorldRepository();
        this.commands = new Map();
        this.combatManager = new CombatManager(this);
        this.pendingChallenges = new Map();
        this.registerCommands();

        this.loadGame();
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

    handleConnect(socket: Socket): void {
        playerLogger.info({ socketId: socket.id }, 'Player connected');

        socket.on('disconnect', () => {
            if (this.players.has(socket.id)) {
                const player = this.players.get(socket.id)!;
                playerLogger.info(
                    { socketId: socket.id, character: player.character.name },
                    'Player disconnected'
                );
                this.broadcastToRoom(player.roomId, `${player.character.name} has disconnected.`, socket.id);
                this.players.delete(socket.id);
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

    handleLogin(socket: Socket, charId: string): void {
        if (this.players.has(socket.id)) return;

        // Sanitize character ID
        const sanitizedCharId = sanitizeInput(charId, 50);

        const char = this.characters.find(c => c.id === sanitizedCharId);
        if (!char) {
            playerLogger.warn(
                { socketId: socket.id, attemptedCharId: sanitizedCharId },
                'Login failed: invalid character'
            );
            socket.emit('error', "Invalid character.");
            return;
        }

        const isTaken = Array.from(this.players.values()).some(p => p.character.id === sanitizedCharId);
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
        let roomId = this.worldData.starting_room;
        let inventory: Inventory = { coins: 0, items: [] };
        let exploredRooms = new Set<string>();

        const savedPlayers = this.repository.loadPlayers() as Record<string, { roomId: string; inventory: Inventory; exploredRooms?: string[] }> | null;
        if (savedPlayers && savedPlayers[charId]) {
            if (this.rooms[savedPlayers[charId].roomId]) {
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

        this.players.set(socket.id, player);

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
    }

    handleCommand(socket: Socket, commandString: string): void {
        if (!this.players.has(socket.id)) return;

        // Validate input
        const validation = validateCommandInput(commandString);
        if (!validation.valid) {
            const player = this.players.get(socket.id);
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
            const player = this.players.get(socket.id);
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
        const player = this.players.get(socket.id)!;
        const currentRoom = this.rooms[player.roomId];

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
        const player = this.players.get(socket.id)!;
        const room = this.rooms[player.roomId];

        // Track exploration
        player.exploredRooms.add(player.roomId);

        const otherPlayers = Array.from(this.players.values())
            .filter(p => p.roomId === player.roomId && p.id !== socket.id)
            .map(p => p.character.name);

        const ghostsHere = this.ghosts.filter(g => g.roomId === player.roomId);
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
        const pRoom = this.rooms[player.roomId];
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
                        const others = Array.from(this.players.values()).filter(p => p.roomId === room.id && p.id !== player.id);
                        if (others.length > 0) {
                            symbol = " P ";
                        } else {
                            symbol = "[ ]";
                        }
                    }

                    const east = room.exits['east'] ? "-" : " ";
                    line1 += symbol + east;

                    const south = room.exits['south'] ? " | " : "   ";
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

    pickUpItem(socket: Socket, itemName: string): void {
        const player = this.players.get(socket.id)!;
        const room = this.rooms[player.roomId];

        const itemIndex = room.items.findIndex(i => i.name.toLowerCase().includes(itemName.toLowerCase())); // Use room.items

        if (itemIndex !== -1) {
            const item = room.items.splice(itemIndex, 1)[0]; // Use room.items
            player.inventory.items.push(item);
            socket.emit('message', `You picked up ${item.name}.`);
            socket.emit('updateInventory', player.inventory);
            this.broadcastToRoom(player.roomId, `${player.character.name} picks up ${item.name}.`, socket.id);
            this.look(socket);
        } else {
            socket.emit('message', "You don't see that here.");
        }
    }

    collect(socket: Socket): void {
        const player = this.players.get(socket.id)!;
        const room = this.rooms[player.roomId];

        if (room.coins > 0) {
            const amount = room.coins;
            player.inventory.coins += amount;
            room.coins = 0;
            socket.emit('message', `You collected ${amount} coins.`);
            socket.emit('updateInventory', player.inventory);
            this.broadcastToRoom(player.roomId, `${player.character.name} collects some coins.`, socket.id);
            this.look(socket);
        } else {
            socket.emit('message', "There are no coins here.");
        }
    }

    drop(socket: Socket): void {
        const player = this.players.get(socket.id)!;
        const room = this.rooms[player.roomId];

        if (player.inventory.coins > 0) {
            const amount = player.inventory.coins;
            player.inventory.coins = 0;
            room.coins += amount;
            socket.emit('message', `You dropped ${amount} coins.`);
            socket.emit('updateInventory', player.inventory);
            this.broadcastToRoom(player.roomId, `${player.character.name} drops some coins.`, socket.id);
            this.look(socket);
        } else {
            socket.emit('message', "You have no coins to drop.");
        }
    }

    inventory(socket: Socket): void {
        const player = this.players.get(socket.id)!;
        socket.emit('message', `Inventory: ${player.inventory.coins} coins.`);
        if (player.inventory.items.length > 0) {
            const names = player.inventory.items.map(i => i.name).join(', ');
            socket.emit('message', `Items: ${names}`);
        } else {
            socket.emit('message', "You have no items.");
        }
    }

    say(socket: Socket, message: string): void {
        const player = this.players.get(socket.id)!;

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
        const player = this.players.get(socket.id)!;

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
        const player = this.players.get(socket.id)!;
        const room = this.rooms[player.roomId];
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
        for (const [id, player] of this.players) {
            if (player.roomId === roomId && id !== excludeSocketId) {
                this.io.to(id).emit('message', message);
            }
        }
    }

    getAvailableCharacters(): Character[] {
        const takenIds = Array.from(this.players.values()).map(p => p.character.id);
        return this.characters.filter(c => !takenIds.includes(c.id));
    }

    startGhostLoop(): void {
        this.ghostManager.spawnInitialGhosts();
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

    sendStats(socket: Socket): void {
        const player = this.players.get(socket.id);
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
