import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class InventoryCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        game.inventory(socket);
    }
}
