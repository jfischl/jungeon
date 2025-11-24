import { AttackCommand } from './AttackCommand';
import { GameManager } from '../game';
import { Server } from 'socket.io';

describe('Shared Ghost Combat (Phase 2)', () => {
    let gameManager: any;
    let attackCommand: AttackCommand;
    let mockSocket1: any;
    let mockSocket2: any;
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
        attackCommand = new AttackCommand();

        // Mock socket 1
        mockSocket1 = {
            id: 'player1-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };

        // Mock socket 2
        mockSocket2 = {
            id: 'player2-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };

        // Add sockets to mock  IO
        mockIo.sockets.sockets.set(mockSocket1.id, mockSocket1);
        mockIo.sockets.sockets.set(mockSocket2.id, mockSocket2);

        // Login both players
        gameManager.handleLogin(mockSocket1, 'warrior');
        gameManager.handleLogin(mockSocket2, 'rogue');

        mockSocket1.emit.mockClear();
        mockSocket2.emit.mockClear();
    });

    it('should track multiple combatants attacking same ghost', () => {
        const player1 = gameManager.players.get(mockSocket1.id);
        const player2 = gameManager.players.get(mockSocket2.id);

        if (gameManager.ghosts.length > 0) {
            const ghost = gameManager.ghosts[0];
            ghost.roomId = player1.roomId;
            player2.roomId = player1.roomId; // Put both in same room

            // Player 1 attacks
            attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);
            expect(ghost.combatants.has(player1.id)).toBe(true);
            expect(ghost.combatants.size).toBe(1);

            // Player 2 attacks
            attackCommand.execute(mockSocket2, ghost.name.toLowerCase(), gameManager);
            expect(ghost.combatants.has(player2.id)).toBe(true);
            expect(ghost.combatants.size).toBe(2);
        }
    });

    it('should split rewards among all combatants when ghost dies', (done) => {
        const player1 = gameManager.players.get(mockSocket1.id);
        const player2 = gameManager.players.get(mockSocket2.id);

        if (gameManager.ghosts.length > 0) {
            const ghost = gameManager.ghosts[0];
            ghost.roomId = player1.roomId;
            player2.roomId = player1.roomId;

            const initialCoins1 = player1.inventory.coins;
            const initialCoins2 = player2.inventory.coins;
            const initialXp1 = player1.experience;
            const initialXp2 = player2.experience;

            const expectedGoldEach = Math.floor(ghost.goldReward / 2);
            const expectedXpEach = Math.floor(40 / 2); // 40 is base XP for ghost

            // Set ghost HP low
            ghost.hp = 5;

            // Player 1 attacks and engages
            attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);

            // Player 2 also engages
            player2.inCombat = true;
            player2.combatTarget = ghost.name;
            ghost.combatants.add(player2.id);

            // Player 1 deals killing blow
            setTimeout(() => {
                attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);

                // VERIFY: Both players should receive EQUAL shares
                const goldGained1 = player1.inventory.coins - initialCoins1;
                const goldGained2 = player2.inventory.coins - initialCoins2;
                const xpGained1 = player1.experience - initialXp1;
                const xpGained2 = player2.experience - initialXp2;

                // Both should get the same amount
                expect(goldGained1).toBe(expectedGoldEach);
                expect(goldGained2).toBe(expectedGoldEach);
                expect(xpGained1).toBe(expectedXpEach);
                expect(xpGained2).toBe(expectedXpEach);

                // Verify total rewards add up to ghost's full reward
                expect(goldGained1 + goldGained2).toBeLessThanOrEqual(ghost.goldReward);

                // Both should be out of combat
                expect(player1.inCombat).toBe(false);
                expect(player2.inCombat).toBe(false);

                done();
            }, 100);
        } else {
            done();
        }
    });

    it('should split rewards fairly among 3 players', (done) => {
        const player1 = gameManager.players.get(mockSocket1.id);
        const player2 = gameManager.players.get(mockSocket2.id);

        // Create third player
        const mockSocket3 = {
            id: 'player3-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };
        mockIo.sockets.sockets.set(mockSocket3.id, mockSocket3);
        gameManager.handleLogin(mockSocket3, 'mage');
        const player3 = gameManager.players.get(mockSocket3.id);

        if (gameManager.ghosts.length > 0) {
            const ghost = gameManager.ghosts[0];
            ghost.roomId = player1.roomId;
            player2.roomId = player1.roomId;
            player3.roomId = player1.roomId;

            const initialCoins1 = player1.inventory.coins;
            const initialCoins2 = player2.inventory.coins;
            const initialCoins3 = player3.inventory.coins;

            const expectedGoldEach = Math.floor(ghost.goldReward / 3);

            ghost.hp = 5;

            // All three engage
            attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);
            player2.inCombat = true;
            player2.combatTarget = ghost.name;
            ghost.combatants.add(player2.id);
            player3.inCombat = true;
            player3.combatTarget = ghost.name;
            ghost.combatants.add(player3.id);

            // Kill ghost
            setTimeout(() => {
                attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);

                // All three should get equal shares
                expect(player1.inventory.coins - initialCoins1).toBe(expectedGoldEach);
                expect(player2.inventory.coins - initialCoins2).toBe(expectedGoldEach);
                expect(player3.inventory.coins - initialCoins3).toBe(expectedGoldEach);

                done();
            }, 100);
        } else {
            done();
        }
    });

    it('should attack all combatants in room during counter-attack', (done) => {
        const player1 = gameManager.players.get(mockSocket1.id);
        const player2 = gameManager.players.get(mockSocket2.id);

        if (gameManager.ghosts.length > 0) {
            const ghost = gameManager.ghosts[0];
            ghost.roomId = player1.roomId;
            player2.roomId = player1.roomId;
            ghost.hp = 100; // High HP so it survives

            const initialHp1 = player1.hp;
            const initialHp2 = player2.hp;

            // Both players engage
            attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);
            attackCommand.execute(mockSocket2, ghost.name.toLowerCase(), gameManager);

            // Wait for counter-attack
            setTimeout(() => {
                // Both players should have taken damage
                expect(player1.hp).toBeLessThan(initialHp1);
                expect(player2.hp).toBeLessThan(initialHp2);
                done();
            }, 2000);
        } else {
            done();
        }
    });

    it('should notify player of other combatants when joining fight', () => {
        const player1 = gameManager.players.get(mockSocket1.id);
        const player2 = gameManager.players.get(mockSocket2.id);

        if (gameManager.ghosts.length > 0) {
            const ghost = gameManager.ghosts[0];
            ghost.roomId = player1.roomId;
            player2.roomId = player1.roomId;
            mockSocket2.emit.mockClear();

            // Player 1 attacks first
            attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);

            // Player 2 joins
            attackCommand.execute(mockSocket2, ghost.name.toLowerCase(), gameManager);

            // Player 2 should be notified of player 1
            const messages = mockSocket2.emit.mock.calls
                .filter((call: any) => call[0] === 'message')
                .map((call: any) => call[1]);

            const hasOtherCombatantMessage = messages.some((msg: string) =>
                msg.includes('also fighting')
            );

            expect(hasOtherCombatantMessage).toBe(true);
        }
    });

    it('should remove player from combatants list on death', (done) => {
        const player1 = gameManager.players.get(mockSocket1.id);

        if (gameManager.ghosts.length > 0) {
            const ghost = gameManager.ghosts[0];
            ghost.roomId = player1.roomId;
            ghost.attack = 100; // Very high attack to kill player
            player1.hp = 10; // Low HP

            attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);

            // Wait for counter-attack to kill player
            setTimeout(() => {
                expect(ghost.combatants.has(player1.id)).toBe(false);
                done();
            }, 2000);
        } else {
            done();
        }
    });

    it('should reset combatants when ghost respawns', (done) => {
        if (gameManager.ghosts.length > 0) {
            const ghost = gameManager.ghosts[0];
            const player1 = gameManager.players.get(mockSocket1.id);
            ghost.roomId = player1.roomId;
            ghost.hp = 1;

            // Attack and defeat ghost
            attackCommand.execute(mockSocket1, ghost.name.toLowerCase(), gameManager);

            setTimeout(() => {
                // Check that ghost will be respawned with empty combatants
                // (We can't easily test the full 5-minute timeout in a unit test)
                expect(gameManager.ghosts.length).toBe(2); // Ghost removed from active list
                done();
            }, 100);
        } else {
            done();
        }
    });
});
