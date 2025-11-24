import { GameManager } from './game';
import { Server, Socket } from 'socket.io';

// Mock WorldRepository
jest.mock('./data/WorldRepository', () => {
    return {
        WorldRepository: jest.fn().mockImplementation(() => {
            return {
                loadWorld: jest.fn().mockReturnValue(null),
                saveWorld: jest.fn(),
                loadPlayers: jest.fn().mockReturnValue({}),
                savePlayers: jest.fn(),
                loadCharacters: jest.fn().mockReturnValue([])
            };
        })
    };
});

// Mock Socket.io
const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    sockets: {
        sockets: {
            get: jest.fn()
        }
    }
} as unknown as Server;

const mockSocket = {
    id: 'socket1',
    emit: jest.fn()
} as unknown as Socket;

describe('Minimap', () => {
    let gameManager: GameManager;

    beforeEach(() => {
        jest.clearAllMocks();
        gameManager = new GameManager(mockIo);

        // Create a 3x3 grid of rooms for testing
        gameManager.worldData = {
            starting_room: 'room_0_0',
            rooms: {
                'room_0_0': {
                    id: 'room_0_0',
                    name: 'Center Room',
                    description: 'Center',
                    exits: { 'north': 'room_0_1', 'east': 'room_1_0', 'south': 'room_0_-1', 'west': 'room_-1_0' },
                    coins: 0,
                    items: [],
                    locks: {},
                    x: 0,
                    y: 0
                },
                'room_0_1': {
                    id: 'room_0_1',
                    name: 'North Room',
                    description: 'North',
                    exits: { 'south': 'room_0_0' },
                    coins: 0,
                    items: [],
                    locks: {},
                    x: 0,
                    y: 1
                },
                'room_1_0': {
                    id: 'room_1_0',
                    name: 'East Room',
                    description: 'East',
                    exits: { 'west': 'room_0_0' },
                    coins: 0,
                    items: [],
                    locks: {},
                    x: 1,
                    y: 0
                },
                'room_0_-1': {
                    id: 'room_0_-1',
                    name: 'South Room',
                    description: 'South',
                    exits: { 'north': 'room_0_0' },
                    coins: 0,
                    items: [],
                    locks: {},
                    x: 0,
                    y: -1
                },
                'room_-1_0': {
                    id: 'room_-1_0',
                    name: 'West Room',
                    description: 'West',
                    exits: { 'east': 'room_0_0' },
                    coins: 0,
                    items: [],
                    locks: {},
                    x: -1,
                    y: 0
                }
            }
        };

        // Load rooms into RoomManager
        gameManager['roomManager'].loadWorldData(gameManager.worldData);

        gameManager.characters = [{
            id: 'warrior',
            name: 'Warrior',
            description: 'Strong',
            baseHp: 100,
            baseAttack: 15,
            baseDefense: 10
        }];
    });

    afterEach(() => {
        // Clean up ghost movement interval to prevent Jest warning
        gameManager.ghostManager.stopMovementLoop();
    });

    test('minimap is generated and not empty when player has explored rooms', () => {
        // Login player
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.playerManager.getPlayer('socket1')!;
        expect(player).toBeDefined();

        // Get the minimap
        const minimap = gameManager.getMinimap(player);

        // Minimap should not be empty or all spaces
        expect(minimap).toBeTruthy();
        expect(minimap.length).toBeGreaterThan(0);
        expect(minimap.trim().length).toBeGreaterThan(0);

        // Should contain the player marker "*"
        expect(minimap).toContain('*');
    });

    test('minimap shows explored rooms only', () => {
        // Login player
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.playerManager.getPlayer('socket1')!;

        // Player starts at room_0_0, so only that should be explored
        expect(player.exploredRooms.has('room_0_0')).toBe(true);
        expect(player.exploredRooms.size).toBe(1);

        // Get the minimap
        const minimap = gameManager.getMinimap(player);

        // Should contain exactly one "*" (current room)
        const starCount = (minimap.match(/\*/g) || []).length;
        expect(starCount).toBe(1);

        // Should not contain "[ ]" because no other rooms are explored yet
        expect(minimap).not.toContain('[ ]');
    });

    test('minimap updates when player moves to new rooms', () => {
        // Login player
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.playerManager.getPlayer('socket1')!;

        // Move north
        gameManager.move(mockSocket, 'north');

        // Player should now be in room_0_1 and have explored 2 rooms
        expect(player.roomId).toBe('room_0_1');
        expect(player.exploredRooms.size).toBe(2);
        expect(player.exploredRooms.has('room_0_0')).toBe(true);
        expect(player.exploredRooms.has('room_0_1')).toBe(true);

        // Get the minimap
        const minimap = gameManager.getMinimap(player);

        // Should contain one "*" (current room) and one "[ ]" (previously explored room)
        const starCount = (minimap.match(/\*/g) || []).length;
        expect(starCount).toBe(1);
        expect(minimap).toContain('[ ]');

        // Should contain vertical connector "|" between the rooms
        expect(minimap).toContain('|');
    });

    test('minimap shows multiple explored rooms after visiting several locations', () => {
        // Login player
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.playerManager.getPlayer('socket1')!;

        // Move through multiple rooms: north, south, east
        gameManager.move(mockSocket, 'north');  // to room_0_1
        gameManager.move(mockSocket, 'south');  // back to room_0_0
        gameManager.move(mockSocket, 'east');   // to room_1_0

        // Player should have explored 3 rooms
        expect(player.exploredRooms.size).toBe(3);
        expect(player.exploredRooms.has('room_0_0')).toBe(true);
        expect(player.exploredRooms.has('room_0_1')).toBe(true);
        expect(player.exploredRooms.has('room_1_0')).toBe(true);

        // Get the minimap
        const minimap = gameManager.getMinimap(player);

        // Should contain one "*" (current room in room_1_0)
        const starCount = (minimap.match(/\*/g) || []).length;
        expect(starCount).toBe(1);

        // Should contain "[ ]" for the other explored rooms
        const roomCount = (minimap.match(/\[ \]/g) || []).length;
        expect(roomCount).toBeGreaterThanOrEqual(2);
    });

    test('minimap does not show unexplored rooms', () => {
        // Login player
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.playerManager.getPlayer('socket1')!;

        // Player has only explored the starting room
        expect(player.exploredRooms.size).toBe(1);

        // Get the minimap
        const minimap = gameManager.getMinimap(player);

        // Count the number of room markers (should be exactly 1: the "*")
        const starCount = (minimap.match(/\*/g) || []).length;
        const bracketCount = (minimap.match(/\[ \]/g) || []).length;
        const totalRooms = starCount + bracketCount;

        expect(totalRooms).toBe(1);
    });

    test('minimap coordinates are correctly calculated', () => {
        // Login player
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.playerManager.getPlayer('socket1')!;

        // Move to all four adjacent rooms to explore them
        gameManager.move(mockSocket, 'north');  // room_0_1
        gameManager.move(mockSocket, 'south');  // back to room_0_0
        gameManager.move(mockSocket, 'south');  // room_0_-1
        gameManager.move(mockSocket, 'north');  // back to room_0_0
        gameManager.move(mockSocket, 'east');   // room_1_0
        gameManager.move(mockSocket, 'west');   // back to room_0_0
        gameManager.move(mockSocket, 'west');   // room_-1_0

        // All 5 rooms should be explored
        expect(player.exploredRooms.size).toBe(5);

        // Get the minimap
        const minimap = gameManager.getMinimap(player);

        // Verify the minimap is properly structured with newlines
        const lines = minimap.split('\n');
        expect(lines.length).toBeGreaterThan(0);

        // Should show all explored rooms in a cross pattern
        const starCount = (minimap.match(/\*/g) || []).length;
        const bracketCount = (minimap.match(/\[ \]/g) || []).length;
        expect(starCount).toBe(1); // Current room
        expect(bracketCount).toBe(4); // Four adjacent rooms
    });
});
