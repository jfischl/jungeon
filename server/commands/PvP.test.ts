import { ChallengeCommand } from './ChallengeCommand';
import { AcceptCommand } from './AcceptCommand';
import { AttackCommand } from './AttackCommand';
import { GameManager } from '../game';
import { Server } from 'socket.io';
import { setupMockGameManager } from '../testFixtures';

describe('PvP System Integration Tests', () => {
    let gameManager: any;
    let challengeCommand: ChallengeCommand;
    let acceptCommand: AcceptCommand;
    let attackCommand: AttackCommand;
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
        challengeCommand = new ChallengeCommand();
        acceptCommand = new AcceptCommand();
        attackCommand = new AttackCommand();

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

        // Put them in same room (NOT starting room to avoid safe zone)
        const player1 = gameManager.playerManager.getPlayer(mockSocket1.id);
        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);
        player1.roomId = 'room-2';
        player2.roomId = 'room-2';

        // Ensure they are high enough level for PvP
        player1.level = 5;
        player2.level = 5;

        mockSocket1.emit.mockClear();
        mockSocket2.emit.mockClear();
    });

    afterEach(() => {
        // Clean up ghost movement interval to prevent Jest warning
        gameManager.ghostManager.stopMovementLoop();
    });

    it('should allow challenging another player', () => {
        jest.useFakeTimers();

        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);

        challengeCommand.execute(mockSocket1, player2.character.name.toLowerCase(), gameManager);

        const challengeId = `${mockSocket1.id}-${mockSocket2.id}`;
        expect(gameManager.pendingChallenges.has(challengeId)).toBe(true);
        expect(mockSocket1).toHaveEmittedMessage(/challenged/i, 'challenge-sent');
        expect(mockSocket2).toHaveEmittedMessage(/challenged you/i, 'challenge-received');

        jest.runAllTimers();
        jest.useRealTimers();
    });

    it('should not allow challenging newbie players', () => {
        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);
        player2.level = 1; // Newbie

        challengeCommand.execute(mockSocket1, player2.character.name.toLowerCase(), gameManager);

        expect(gameManager.pendingChallenges.size).toBe(0);
        expect(mockSocket1.emit).toHaveBeenCalledWith(
            'message',
            expect.stringContaining('newbie protection')
        );
    });

    it('should allow accepting a challenge', () => {
        const player1 = gameManager.playerManager.getPlayer(mockSocket1.id);
        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);

        // Setup challenge
        const challengeId = `${mockSocket1.id}-${mockSocket2.id}`;
        gameManager.pendingChallenges.set(challengeId, {
            challengerId: mockSocket1.id,
            targetId: mockSocket2.id,
            timestamp: Date.now()
        });

        acceptCommand.execute(mockSocket2, '', gameManager);

        expect(gameManager.pendingChallenges.size).toBe(0);
        expect(player1.inCombat).toBe(true);
        expect(player2.inCombat).toBe(true);
        expect(player1.combatTarget).toBe(player2.character.name);
        expect(player2.combatTarget).toBe(player1.character.name);

        expect(mockSocket2).toHaveEmittedMessage(/accepted the duel/i, 'duel-start');
    });

    it('should allow PvP combat after acceptance', () => {
        jest.useFakeTimers();

        const player1 = gameManager.playerManager.getPlayer(mockSocket1.id);
        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);

        // Setup active combat
        player1.inCombat = true;
        player1.combatTarget = player2.character.name;
        player2.inCombat = true;
        player2.combatTarget = player1.character.name;

        const initialHp2 = player2.hp;

        attackCommand.execute(mockSocket1, player2.character.name.toLowerCase(), gameManager);

        expect(player2.hp).toBeLessThan(initialHp2);
        expect(mockSocket1).toHaveEmittedMessage(/You attack/i);

        jest.runAllTimers();
        jest.useRealTimers();
    });

    it('should not allow PvP attack without challenge', () => {
        jest.useFakeTimers();

        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);

        attackCommand.execute(mockSocket1, player2.character.name.toLowerCase(), gameManager);

        expect(mockSocket1.emit).toHaveBeenCalledWith(
            'message',
            expect.stringContaining('must challenge')
        );

        jest.runAllTimers();
        jest.useRealTimers();
    });

    it('should transfer gold on PvP death', () => {
        jest.useFakeTimers();

        const player1 = gameManager.playerManager.getPlayer(mockSocket1.id);
        const player2 = gameManager.playerManager.getPlayer(mockSocket2.id);

        // Setup active combat
        player1.inCombat = true;
        player1.combatTarget = player2.character.name;
        player2.inCombat = true;
        player2.combatTarget = player1.character.name;

        player2.hp = 1; // One hit kill
        player2.inventory.coins = 100;
        const initialGold1 = player1.inventory.coins;

        attackCommand.execute(mockSocket1, player2.character.name.toLowerCase(), gameManager);

        // Player 2 dies
        expect(player2.hp).toBe(player2.maxHp); // Respawned
        expect(player2.inventory.coins).toBe(70); // Lost 30%
        expect(player1.inventory.coins).toBe(initialGold1 + 30); // Gained 30%

        expect(player1.inCombat).toBe(false);

        jest.runAllTimers();
        jest.useRealTimers();
    });
});
