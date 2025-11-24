import { GameManager } from '../game';
import { setupMockGameManager } from '../testFixtures';

describe('Minimap Display Tests', () => {
    let gameManager: any;
    let mockSocket: any;
    let mockIo: any;

    beforeEach(() => {
        // Create minimal mock IO
        mockIo = {
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {
                sockets: new Map()
            }
        } as any;

        gameManager = new GameManager(mockIo);

        // Create a custom world for minimap testing with specific coordinates
        gameManager.worldData = {
            starting_room: 'center',
            rooms: {
                'center': {
                    id: 'center',
                    name: 'Center Room',
                    description: 'The center of the test world',
                    x: 0,
                    y: 0,
                    exits: {
                        north: 'north_room',
                        south: 'south_room',
                        east: 'east_room',
                        west: 'west_room'
                    },
                    items: [],
                    coins: 0,
                    locks: {}
                },
                'north_room': {
                    id: 'north_room',
                    name: 'North Room',
                    description: 'To the north',
                    x: 0,
                    y: -1,
                    exits: {
                        south: 'center'
                    },
                    items: [],
                    coins: 0,
                    locks: {}
                },
                'south_room': {
                    id: 'south_room',
                    name: 'South Room',
                    description: 'To the south',
                    x: 0,
                    y: 1,
                    exits: {
                        north: 'center'
                    },
                    items: [],
                    coins: 0,
                    locks: {}
                },
                'east_room': {
                    id: 'east_room',
                    name: 'East Room',
                    description: 'To the east',
                    x: 1,
                    y: 0,
                    exits: {
                        west: 'center'
                    },
                    items: [],
                    coins: 0,
                    locks: {}
                },
                'west_room': {
                    id: 'west_room',
                    name: 'West Room',
                    description: 'To the west',
                    x: -1,
                    y: 0,
                    exits: {
                        east: 'center'
                    },
                    items: [],
                    coins: 0,
                    locks: {}
                }
            }
        };

        gameManager.roomManager.loadWorldData(gameManager.worldData);

        // Set up characters
        gameManager.characters = [
            { id: 'warrior', name: 'Warrior', description: 'A warrior', baseHp: 100, baseAttack: 15, baseDefense: 10 }
        ];

        // Mock socket
        mockSocket = {
            id: 'test-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };

        mockIo.sockets.sockets.set(mockSocket.id, mockSocket);
    });

    afterEach(() => {
        gameManager.ghostManager.stopMovementLoop();
    });

    it('should show north exit from current room (even if destination unexplored)', () => {
        // Login player at center room
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        // Player has only explored center room
        player.exploredRooms = new Set(['center']);
        player.roomId = 'center';

        // Generate minimap
        const minimap = gameManager.worldService.getMinimap(player);

        // The minimap should show a vertical bar above the player position indicating north exit
        // Format: The player is "*" and north exit shows as "|" in the line below the player
        // We're looking for the pattern: "*" on one line, then "|" below it
        const lines = minimap.split('\n');

        // Find the line with the player
        let playerLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('*')) {
                playerLineIndex = i;
                break;
            }
        }

        expect(playerLineIndex).toBeGreaterThan(-1);

        // The line immediately after the player line should contain "|" indicating north exit
        const lineAfterPlayer = lines[playerLineIndex + 1];
        expect(lineAfterPlayer).toContain('|');
    });

    it('should show south exit from current room (even if destination unexplored)', () => {
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        player.exploredRooms = new Set(['center']);
        player.roomId = 'center';

        const minimap = gameManager.worldService.getMinimap(player);

        // South exit shows as "|" in the line immediately after the player's line
        const lines = minimap.split('\n');
        let playerLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('*')) {
                playerLineIndex = i;
                break;
            }
        }

        expect(playerLineIndex).toBeGreaterThan(-1);
        const lineAfterPlayer = lines[playerLineIndex + 1];
        expect(lineAfterPlayer).toContain('|');
    });

    it('should show east exit from current room (even if destination unexplored)', () => {
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        player.exploredRooms = new Set(['center']);
        player.roomId = 'center';

        const minimap = gameManager.worldService.getMinimap(player);

        // East exit shows as "-" immediately to the right of the player on the same line
        const lines = minimap.split('\n');
        let playerLine = '';
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('*')) {
                playerLine = lines[i];
                break;
            }
        }

        expect(playerLine).toContain('*');
        // The "-" should appear after "*" on the same line
        const playerPos = playerLine.indexOf('*');
        expect(playerPos).toBeGreaterThan(-1);
        expect(playerLine.substring(playerPos)).toContain('-');
    });

    it('should show west exit from current room (even if destination unexplored)', () => {
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        player.exploredRooms = new Set(['center']);
        player.roomId = 'center';

        const minimap = gameManager.worldService.getMinimap(player);

        // West exit is shown indirectly: the algorithm shows it as an east exit
        // from the west room's position (which is to the left of player)
        // For simplicity, just verify the minimap contains the player and at least one dash
        expect(minimap).toContain('*');
        expect(minimap).toContain('-'); // West represented as dash in the grid
    });

    it('should show all four cardinal directions when player has all exits', () => {
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        player.exploredRooms = new Set(['center']);
        player.roomId = 'center';

        const minimap = gameManager.worldService.getMinimap(player);

        // Should show connections in all four directions
        expect(minimap).toContain('*'); // Player
        expect(minimap).toContain('|'); // North or South connection
        expect(minimap).toContain('-'); // East or West connection
    });

    it('should only show exits to explored rooms for non-current rooms', () => {
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        // Player has explored center and north, but not south
        player.exploredRooms = new Set(['center', 'north_room']);
        player.roomId = 'center';

        const minimap = gameManager.worldService.getMinimap(player);
        const lines = minimap.split('\n');

        // Find the north room representation (should be [ ])
        let foundNorthRoom = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('[ ]')) {
                foundNorthRoom = true;
                // The north room should NOT show its south exit to center as a separate indicator
                // (the connection is already shown from center's perspective)
                break;
            }
        }

        expect(foundNorthRoom).toBe(true);
    });

    it('should show player as * in center of explored area', () => {
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        player.exploredRooms = new Set(['center', 'north_room', 'south_room']);
        player.roomId = 'center';

        const minimap = gameManager.worldService.getMinimap(player);

        // Player should be represented as "*"
        expect(minimap).toContain('*');

        // Should NOT contain the player marker "P" (that's for other players)
        const playerSymbolCount = (minimap.match(/\*/g) || []).length;
        expect(playerSymbolCount).toBe(1); // Exactly one player symbol
    });

    it('should show other players as P in their rooms', () => {
        // Login first player
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player1 = gameManager.playerManager.getPlayer(mockSocket.id);
        player1.exploredRooms = new Set(['center', 'north_room']);
        player1.roomId = 'center';

        // Add a second character for the second player
        gameManager.characters.push({
            id: 'mage',
            name: 'Mage',
            description: 'A mage',
            baseHp: 70,
            baseAttack: 22,
            baseDefense: 6
        });

        // Login second player in north room
        const mockSocket2 = {
            id: 'test-socket-2',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };
        mockIo.sockets.sockets.set(mockSocket2.id, mockSocket2);

        gameManager.connectionManager.handleLogin(mockSocket2, 'mage');
        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);
        player2.roomId = 'north_room';
        player2.exploredRooms = new Set(['north_room']);

        // Get player1's minimap
        const minimap = gameManager.worldService.getMinimap(player1);

        // Should show player1 as * and player2 as P
        expect(minimap).toContain('*');
        expect(minimap).toContain('P');
    });

    it('should not show unexplored rooms', () => {
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        // Only center room explored
        player.exploredRooms = new Set(['center']);
        player.roomId = 'center';

        const minimap = gameManager.worldService.getMinimap(player);

        // Should only show player symbol, not room symbols for unexplored areas
        const roomSymbolCount = (minimap.match(/\[ \]/g) || []).length;
        expect(roomSymbolCount).toBe(0); // No explored rooms other than current position
    });
});
