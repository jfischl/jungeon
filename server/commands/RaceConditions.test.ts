import { GetCommand } from './GetCommand';
import { DropCommand } from './DropCommand';
import { GameManager } from '../game';
import { setupMockGameManager } from '../testFixtures';

/**
 * Race Condition Prevention Tests (TDD Style)
 *
 * These tests verify that concurrent operations on shared room state
 * are properly serialized to prevent race conditions like item duplication,
 * coin duplication, and coin loss.
 *
 * Tests follow TDD principles:
 * - They attempt to trigger race conditions by executing commands concurrently
 * - They expect correct behavior (no duplication/loss)
 * - They FAIL if race conditions occur, PASS if prevented
 */
describe('Race Condition Prevention', () => {
    let gameManager: GameManager;
    let getCommand: GetCommand;
    let dropCommand: DropCommand;
    let mockSocket1: any;
    let mockSocket2: any;
    let mockIo: any;

    beforeEach(() => {
        mockIo = {
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: { sockets: new Map() }
        } as any;

        gameManager = new GameManager(mockIo);
        setupMockGameManager(gameManager);
        getCommand = new GetCommand();
        dropCommand = new DropCommand();

        // Create two players in the same room
        mockSocket1 = {
            id: 'player1-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };

        mockSocket2 = {
            id: 'player2-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };

        mockIo.sockets.sockets.set(mockSocket1.id, mockSocket1);
        mockIo.sockets.sockets.set(mockSocket2.id, mockSocket2);

        gameManager.connectionManager.handleLogin(mockSocket1, 'warrior');
        gameManager.connectionManager.handleLogin(mockSocket2, 'rogue');

        // Put both players in same room
        const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
        player2.roomId = player1.roomId;

        mockSocket1.emit.mockClear();
        mockSocket2.emit.mockClear();
    });

    afterEach(() => {
        gameManager.ghostManager.stopMovementLoop();
    });

    describe('Item Pickup Race Prevention', () => {
        it('should prevent item duplication when two players pick up same item concurrently', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // Add a single valuable item to the room
            room.items.push({
                id: 'legendary-sword',
                name: 'Legendary Sword',
                description: 'A one-of-a-kind legendary weapon'
            });

            const initialPlayer1Items = player1.inventory.items.length;
            const initialPlayer2Items = player2.inventory.items.length;

            // Execute both get commands concurrently (attempt race condition)
            await Promise.all([
                gameManager.pickUpItem(mockSocket1, 'legendary sword'),
                gameManager.pickUpItem(mockSocket2, 'legendary sword')
            ]);

            // Verify correct behavior: only ONE player got the item
            const player1GotItem = player1.inventory.items.some(i => i.id === 'legendary-sword');
            const player2GotItem = player2.inventory.items.some(i => i.id === 'legendary-sword');

            // Exactly one player should have gotten the item
            expect(player1GotItem || player2GotItem).toBe(true);
            expect(player1GotItem && player2GotItem).toBe(false); // NOT both!

            // Room should have no items left
            expect(room.items.length).toBe(0);

            // Total items in system should be conserved
            const totalItems = player1.inventory.items.length + player2.inventory.items.length;
            expect(totalItems).toBe(initialPlayer1Items + initialPlayer2Items + 1);
        });

        it('should handle multiple concurrent pickups of different items correctly', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // Add two different items
            room.items.push(
                { id: 'sword', name: 'Sword', description: 'A sharp blade' },
                { id: 'shield', name: 'Shield', description: 'A sturdy shield' }
            );

            // Both players pick up different items concurrently
            await Promise.all([
                gameManager.pickUpItem(mockSocket1, 'sword'),
                gameManager.pickUpItem(mockSocket2, 'shield')
            ]);

            // Both should have gotten their items
            expect(player1.inventory.items.some(i => i.id === 'sword')).toBe(true);
            expect(player2.inventory.items.some(i => i.id === 'shield')).toBe(true);

            // Room should be empty
            expect(room.items.length).toBe(0);
        });
    });

    describe('Coin Collection Race Prevention', () => {
        it('should prevent coin duplication when two players collect simultaneously', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // Set up: Room has 100 coins, both players have 0
            room.coins = 100;
            player1.inventory.coins = 0;
            player2.inventory.coins = 0;

            const initialTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(initialTotal).toBe(100);

            // Execute collect commands concurrently (attempt race condition)
            await Promise.all([
                gameManager.collect(mockSocket1),
                gameManager.collect(mockSocket2)
            ]);

            // Verify coin conservation: total should still be 100
            const finalTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(finalTotal).toBe(100); // NO DUPLICATION!

            // Room should have 0 coins
            expect(room.coins).toBe(0);

            // Exactly one player should have gotten all coins
            const player1Got = player1.inventory.coins === 100;
            const player2Got = player2.inventory.coins === 100;
            expect(player1Got || player2Got).toBe(true);
            expect(player1Got && player2Got).toBe(false); // NOT both!
        });

        it('should handle multiple concurrent coin collections across multiple rooms', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;

            // Put players in different rooms - ensure they're actually different
            const room1 = gameManager.roomManager.getRoom(player1.roomId)!;
            const allRooms = gameManager.roomManager.getAllRooms();
            const room2Id = Object.keys(allRooms).find((id: string) => id !== player1.roomId)!;
            player2.roomId = room2Id;
            const room2 = gameManager.roomManager.getRoom(room2Id)!;

            // Verify players are in different rooms
            expect(room1.id).not.toBe(room2.id);

            // Each room has coins
            room1.coins = 50;
            room2.coins = 75;
            player1.inventory.coins = 0;
            player2.inventory.coins = 0;

            // Collect concurrently from different rooms
            await Promise.all([
                gameManager.collect(mockSocket1),
                gameManager.collect(mockSocket2)
            ]);

            // Each player should have collected their room's coins
            expect(player1.inventory.coins).toBe(50);
            expect(player2.inventory.coins).toBe(75);
            expect(room1.coins).toBe(0);
            expect(room2.coins).toBe(0);
        });
    });

    describe('Coin Drop Race Prevention', () => {
        it('should prevent coin loss when two players drop simultaneously', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // Set up: Room has 0 coins, players have coins to drop
            room.coins = 0;
            player1.inventory.coins = 50;
            player2.inventory.coins = 30;

            const initialTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(initialTotal).toBe(80);

            // Execute drop commands concurrently (attempt race condition)
            await Promise.all([
                gameManager.drop(mockSocket1),
                gameManager.drop(mockSocket2)
            ]);

            // Verify coin conservation: total should still be 80
            const finalTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(finalTotal).toBe(80); // NO LOSS!

            // Both players should have 0 coins
            expect(player1.inventory.coins).toBe(0);
            expect(player2.inventory.coins).toBe(0);

            // Room should have all 80 coins
            expect(room.coins).toBe(80);
        });

        it('should handle multiple concurrent drops and collections', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // Set up: Room has 20 coins, both players have coins
            room.coins = 20;
            player1.inventory.coins = 50;
            player2.inventory.coins = 30;

            const initialTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(initialTotal).toBe(100);

            // Player 1 drops, Player 2 collects - concurrently!
            await Promise.all([
                gameManager.drop(mockSocket1),
                gameManager.collect(mockSocket2)
            ]);

            // Verify coin conservation
            const finalTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(finalTotal).toBe(100); // NO DUPLICATION OR LOSS!

            expect(player1.inventory.coins).toBe(0); // Dropped all coins
        });
    });

    describe('Real-world Scenarios', () => {
        it('should handle players racing to grab dropped loot', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // A player dies and drops a rare item
            room.items.push({
                id: 'rare-gem',
                name: 'Rare Gem',
                description: 'Worth 1000 gold'
            });

            // Both players spam "get gem" as fast as possible
            await Promise.all([
                gameManager.pickUpItem(mockSocket1, 'gem'),
                gameManager.pickUpItem(mockSocket2, 'gem'),
                gameManager.pickUpItem(mockSocket1, 'gem'),
                gameManager.pickUpItem(mockSocket2, 'gem')
            ]);

            // Only one player should have the gem
            const player1Has = player1.inventory.items.some(i => i.id === 'rare-gem');
            const player2Has = player2.inventory.items.some(i => i.id === 'rare-gem');

            expect(player1Has || player2Has).toBe(true);
            expect(player1Has && player2Has).toBe(false); // NOT both!
            expect(room.items.length).toBe(0);
        });

        it('should prevent coin duplication exploit', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // Player 1 drops 1000 coins
            player1.inventory.coins = 1000;
            player2.inventory.coins = 0; // Ensure player2 starts with 0 coins
            room.coins = 0;

            const initialTotal = 1000;

            // Player 1 drops, both players spam collect simultaneously
            await Promise.all([
                gameManager.drop(mockSocket1),
                gameManager.collect(mockSocket1),
                gameManager.collect(mockSocket2),
                gameManager.collect(mockSocket1),
                gameManager.collect(mockSocket2)
            ]);

            // Verify no duplication occurred
            const finalTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(finalTotal).toBe(initialTotal); // NO DUPLICATION!
        });

        it('should handle extreme concurrency (50 simultaneous operations)', async () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;
            const room = gameManager.roomManager.getRoom(player1.roomId)!;

            // Set up: Room has 1000 coins
            room.coins = 1000;
            player1.inventory.coins = 0;
            player2.inventory.coins = 0;

            const initialTotal = 1000;

            // Create 50 concurrent collect operations
            const operations: Promise<void>[] = [];
            for (let i = 0; i < 25; i++) {
                operations.push(gameManager.collect(mockSocket1));
                operations.push(gameManager.collect(mockSocket2));
            }

            // Execute all 50 operations concurrently
            await Promise.all(operations);

            // Verify coin conservation
            const finalTotal = room.coins + player1.inventory.coins + player2.inventory.coins;
            expect(finalTotal).toBe(initialTotal); // NO DUPLICATION!
            expect(room.coins).toBe(0); // Room should be empty
        });
    });
});
