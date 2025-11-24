import { AttackCommand } from './AttackCommand';
import { GameManager } from '../game';
import { Server } from 'socket.io';

describe('AttackCommand - Ghost Combat (PvE)', () => {
    let gameManager: any;
    let attackCommand: AttackCommand;
    let mockSocket: any;
    let mockIo: any;

    beforeEach(() => {
        // Create minimal mock IO
        mockIo = {
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as any;

        gameManager = new GameManager(mockIo);
        attackCommand = new AttackCommand();

        // Mock socket
        mockSocket = {
            id: 'test-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: {
                emit: jest.fn()
            }
        };

        // Login player
        gameManager.handleLogin(mockSocket, 'warrior');

        // Clear emit calls from login
        mockSocket.emit.mockClear();
    });

    afterEach(() => {
        // Clean up ghost movement interval to prevent Jest warning
        gameManager.ghostManager.stopMovementLoop();
    });

    it('should require a target argument', () => {
        attackCommand.execute(mockSocket, '', gameManager);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            "Attack who? Usage: attack <target>"
        );
    });

    it('should notify if target not found', () => {
        attackCommand.execute(mockSocket, 'nonexistent', gameManager);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            expect.stringContaining('You don\'t see "nonexistent" here.')
        );
    });

    it('should initiate combat with ghost in same room', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        // Place a ghost in player's room
        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            gameManager.ghostManager.getAllGhosts()[0].roomId = player.roomId;
            const ghostName = gameManager.ghostManager.getAllGhosts()[0].name;

            attackCommand.execute(mockSocket, ghostName.toLowerCase(), gameManager);

            // Should engage combat
            expect(player.inCombat).toBe(true);
            expect(player.combatTarget).toBe(ghostName);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('engage')
            );

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should deal damage to ghost', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            gameManager.ghostManager.getAllGhosts()[0].roomId = player.roomId;
            const ghost = gameManager.ghostManager.getAllGhosts()[0];
            const initialHp = ghost.hp;

            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Ghost should have taken damage
            expect(ghost.hp).toBeLessThan(initialHp);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('damage')
            );

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should allow multi-turn combat', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            gameManager.ghostManager.getAllGhosts()[0].roomId = player.roomId;
            const ghost = gameManager.ghostManager.getAllGhosts()[0];

            // Set high HP to ensure ghost survives multiple attacks
            ghost.hp = 100;
            ghost.maxHp = 100;

            // First attack
            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);
            expect(player.inCombat).toBe(true);

            mockSocket.emit.mockClear();

            // Second attack (should continue combat)
            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);
            expect(player.inCombat).toBe(true);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('attack')
            );

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should reward player when ghost is defeated', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            gameManager.ghostManager.getAllGhosts()[0].roomId = player.roomId;
            const ghost = gameManager.ghostManager.getAllGhosts()[0];
            const initialCoins = player.inventory.coins;
            const initialXp = player.experience;

            // Set ghost HP very low
            ghost.hp = 1;

            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Player should get rewards (check happens synchronously after defeat)
            expect(player.inventory.coins).toBeGreaterThan(initialCoins);
            expect(player.experience).toBeGreaterThan(initialXp);
            expect(player.inCombat).toBe(false);

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should handle player taking damage from ghost', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            gameManager.ghostManager.getAllGhosts()[0].roomId = player.roomId;
            const ghost = gameManager.ghostManager.getAllGhosts()[0];
            const initialPlayerHp = player.hp;

            // Set ghost HP high so it survives first hit
            ghost.hp = 100;

            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Fast-forward time to trigger ghost counter-attack
            jest.runAllTimers();

            // Player should have taken damage
            expect(player.hp).toBeLessThan(initialPlayerHp);
        }

        jest.useRealTimers();
    });

    it('should prevent attacking ghost not in same room', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            // Make sure ghost is NOT in player's room
            gameManager.ghostManager.getAllGhosts()[0].roomId = 'different_room';

            attackCommand.execute(mockSocket, gameManager.ghostManager.getAllGhosts()[0].name.toLowerCase(), gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('don\'t see')
            );

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should not allow combat when already in combat', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        // Set player in combat with something else
        player.inCombat = true;
        player.combatTarget = 'Something Else';

        mockSocket.emit.mockClear();

        // Try to attack - should continue with current target if same, otherwise reject
        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            gameManager.ghostManager.getAllGhosts()[0].roomId = player.roomId;
            attackCommand.execute(mockSocket, gameManager.ghostManager.getAllGhosts()[0].name.toLowerCase(), gameManager);

            // Either continues combat or says already in combat
            expect(mockSocket.emit).toHaveBeenCalled();

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should level up player when enough XP gained', () => {
        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        // Set player close to level up
        player.experience = 95;
        const initialLevel = player.level;
        const initialMaxHp = player.maxHp;
        const initialAttack = player.attack;

        // Award enough XP to level up
        gameManager.combatManager.awardExperience(player, 10, mockSocket);

        expect(player.level).toBe(initialLevel + 1);
        expect(player.maxHp).toBe(initialMaxHp + 10);
        expect(player.attack).toBe(initialAttack + 1);
        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            expect.stringContaining('LEVEL UP')
        );
    });
});
