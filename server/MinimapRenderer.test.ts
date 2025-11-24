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

describe('Minimap Renderer - All Exit Combinations', () => {
    let gameManager: GameManager;

    beforeEach(() => {
        jest.clearAllMocks();
        gameManager = new GameManager(mockIo);

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
        gameManager.ghostManager.stopMovementLoop();
    });

    // Helper function to count exit connectors in minimap
    function countExitMarkers(minimap: string): { horizontal: number, vertical: number } {
        const lines = minimap.split('\n');
        let horizontal = 0;
        let vertical = 0;

        for (const line of lines) {
            // Count horizontal exits (-)
            const dashMatches = line.match(/-/g);
            if (dashMatches) horizontal += dashMatches.length;

            // Count vertical exits (|)
            const pipeMatches = line.match(/\|/g);
            if (pipeMatches) vertical += pipeMatches.length;
        }

        return { horizontal, vertical };
    }

    describe('Single Exit Directions', () => {
        test('room with only NORTH exit shows vertical connector above', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Start',
                        description: 'Starting room',
                        exits: { 'north': 'room_0_1' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
            expect(minimap).toContain('|');
        });

        test('room with only SOUTH exit shows vertical connector below', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Start',
                        description: 'Starting room',
                        exits: { 'south': 'room_0_-1' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
            expect(minimap).toContain('|');
        });

        test('room with only EAST exit shows horizontal connector to the right', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Start',
                        description: 'Starting room',
                        exits: { 'east': 'room_1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(minimap).toContain('-');
        });

        test('room with only WEST exit shows horizontal connector to the left', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Start',
                        description: 'Starting room',
                        exits: { 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(minimap).toContain('-');
        });
    });

    describe('Two Exit Combinations', () => {
        test('room with NORTH and SOUTH exits (vertical corridor)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Center',
                        description: 'Center room',
                        exits: { 'north': 'room_0_1', 'south': 'room_0_-1' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(2);
            expect(exitMarkers.horizontal).toBe(0);
        });

        test('room with EAST and WEST exits (horizontal corridor)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Center',
                        description: 'Center room',
                        exits: { 'east': 'room_1_0', 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(2);
            expect(exitMarkers.vertical).toBe(0);
        });

        test('room with NORTH and EAST exits (L-shaped)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Corner',
                        description: 'Corner room',
                        exits: { 'north': 'room_0_1', 'east': 'room_1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
        });

        test('room with NORTH and WEST exits (L-shaped)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Corner',
                        description: 'Corner room',
                        exits: { 'north': 'room_0_1', 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
        });

        test('room with SOUTH and EAST exits (L-shaped)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Corner',
                        description: 'Corner room',
                        exits: { 'south': 'room_0_-1', 'east': 'room_1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
        });

        test('room with SOUTH and WEST exits (L-shaped)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Corner',
                        description: 'Corner room',
                        exits: { 'south': 'room_0_-1', 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Three Exit Combinations', () => {
        test('room with NORTH, EAST, and SOUTH exits (T-shaped, open right)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Junction',
                        description: 'T-junction room',
                        exits: { 'north': 'room_0_1', 'east': 'room_1_0', 'south': 'room_0_-1' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(2);
        });

        test('room with NORTH, EAST, and WEST exits (T-shaped, open up)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Junction',
                        description: 'T-junction room',
                        exits: { 'north': 'room_0_1', 'east': 'room_1_0', 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(2);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
        });

        test('room with NORTH, SOUTH, and WEST exits (T-shaped, open left)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Junction',
                        description: 'T-junction room',
                        exits: { 'north': 'room_0_1', 'south': 'room_0_-1', 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(2);
        });

        test('room with SOUTH, EAST, and WEST exits (T-shaped, open down)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Junction',
                        description: 'T-junction room',
                        exits: { 'south': 'room_0_-1', 'east': 'room_1_0', 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(2);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Four Exit Combinations', () => {
        test('room with all four exits (crossroads)', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Crossroads',
                        description: 'All directions',
                        exits: { 'north': 'room_0_1', 'east': 'room_1_0', 'south': 'room_0_-1', 'west': 'room_-1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    },
                    'room_0_-1': {
                        id: 'room_0_-1',
                        name: 'South',
                        description: 'South room',
                        exits: { 'north': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: -1
                    },
                    'room_-1_0': {
                        id: 'room_-1_0',
                        name: 'West',
                        description: 'West room',
                        exits: { 'east': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: -1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(2);
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(2);
            expect(minimap).toContain('*'); // Player position
        });
    });

    describe('Zero Exit (Dead End)', () => {
        test('room with no exits shows only the room marker', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Dead End',
                        description: 'No way out',
                        exits: {},
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBe(0);
            expect(exitMarkers.vertical).toBe(0);
            expect(minimap).toContain('*'); // Still shows player position
        });
    });

    describe('Unexplored Exits', () => {
        test('current room shows exits to unexplored rooms', () => {
            gameManager.worldData = {
                starting_room: 'room_0_0',
                rooms: {
                    'room_0_0': {
                        id: 'room_0_0',
                        name: 'Start',
                        description: 'Starting room',
                        exits: { 'north': 'room_0_1', 'east': 'room_1_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 0
                    },
                    'room_0_1': {
                        id: 'room_0_1',
                        name: 'North',
                        description: 'North room',
                        exits: { 'south': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 0,
                        y: 1
                    },
                    'room_1_0': {
                        id: 'room_1_0',
                        name: 'East',
                        description: 'East room',
                        exits: { 'west': 'room_0_0' },
                        coins: 0,
                        items: [],
                        locks: {},
                        x: 1,
                        y: 0
                    }
                }
            };
            gameManager['roomManager'].loadWorldData(gameManager.worldData);
            gameManager.connectionManager.handleLogin(mockSocket, 'warrior');

            const player = gameManager.playerManager.getPlayer('socket1')!;
            const minimap = gameManager.worldService.getMinimap(player);

            // Should show exit indicators even though adjacent rooms aren't explored
            const exitMarkers = countExitMarkers(minimap);
            expect(exitMarkers.horizontal).toBeGreaterThanOrEqual(1); // East exit
            expect(exitMarkers.vertical).toBeGreaterThanOrEqual(1); // North exit
        });
    });
});
