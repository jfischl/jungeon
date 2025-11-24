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
        gameManager.rooms = JSON.parse(JSON.stringify(gameManager.worldData.rooms)); // Deep copy for runtime state
        gameManager.characters = [{ id: 'warrior', name: 'Warrior', description: 'Strong', baseHp: 100, baseAttack: 15, baseDefense: 10 }];
    });

    test('handleLogin adds player to starting room', () => {
        gameManager.handleLogin(mockSocket, 'warrior');

        const player = gameManager.players.get('socket1');
        expect(player).toBeDefined();
        expect(player!.character.id).toBe('warrior');
        expect(player!.roomId).toBe('room_a');
        expect(mockSocket.emit).toHaveBeenCalledWith('loginSuccess', expect.any(Object));
    });

    test('move updates player position', () => {
        gameManager.handleLogin(mockSocket, 'warrior');

        // Room A -> North -> Room B
        gameManager.move(mockSocket, 'north');

        const player = gameManager.players.get('socket1')!;
        expect(player.roomId).toBe('room_b');
    });

    test('move prevents invalid movement', () => {
        gameManager.handleLogin(mockSocket, 'warrior');

        gameManager.move(mockSocket, 'north'); // In Room B
        (mockSocket.emit as jest.Mock).mockClear();

        gameManager.move(mockSocket, 'north'); // Invalid (Room B has South, East)

        const player = gameManager.players.get('socket1')!;
        expect(player.roomId).toBe('room_b'); // Still in room_b
        expect(mockSocket.emit).toHaveBeenCalledWith('message', "You can't go that way.");
    });

    test('collect adds coins to inventory', () => {
        gameManager.handleLogin(mockSocket, 'warrior');
        // Room A has 5 coins

        gameManager.collect(mockSocket);

        const player = gameManager.players.get('socket1')!;
        expect(player.inventory.coins).toBe(5);
        expect(gameManager.rooms['room_a'].coins).toBe(0);
    });

    test('drop removes coins from inventory', () => {
        gameManager.handleLogin(mockSocket, 'warrior');
        gameManager.collect(mockSocket); // Has 5

        gameManager.drop(mockSocket);

        const player = gameManager.players.get('socket1')!;
        expect(player.inventory.coins).toBe(0);
        expect(gameManager.rooms['room_a'].coins).toBe(5);
    });
});
