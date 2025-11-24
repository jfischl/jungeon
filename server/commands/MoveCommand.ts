import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class MoveCommand implements Command {
    private direction?: string;

    constructor(direction?: string) {
        this.direction = direction;
    }

    execute(socket: Socket, args: string, game: GameManager): void {
        const dir = this.direction || args.toLowerCase();
        const validDirs = ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'];
        const fullDir = this.direction || this.expandDirection(dir);

        if (!validDirs.includes(dir) && !validDirs.includes(fullDir)) {
            socket.emit('message', "Invalid direction.");
            return;
        }

        // Use full direction name
        game.move(socket, fullDir);
    }

    private expandDirection(dir: string): string {
        if (dir === 'n') return 'north';
        if (dir === 's') return 'south';
        if (dir === 'e') return 'east';
        if (dir === 'w') return 'west';
        return dir;
    }
}
