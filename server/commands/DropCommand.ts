import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class DropCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        game.drop(socket);
    }
}
