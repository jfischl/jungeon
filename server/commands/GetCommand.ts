import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class GetCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        if (args) {
            game.pickUpItem(socket, args);
        } else {
            game.collect(socket);
        }
    }
}
