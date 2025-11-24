import { GameManager } from '../game';

/**
 * Load Test for Race Condition Fix
 *
 * This test simulates realistic concurrent load to verify that the
 * queue-based locking mechanism works correctly under stress.
 */
describe('Load Test - Race Condition Prevention', () => {
    let gameManager: GameManager;
    let mockIo: any;

    beforeEach(() => {
        mockIo = {
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: { sockets: new Map() }
        } as any;

        gameManager = new GameManager(mockIo);
    });

    // Helper to create mock characters for testing
    const createMockCharacters = (count: number) => {
        const mockChars = [];
        for (let i = 0; i < count; i++) {
            mockChars.push({
                id: `test-char-${i}`,
                name: `Test Character ${i}`,
                description: `Mock character for testing`,
                baseHp: 100,
                baseAttack: 15,
                baseDefense: 10
            });
        }
        return mockChars;
    };

    afterEach(() => {
        gameManager.ghostManager.stopMovementLoop();
    });

    /**
     * Simulates 10 players in the same room all trying to pick up
     * a single item simultaneously
     */
    it('LOAD: 10 players racing for 1 item - only 1 should succeed', async () => {
        const numPlayers = 10;
        gameManager.characters = createMockCharacters(numPlayers);

        const sockets: any[] = [];
        const players: any[] = [];

        // Create 10 players in the same room
        for (let i = 0; i < numPlayers; i++) {
            const socket = {
                id: `player${i}-socket`,
                emit: jest.fn(),
                on: jest.fn(),
                broadcast: { emit: jest.fn() }
            };
            mockIo.sockets.sockets.set(socket.id, socket);
            gameManager.handleLogin(socket as any, `test-char-${i}`);

            sockets.push(socket);
            players.push(gameManager.playerManager.getPlayer(socket.id)!);
        }

        // Put all players in the same room
        const roomId = players[0].roomId;
        players.forEach(p => p.roomId = roomId);

        // Add ONE item to the room
        const room = gameManager.roomManager.getRoom(roomId)!;
        room.items.push({
            id: 'legendary-item',
            name: 'Legendary Item',
            description: 'Only one exists'
        });

        // All 10 players try to grab it simultaneously
        const results = await Promise.allSettled(
            sockets.map(socket => gameManager.pickUpItem(socket, 'legendary'))
        );

        // Verify: Exactly ONE player got the item
        const playersWithItem = players.filter(p =>
            p.inventory.items.some((item: any) => item.id === 'legendary-item')
        );

        expect(playersWithItem.length).toBe(1);
        expect(room.items.length).toBe(0);

        // Verify all operations completed (no deadlocks)
        expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    }, 10000); // 10 second timeout

    /**
     * Simulates 20 players all collecting coins from the same room
     * Total coins must be conserved
     */
    it('LOAD: 20 players collecting 100 coins - conservation law', async () => {
        const numPlayers = 20;
        gameManager.characters = createMockCharacters(numPlayers);

        const sockets: any[] = [];
        const players: any[] = [];

        // Create 20 players in the same room
        for (let i = 0; i < numPlayers; i++) {
            const socket = {
                id: `player${i}-socket`,
                emit: jest.fn(),
                on: jest.fn(),
                broadcast: { emit: jest.fn() }
            };
            mockIo.sockets.sockets.set(socket.id, socket);
            gameManager.handleLogin(socket as any, `test-char-${i}`);

            sockets.push(socket);
            const player = gameManager.playerManager.getPlayer(socket.id)!;
            player.roomId = players[0]?.roomId || player.roomId;
            player.inventory.coins = 0; // Start with 0 coins
            players.push(player);
        }

        const roomId = players[0].roomId;
        const room = gameManager.roomManager.getRoom(roomId)!;
        room.coins = 100;

        const initialTotal = room.coins + players.reduce((sum, p) => sum + p.inventory.coins, 0);
        expect(initialTotal).toBe(100);

        // All 20 players try to collect simultaneously
        await Promise.all(
            sockets.map(socket => gameManager.collect(socket))
        );

        // Verify coin conservation
        const finalTotal = room.coins + players.reduce((sum, p) => sum + p.inventory.coins, 0);
        expect(finalTotal).toBe(100); // NO DUPLICATION!

        // Verify only ONE player got all the coins
        const playersWithCoins = players.filter(p => p.inventory.coins > 0);
        expect(playersWithCoins.length).toBe(1);
        expect(playersWithCoins[0].inventory.coins).toBe(100);
    }, 10000);

    /**
     * Simulates 15 players all dropping coins into the same room
     * Total coins must be conserved
     */
    it('LOAD: 15 players dropping coins - no coin loss', async () => {
        const numPlayers = 15;
        gameManager.characters = createMockCharacters(numPlayers);
        const coinsPerPlayer = 10;
        const sockets: any[] = [];
        const players: any[] = [];

        // Create 15 players in the same room, each with 10 coins
        for (let i = 0; i < numPlayers; i++) {
            const socket = {
                id: `player${i}-socket`,
                emit: jest.fn(),
                on: jest.fn(),
                broadcast: { emit: jest.fn() }
            };
            mockIo.sockets.sockets.set(socket.id, socket);
            gameManager.handleLogin(socket as any, `test-char-${i}`);

            sockets.push(socket);
            const player = gameManager.playerManager.getPlayer(socket.id)!;
            player.roomId = players[0]?.roomId || player.roomId;
            player.inventory.coins = coinsPerPlayer;
            players.push(player);
        }

        const roomId = players[0].roomId;
        const room = gameManager.roomManager.getRoom(roomId)!;
        room.coins = 0;

        const initialTotal = room.coins + players.reduce((sum, p) => sum + p.inventory.coins, 0);
        expect(initialTotal).toBe(150); // 15 * 10

        // All 15 players drop coins simultaneously
        await Promise.all(
            sockets.map(socket => gameManager.drop(socket))
        );

        // Verify coin conservation
        const finalTotal = room.coins + players.reduce((sum, p) => sum + p.inventory.coins, 0);
        expect(finalTotal).toBe(150); // NO LOSS!

        // All coins should be in the room
        expect(room.coins).toBe(150);
        players.forEach(p => expect(p.inventory.coins).toBe(0));
    }, 10000);

    /**
     * Stress test: 50 concurrent operations across multiple rooms
     * Verifies that per-room locking doesn't cause global contention
     */
    it('LOAD: 50 concurrent operations across 5 rooms - parallelism', async () => {
        const numPlayers = 50;
        gameManager.characters = createMockCharacters(numPlayers);
        const numRooms = 5;
        const playersPerRoom = numPlayers / numRooms;

        const sockets: any[] = [];
        const playersByRoom: any[][] = Array.from({ length: numRooms }, () => []);

        // Create 50 players distributed across 5 rooms (10 per room)
        const roomIds: string[] = [];
        for (let i = 0; i < numPlayers; i++) {
            const socket = {
                id: `player${i}-socket`,
                emit: jest.fn(),
                on: jest.fn(),
                broadcast: { emit: jest.fn() }
            };
            mockIo.sockets.sockets.set(socket.id, socket);
            gameManager.handleLogin(socket as any, `test-char-${i}`);

            const player = gameManager.playerManager.getPlayer(socket.id)!;

            // Assign to rooms
            const roomIndex = Math.floor(i / playersPerRoom);
            if (roomIndex >= roomIds.length) {
                // First player in this room group - use their starting room
                roomIds.push(player.roomId);
            } else {
                // Subsequent players - move to the room of the first player in this group
                player.roomId = roomIds[roomIndex];
            }

            player.inventory.coins = 10; // Each player has 10 coins

            sockets.push(socket);
            playersByRoom[roomIndex].push(player);
        }

        // Each room gets 10 coins
        roomIds.forEach(roomId => {
            const room = gameManager.roomManager.getRoom(roomId)!;
            room.coins = 10;
        });

        const startTime = Date.now();

        // All 50 players perform operations simultaneously
        // Half collect, half drop
        const operations = sockets.map((socket, i) => {
            return i % 2 === 0
                ? gameManager.collect(socket)
                : gameManager.drop(socket);
        });

        await Promise.all(operations);

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Verify operations completed quickly (< 1 second for 50 ops)
        expect(duration).toBeLessThan(1000);

        // Verify coin conservation per room
        roomIds.forEach((roomId, roomIndex) => {
            const room = gameManager.roomManager.getRoom(roomId)!;
            const roomPlayers = playersByRoom[roomIndex];
            const roomTotal = room.coins + roomPlayers.reduce((sum, p) => sum + p.inventory.coins, 0);

            // Initial: 10 room coins + (10 players * 10 coins each) = 110
            expect(roomTotal).toBe(110);
        });

        console.log(`✅ Load test completed: 50 concurrent operations in ${duration}ms`);
    }, 15000);
});
