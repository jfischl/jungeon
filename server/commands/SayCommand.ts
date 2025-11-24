import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class SayCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        game.say(socket, args);
    }
}
