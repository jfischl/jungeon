import { MoveCommand } from './MoveCommand';
import { GameManager } from '../game';
import { Socket } from 'socket.io';

describe('MoveCommand', () => {
    let mockSocket: Partial<Socket>;
    let mockGame: Partial<GameManager>;
    let moveCommand: MoveCommand;

    beforeEach(() => {
        mockSocket = {
            emit: jest.fn()
        };
        mockGame = {
            move: jest.fn()
        };
    });

    it('should use direction from constructor if provided', () => {
        moveCommand = new MoveCommand('north');
        moveCommand.execute(mockSocket as Socket, '', mockGame as GameManager);
        expect(mockGame.move).toHaveBeenCalledWith(mockSocket, 'north');
    });

    it('should use direction from args if not in constructor', () => {
        moveCommand = new MoveCommand();
        moveCommand.execute(mockSocket as Socket, 'north', mockGame as GameManager);
        expect(mockGame.move).toHaveBeenCalledWith(mockSocket, 'north');
    });

    it('should handle short aliases in args', () => {
        moveCommand = new MoveCommand();
        moveCommand.execute(mockSocket as Socket, 'n', mockGame as GameManager);
        expect(mockGame.move).toHaveBeenCalledWith(mockSocket, 'north');
    });

    it('should reject invalid directions in args', () => {
        moveCommand = new MoveCommand();
        moveCommand.execute(mockSocket as Socket, 'invalid', mockGame as GameManager);
        expect(mockSocket.emit).toHaveBeenCalledWith('message', 'Invalid direction.');
        expect(mockGame.move).not.toHaveBeenCalled();
    });
});
