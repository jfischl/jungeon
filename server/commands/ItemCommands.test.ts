import { GetCommand } from './GetCommand';
import { DropCommand } from './DropCommand';
import { ExamineCommand } from './ExamineCommand';
import { UnlockCommand } from './UnlockCommand';
import { GameManager } from '../game';
import { Server } from 'socket.io';
import { setupMockGameManager } from '../testFixtures';

describe('Item Commands', () => {
    let gameManager: GameManager;
    let getCommand: GetCommand;
    let dropCommand: DropCommand;
    let examineCommand: ExamineCommand;
    let unlockCommand: UnlockCommand;
    let mockSocket: any;
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
        examineCommand = new ExamineCommand();
        unlockCommand = new UnlockCommand();

        mockSocket = {
            id: 'test-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };

        mockIo.sockets.sockets.set(mockSocket.id, mockSocket);
        gameManager.connectionManager.handleLogin(mockSocket, 'warrior');
        mockSocket.emit.mockClear();
    });

    afterEach(() => {
        gameManager.ghostManager.stopMovementLoop();
    });

    describe('GetCommand', () => {
        it('should pick up items from room', async () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            const room = gameManager.roomManager.getRoom(player.roomId)!;

            // Add an item to the room
            room.items.push({ id: 'magic-orb', name: 'Magic Orb', description: 'A glowing orb' });

            const itemName = room.items[0].name;
            await gameManager.pickUpItem(mockSocket, itemName);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('picked up')
            );
        });

        it('should pick up coins from room', async () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            const room = gameManager.roomManager.getRoom(player.roomId)!;

            // Add coins to the room
            room.coins = 10;
            const initialCoins = player.inventory.coins;

            await gameManager.collect(mockSocket);

            const finalCoins = player.inventory.coins;
            expect(finalCoins).toBeGreaterThan(initialCoins);
        });

        it('should handle invalid item', async () => {
            await gameManager.pickUpItem(mockSocket, 'nonexistent-item');

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining("don't see")
            );
        });
    });

    describe('DropCommand', () => {
        it('should drop coins in room', async () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            player.inventory.coins = 100;

            await gameManager.drop(mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('dropped')
            );
        });

        it('should handle no coins to drop', async () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            player.inventory.coins = 0;

            await gameManager.drop(mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('no coins')
            );
        });
    });

    describe('ExamineCommand', () => {
        it('should examine items in inventory', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            player.inventory.items.push({
                id: 'magic-orb',
                name: 'Magic Orb',
                description: 'A shiny glowing orb'
            });

            examineCommand.execute(mockSocket, 'magic orb', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                'Magic Orb: A shiny glowing orb'
            );
        });

        it('should examine items in room', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            const room = gameManager.roomManager.getRoom(player.roomId)!;

            room.items.push({
                id: 'room-item',
                name: 'Room Item',
                description: 'An item in the room'
            });

            examineCommand.execute(mockSocket, 'room item', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                'Room Item: An item in the room'
            );
        });

        it('should handle examining nonexistent item', () => {
            examineCommand.execute(mockSocket, 'fake item', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining("don't see")
            );
        });

        it('should require item argument', () => {
            examineCommand.execute(mockSocket, '', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('Examine what')
            );
        });
    });

    describe('UnlockCommand', () => {
        it('should unlock door with correct key', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            const room = gameManager.roomManager.getRoom(player.roomId)!;

            // Find a locked door or create one
            const direction = Object.keys(room.exits)[0] as 'north' | 'south' | 'east' | 'west';
            if (direction && !room.locks) {
                room.locks = {};
            }
            if (direction && room.locks) {
                room.locks[direction] = 'test-key-id';
                player.inventory.items.push({
                    id: 'test-key-id',
                    name: 'Test Key',
                    description: 'A key'
                });

                unlockCommand.execute(mockSocket, direction, gameManager);

                expect(mockSocket.emit).toHaveBeenCalledWith(
                    'message',
                    expect.stringContaining('unlock')
                );
                expect(room.locks[direction]).toBeUndefined();
            }
        });

        it('should handle missing key', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            const room = gameManager.roomManager.getRoom(player.roomId)!;

            const direction = Object.keys(room.exits)[0] as 'north' | 'south' | 'east' | 'west';
            if (direction) {
                if (!room.locks) room.locks = {};
                room.locks[direction] = 'missing-key-id';

                unlockCommand.execute(mockSocket, direction, gameManager);

                expect(mockSocket.emit).toHaveBeenCalledWith(
                    'message',
                    expect.stringContaining("don't have the right key")
                );
            }
        });

        it('should handle already unlocked door', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id)!;
            const room = gameManager.roomManager.getRoom(player.roomId)!;

            const direction = Object.keys(room.exits)[0] as 'north' | 'south' | 'east' | 'west';
            if (direction) {
                // Ensure door is not locked
                if (room.locks) {
                    delete room.locks[direction];
                }

                unlockCommand.execute(mockSocket, direction, gameManager);

                expect(mockSocket.emit).toHaveBeenCalledWith(
                    'message',
                    expect.stringContaining('not locked')
                );
            }
        });
    });
});
