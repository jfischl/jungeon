import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class LookCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        game.look(socket);
    }
}
