import { FleeCommand } from './FleeCommand';
import { DefendCommand } from './DefendCommand';
import { HealCommand } from './HealCommand';
import { GameManager } from '../game';
import { Server } from 'socket.io';
import { setupMockGameManager } from '../testFixtures';

describe('Combat Commands Integration Tests', () => {
    let gameManager: any;
    let fleeCommand: FleeCommand;
    let defendCommand: DefendCommand;
    let healCommand: HealCommand;
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
        fleeCommand = new FleeCommand();
        defendCommand = new DefendCommand();
        healCommand = new HealCommand();

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
        // Clean up ghost movement interval to prevent Jest warning
        gameManager.ghostManager.stopMovementLoop();
    });

    describe('FleeCommand', () => {
        it('should not allow flee when not in combat', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inCombat = false;

            fleeCommand.execute(mockSocket, '', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                "You're not in combat!"
            );
        });

        it('should successfully flee with 70% chance', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inCombat = true;
            player.combatTarget = 'Test Ghost';

            // Mock Math.random to return success (< 0.7)
            jest.spyOn(Math, 'random').mockReturnValue(0.5);

            fleeCommand.execute(mockSocket, '', gameManager);

            expect(player.inCombat).toBe(false);
            expect(player.combatTarget).toBe(null);
            expect(mockSocket).toHaveEmittedMessage(/You fled from combat/i, 'flee');
        });

        it('should fail to flee and take damage', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inCombat = true;
            player.combatTarget = 'Test Ghost';
            const initialHp = player.hp;

            // Mock Math.random to return failure (>= 0.7)
            jest.spyOn(Math, 'random').mockReturnValue(0.8);

            fleeCommand.execute(mockSocket, '', gameManager);

            expect(player.inCombat).toBe(true);
            expect(player.hp).toBeLessThan(initialHp);
            expect(mockSocket).toHaveEmittedMessage(/Failed to flee/i, 'flee-fail');
        });

        it('should handle death on failed flee', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inCombat = true;
            player.combatTarget = 'Test Ghost';
            player.hp = 5; // Low HP

            // Mock to fail and take high damage
            jest.spyOn(Math, 'random').mockReturnValue(0.9);

            fleeCommand.execute(mockSocket, '', gameManager);

            expect(player.hp).toBe(player.maxHp); // Respawned with full HP
            expect(player.roomId).toBe(gameManager.worldData.starting_room);
        });
    });

    describe('DefendCommand', () => {
        it('should not allow defend when not in combat', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inCombat = false;

            defendCommand.execute(mockSocket, '', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                "You're not in combat! Nothing to defend against."
            );
        });

        it('should set defending flag when in combat', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inCombat = true;
            player.combatTarget = 'Test Ghost';
            player.isDefending = false;

            defendCommand.execute(mockSocket, '', gameManager);

            expect(player.isDefending).toBe(true);
            expect(mockSocket).toHaveEmittedMessage(/raise your guard/i, 'defend');
        });
    });

    describe('HealCommand', () => {
        it('should not heal without potion', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inventory.items = [];

            healCommand.execute(mockSocket, '', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                "You don't have any healing potions!"
            );
        });

        it('should consume potion and restore HP', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.hp = 50;
            player.inventory.items = [{ name: 'Healing Potion', description: 'Restores HP' }];

            healCommand.execute(mockSocket, '', gameManager);

            expect(player.hp).toBe(80); // 50 + 30
            expect(player.inventory.items.length).toBe(0);
            expect(mockSocket).toHaveEmittedMessage(/restore 30 HP/i, 'heal');
        });

        it('should not exceed max HP', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.hp = player.maxHp - 10;
            player.inventory.items = [{ name: 'Healing Potion', description: '' }];

            healCommand.execute(mockSocket, '', gameManager);

            expect(player.hp).toBe(player.maxHp);
            expect(mockSocket).toHaveEmittedMessage(/restore 10 HP/i, 'heal');
        });

        it('should update inventory UI after healing', () => {
            const player = gameManager.playerManager.getPlayer(mockSocket.id);
            player.inventory.items = [{ name: 'Potion', description: '' }];

            healCommand.execute(mockSocket, '', gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'updateInventory',
                player.inventory
            );
        });
    });
});
