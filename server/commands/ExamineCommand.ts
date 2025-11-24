import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class ExamineCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        if (!args || args.trim().length === 0) {
            socket.emit('message', "Examine what? Usage: examine <item>");
            return;
        }

        const player = game.players.get(socket.id)!;
        const itemName = args.toLowerCase().trim();

        // Check inventory first
        const invItem = player.inventory.items.find(i =>
            i.name.toLowerCase().includes(itemName) ||
            i.id.toLowerCase().includes(itemName)
        );

        if (invItem) {
            socket.emit('message', `${invItem.name}: ${invItem.description}`);
            return;
        }

        // Check current room
        const room = game.rooms[player.roomId];
        const roomItem = room.items.find(i =>
            i.name.toLowerCase().includes(itemName) ||
            i.id.toLowerCase().includes(itemName)
        );

        if (roomItem) {
            socket.emit('message', `${roomItem.name}: ${roomItem.description}`);
            return;
        }

        socket.emit('message', `You don't see any "${args}" here.`);
    }
}
