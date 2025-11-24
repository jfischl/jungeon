import { GameManager } from './game';
import { Server, Socket } from 'socket.io';
import { Player } from '../shared/types';

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

describe('GameManager', () => {
    let gameManager: GameManager;

    beforeEach(() => {
        jest.clearAllMocks();
        gameManager = new GameManager(mockIo);

        // Inject mock data directly
        gameManager.worldData = {
            starting_room: 'room_a',
            rooms: {
                'room_a': {
                    id: 'room_a',
                    name: 'Room A',
                    description: 'Desc A',
                    exits: { 'north': 'room_b' },
                    coins: 5,
                    items: [],
                    locks: {},
                    x: 0, y: 0
                },
                'room_b': {
                    id: 'room_b',
                    name: 'Room B',
                    description: 'Desc B',
                    exits: { 'south': 'room_a', 'east': 'room_c' },
                    coins: 0,
                    items: [],
                    locks: {},
                    x: 0, y: 1
                },
                'room_c': {
                    id: 'room_c',
                    name: 'Room C',
                    description: 'Desc C',
                    exits: { 'west': 'room_b' },
                    coins: 0,
                    items: [],
                    locks: {},
                    x: 1, y: 1
                }
            }
        };
        gameManager.roomManager.loadWorldData(gameManager.worldData);
        gameManager.characters = [{ id: 'warrior', name: 'Warrior', description: 'Strong', baseHp: 100, baseAttack: 15, baseDefense: 10 }];
    });

    afterEach(() => {
        // Clean up ghost movement interval to prevent Jest warning
        gameManager.ghostManager.stopMovementLoop();
    });

    test('handleLogin adds player to starting room', () => {
        gameManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.playerManager.getPlayer('socket1');
        expect(player).toBeDefined();
        expect(player!.character.id).toBe('warrior');
        expect(player!.roomId).toBe('room_a');
        expect(mockSocket.emit).toHaveBeenCalledWith('loginSuccess', expect.any(Object));
    });

    test('move updates player position', () => {
        gameManager.handleLogin(mockSocket, 'warrior');

        // Room A -> North -> Room B
        gameManager.move(mockSocket, 'north');

        const player = gameManager.playerManager.getPlayer('socket1')!;
        expect(player.roomId).toBe('room_b');
    });

    test('move prevents invalid movement', () => {
        gameManager.handleLogin(mockSocket, 'warrior');

        gameManager.move(mockSocket, 'north'); // In Room B
        (mockSocket.emit as jest.Mock).mockClear();

        gameManager.move(mockSocket, 'north'); // Invalid (Room B has South, East)

        const player = gameManager.playerManager.getPlayer('socket1')!;
        expect(player.roomId).toBe('room_b'); // Still in room_b
        expect(mockSocket.emit).toHaveBeenCalledWith('message', "You can't go that way.");
    });

    test('collect adds coins to inventory', () => {
        gameManager.handleLogin(mockSocket, 'warrior');
        // Room A has 5 coins

        gameManager.collect(mockSocket);

        const player = gameManager.playerManager.getPlayer('socket1')!;
        expect(player.inventory.coins).toBe(5);
        expect(gameManager.roomManager.getRoom('room_a')!.coins).toBe(0);
    });

    test('drop removes coins from inventory', () => {
        gameManager.handleLogin(mockSocket, 'warrior');
        gameManager.collect(mockSocket); // Has 5

        gameManager.drop(mockSocket);

        const player = gameManager.playerManager.getPlayer('socket1')!;
        expect(player.inventory.coins).toBe(0);
        expect(gameManager.roomManager.getRoom('room_a')!.coins).toBe(5);
    });

    describe('getNearbyRoomId', () => {
        test('should return a room ID from exits of starting room', () => {
            const nearbyRoomId = gameManager.getNearbyRoomId('room_a');

            // room_a has only one exit: north -> room_b
            expect(nearbyRoomId).toBe('room_b');
        });

        test('should return random exit when multiple exits exist', () => {
            const nearbyRoomId = gameManager.getNearbyRoomId('room_b');

            // room_b has exits to room_a and room_c
            expect(['room_a', 'room_c']).toContain(nearbyRoomId);
        });

        test('should return random room when starting room does not exist', () => {
            const nearbyRoomId = gameManager.getNearbyRoomId('nonexistent_room');

            // Should fallback to random room selection
            expect(nearbyRoomId).toBeDefined();
            expect(['room_a', 'room_b', 'room_c']).toContain(nearbyRoomId);
        });

        test('should return random room when starting room has no exits', () => {
            // Create a room with no exits
            gameManager.worldData.rooms['isolated_room'] = {
                id: 'isolated_room',
                name: 'Isolated Room',
                description: 'A room with no exits',
                exits: {},
                coins: 0,
                items: [],
                locks: {},
                x: 2, y: 2
            };
            gameManager.roomManager.loadWorldData(gameManager.worldData);

            const nearbyRoomId = gameManager.getNearbyRoomId('isolated_room');

            // Should fallback to random room selection
            expect(nearbyRoomId).toBeDefined();
            expect(['room_a', 'room_b', 'room_c', 'isolated_room']).toContain(nearbyRoomId);
        });
    });
});
