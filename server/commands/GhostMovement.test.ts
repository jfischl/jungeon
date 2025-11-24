import { AttackCommand } from './AttackCommand';
import { GameManager } from '../game';
import { Server } from 'socket.io';

describe('Ghost Movement Edge Cases', () => {
    let gameManager: any;
    let attackCommand: AttackCommand;
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
        attackCommand = new AttackCommand();

        mockSocket = {
            id: 'test-socket',
            emit: jest.fn(),
            on: jest.fn(),
            broadcast: { emit: jest.fn() }
        };

        mockIo.sockets.sockets.set(mockSocket.id, mockSocket);
        gameManager.handleLogin(mockSocket, 'warrior');
        mockSocket.emit.mockClear();
    });

    afterEach(() => {
        // Clean up ghost movement interval to prevent Jest warning
        gameManager.ghostManager.stopMovementLoop();
    });

    it('should allow re-attacking ghost after it moves to different room', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            const ghost = gameManager.ghostManager.getAllGhosts()[0];
            ghost.roomId = player.roomId;

            // Player attacks ghost
            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);
            expect(player.inCombat).toBe(true);
            expect(player.combatTarget).toBe(ghost.name);

            // Ghost moves to different room (simulating wandering)
            const allRooms = gameManager.roomManager.getAllRooms();
            const newRoomId = allRooms.length > 1 ? allRooms[1].id : 'different_room';
            ghost.roomId = newRoomId;

            // Player's combat state should be stale now since ghost left
            // Player moves to follow ghost
            player.roomId = newRoomId;

            mockSocket.emit.mockClear();

            // Player should be able to attack ghost again
            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Should not get "already in combat" error
            const messages = mockSocket.emit.mock.calls
                .filter((call: any) => call[0] === 'message')
                .map((call: any) => call[1]);

            const hasAlreadyInCombatError = messages.some((msg: string) =>
                msg.includes("already in combat")
            );

            expect(hasAlreadyInCombatError).toBe(false);

            // Should successfully engage
            const hasEngageMessage = messages.some((msg: string) =>
                msg.includes("engage") || msg.includes("attack")
            );

            expect(hasEngageMessage).toBe(true);

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should clean up combat state when ghost leaves room', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            const ghost = gameManager.ghostManager.getAllGhosts()[0];
            ghost.roomId = player.roomId;
            ghost.combatants.add(player.id);

            player.inCombat = true;
            player.combatTarget = ghost.name;

            // Ghost moves away
            ghost.roomId = 'different_room';

            // When player tries to attack, should detect ghost is not in room
            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            const messages = mockSocket.emit.mock.calls
                .filter((call: any) => call[0] === 'message')
                .map((call: any) => call[1]);

            const hasNotFoundMessage = messages.some((msg: string) =>
                msg.includes("don't see")
            );

            expect(hasNotFoundMessage).toBe(true);

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });

    it('should reset player combat state when ghost is no longer in combatants list', () => {
        jest.useFakeTimers();

        const player = gameManager.playerManager.getPlayer(mockSocket.id);

        if (gameManager.ghostManager.getAllGhosts().length > 0) {
            const ghost = gameManager.ghostManager.getAllGhosts()[0];
            ghost.roomId = player.roomId;

            // Set player in combat but NOT in ghost's combatants (stale state)
            player.inCombat = true;
            player.combatTarget = ghost.name;

            // Attacking should work despite stale combat state
            attackCommand.execute(mockSocket, ghost.name.toLowerCase(), gameManager);

            // Should now be properly added to combatants
            expect(ghost.combatants.has(player.id)).toBe(true);

            jest.runAllTimers();
        }

        jest.useRealTimers();
    });
});
