import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';
import { emitMessage } from '../utils/socketEmit';

export class DefendCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        const player = game.playerManager.getPlayer(socket.id)!;

        if (!player.inCombat) {
            socket.emit('message', "You're not in combat! Nothing to defend against.");
            return;
        }

        emitMessage(socket, `You raise your guard, bracing for ${player.combatTarget}'s attack...`, 'defend');
        socket.emit('message', "Your next incoming attack will deal 50% less damage!");

        // Set a temporary flag that the next damage calculation should use
        // For now, just inform the player - full implementation would need combat state tracking
        player.isDefending = true;

        game.saveGame();
    }
}
