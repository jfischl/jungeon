import { HelpCommand } from './HelpCommand';
import { GameManager } from '../game';

describe('HelpCommand', () => {
    let helpCommand: HelpCommand;
    let gameManager: GameManager;
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
        helpCommand = new HelpCommand();

        mockSocket = {
            id: 'test-socket',
            emit: jest.fn(),
            on: jest.fn()
        };

        mockIo.sockets.sockets.set(mockSocket.id, mockSocket);
    });

    afterEach(() => {
        gameManager.ghostManager.stopMovementLoop();
    });

    it('should display help text with all command categories', () => {
        helpCommand.execute(mockSocket, '', gameManager);

        expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.any(String));

        const helpText = mockSocket.emit.mock.calls[0][1];

        // Check for main sections
        expect(helpText).toContain('MOVEMENT');
        expect(helpText).toContain('ITEMS');
        expect(helpText).toContain('COMBAT');
        expect(helpText).toContain('PVP');
        expect(helpText).toContain('SOCIAL');

        // Check for specific commands
        expect(helpText).toContain('n, s, e, w');
        expect(helpText).toContain('look');
        expect(helpText).toContain('attack');
        expect(helpText).toContain('challenge');
        expect(helpText).toContain('say');
    });

    it('should be registered as help command', () => {
        const commands = gameManager.commandRegistry.getRegisteredCommands();
        expect(commands).toContain('help');
    });

    it('should be registered as ? alias', () => {
        const commands = gameManager.commandRegistry.getRegisteredCommands();
        expect(commands).toContain('?');
    });
});
