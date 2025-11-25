import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';
import { emitMessage } from '../utils/socketEmit';

export class UnlockCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        const direction = args.toLowerCase().trim();
        const validDirs = ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'];

        // Normalize short directions
        let fullDir = direction;
        if (direction === 'n') fullDir = 'north';
        if (direction === 's') fullDir = 'south';
        if (direction === 'e') fullDir = 'east';
        if (direction === 'w') fullDir = 'west';

        if (!validDirs.includes(direction)) {
            socket.emit('message', "Unlock which direction? (north, south, east, west)");
            return;
        }

        const player = game.playerManager.getPlayer(socket.id)!;
        const room = game.roomManager.getRoom(player.roomId)!;

        if (!room.exits[fullDir]) {
            socket.emit('message', `There is no exit to the ${fullDir}.`);
            return;
        }

        if (!room.locks || !room.locks[fullDir]) {
            socket.emit('message', `The ${fullDir} exit is not locked.`);
            return;
        }

        const keyId = room.locks[fullDir];
        const key = player.inventory.items.find(i => i.id === keyId);

        if (!key) {
            emitMessage(socket, `The ${fullDir} door is locked. You don't have the right key.`, 'door-locked');
            return;
        }

        // Unlock both sides
        delete room.locks[fullDir];
        const nextRoom = game.roomManager.getRoom(room.exits[fullDir])!;
        const oppDir = game.getOppositeDirection(fullDir);
        if (nextRoom.locks && nextRoom.locks[oppDir]) {
            delete nextRoom.locks[oppDir];
        }

        emitMessage(socket, `You unlock the ${fullDir} door with the ${key.name}.`, 'unlock');
        game.saveGame();
    }
}
