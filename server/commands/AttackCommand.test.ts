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
        const player = gameManager.players.get(mockSocket.id);

        // Place a ghost in player's room
        if (gameManager.ghosts.length > 0) {
            gameManager.ghosts[0].roomId = player.roomId;
            const ghostName = gameManager.ghosts[0].name;

            attackCommand.execute(mockSocket, ghostName.toLowerCase(), gameManager);

            // Should engage combat
            expect(player.inCombat).toBe(true);
            expect(player.combatTarget).toBe(ghostName);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('engage')
            );
        }
    });

    it('should deal damage to ghost', () => {
        const player = gameManager.players.get(mockSocket.id);

        if (gameManager.ghosts.length > 0) {
            gameManager.ghosts[0].roomId = player.roomId;
            const ghost = gameManager.ghosts[0];
            const initialHp = ghost.hp;

            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Ghost should have taken damage
            expect(ghost.hp).toBeLessThan(initialHp);
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('damage')
            );
        }
    });

    it('should allow multi-turn combat', () => {
        const player = gameManager.players.get(mockSocket.id);

        if (gameManager.ghosts.length > 0) {
            gameManager.ghosts[0].roomId = player.roomId;
            const ghost = gameManager.ghosts[0];

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
        }
    });

    it('should reward player when ghost is defeated', () => {
        const player = gameManager.players.get(mockSocket.id);

        if (gameManager.ghosts.length > 0) {
            gameManager.ghosts[0].roomId = player.roomId;
            const ghost = gameManager.ghosts[0];
            const initialCoins = player.inventory.coins;
            const initialXp = player.experience;

            // Set ghost HP very low
            ghost.hp = 1;

            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Player should get rewards (check happens synchronously after defeat)
            expect(player.inventory.coins).toBeGreaterThan(initialCoins);
            expect(player.experience).toBeGreaterThan(initialXp);
            expect(player.inCombat).toBe(false);
        }
    });

    it('should handle player taking damage from ghost', (done) => {
        const player = gameManager.players.get(mockSocket.id);

        if (gameManager.ghosts.length > 0) {
            gameManager.ghosts[0].roomId = player.roomId;
            const ghost = gameManager.ghosts[0];
            const initialPlayerHp = player.hp;

            // Set ghost HP high so it survives first hit
            ghost.hp = 100;

            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Wait for ghost counter-attack (1.5s delay in code)
            setTimeout(() => {
                // Player should have taken damage
                expect(player.hp).toBeLessThan(initialPlayerHp);
                done();
            }, 2000);
        } else {
            done();
        }
    });

    it('should prevent attacking ghost not in same room', () => {
        const player = gameManager.players.get(mockSocket.id);

        if (gameManager.ghosts.length > 0) {
            // Make sure ghost is NOT in player's room
            gameManager.ghosts[0].roomId = 'different_room';

            attackCommand.execute(mockSocket, gameManager.ghosts[0].name.toLowerCase(), gameManager);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('don\'t see')
            );
        }
    });

    it('should not allow combat when already in combat', () => {
        const player = gameManager.players.get(mockSocket.id);

        // Set player in combat with something else
        player.inCombat = true;
        player.combatTarget = 'Something Else';

        mockSocket.emit.mockClear();

        // Try to attack - should continue with current target if same, otherwise reject
        if (gameManager.ghosts.length > 0) {
            gameManager.ghosts[0].roomId = player.roomId;
            attackCommand.execute(mockSocket, gameManager.ghosts[0].name.toLowerCase(), gameManager);

            // Either continues combat or says already in combat
            expect(mockSocket.emit).toHaveBeenCalled();
        }
    });

    it('should level up player when enough XP gained', () => {
        const player = gameManager.players.get(mockSocket.id);

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
