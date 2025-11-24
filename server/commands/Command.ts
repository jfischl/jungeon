import { Socket } from 'socket.io';
import { GameManager } from '../game';

export interface Command {
    execute(socket: Socket, args: string, game: GameManager): void;
}
