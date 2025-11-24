import { SayCommand } from './SayCommand';
import { EmoteCommand } from './EmoteCommand';
import { GameManager } from '../game';
import { Server } from 'socket.io';
import { setupMockGameManager } from '../testFixtures';

describe('Social Commands', () => {
    let gameManager: GameManager;
    let sayCommand: SayCommand;
    let emoteCommand: EmoteCommand;
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
        sayCommand = new SayCommand();
        emoteCommand = new EmoteCommand();

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
        mockIo.to.mockClear();
        mockIo.emit.mockClear();
    });

    afterEach(() => {
        gameManager.ghostManager.stopMovementLoop();
    });

    describe('SayCommand', () => {
        it('should broadcast message to all players in room', () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;

            sayCommand.execute(mockSocket1, 'Hello everyone!', gameManager);

            // Sender receives confirmation
            expect(mockSocket1.emit).toHaveBeenCalledWith(
                'message',
                'You say: "Hello everyone!"'
            );

            // Room broadcast called with other player's socket ID
            expect(mockIo.to).toHaveBeenCalledWith(player2.id);
            expect(mockIo.emit).toHaveBeenCalledWith(
                'message',
                `${player1.character.name} says: "Hello everyone!"`
            );
        });

        it('should sanitize message content', () => {
            sayCommand.execute(mockSocket1, 'Hello world', gameManager);

            // Sender receives confirmation
            expect(mockSocket1.emit).toHaveBeenCalledWith(
                'message',
                'You say: "Hello world"'
            );
        });

        it('should reject empty message', () => {
            sayCommand.execute(mockSocket1, '', gameManager);

            expect(mockSocket1.emit).toHaveBeenCalledWith(
                'error',
                'Invalid message (empty, too long, or contains prohibited content)'
            );

            // Should not broadcast
            expect(mockIo.to).not.toHaveBeenCalled();
        });

        it('should work with multiple players in same room', () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;

            sayCommand.execute(mockSocket1, 'Testing multiplayer', gameManager);

            // Sender gets confirmation
            expect(mockSocket1.emit).toHaveBeenCalledWith(
                'message',
                'You say: "Testing multiplayer"'
            );

            // Other player in room gets broadcast
            expect(mockIo.to).toHaveBeenCalledWith(player2.id);
        });
    });

    describe('EmoteCommand', () => {
        it('should broadcast emote to all players in room', () => {
            const player1 = gameManager.playerManager.getPlayer(mockSocket1.id)!;
            const player2 = gameManager.playerManager.getPlayer(mockSocket2.id)!;

            emoteCommand.execute(mockSocket1, 'waves at everyone', gameManager);

            // Sender receives confirmation
            expect(mockSocket1.emit).toHaveBeenCalledWith(
                'message',
                'You waves at everyone'
            );

            // Room broadcast called with other player's socket ID
            expect(mockIo.to).toHaveBeenCalledWith(player2.id);
            expect(mockIo.emit).toHaveBeenCalledWith(
                'message',
                `${player1.character.name} waves at everyone`
            );
        });

        it('should sanitize emote content', () => {
            emoteCommand.execute(mockSocket1, 'waves vigorously', gameManager);

            // Sender receives confirmation
            expect(mockSocket1.emit).toHaveBeenCalledWith(
                'message',
                'You waves vigorously'
            );
        });

        it('should reject empty emote', () => {
            emoteCommand.execute(mockSocket1, '', gameManager);

            expect(mockSocket1.emit).toHaveBeenCalledWith(
                'error',
                'Invalid action (empty, too long, or contains prohibited content)'
            );

            // Should not broadcast
            expect(mockIo.to).not.toHaveBeenCalled();
        });
    });
});
