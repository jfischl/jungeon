import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class FleeCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        const player = game.playerManager.getPlayer(socket.id)!;

        if (!player.inCombat) {
            socket.emit('message', "You're not in combat!");
            return;
        }

        // 70% chance to successfully flee
        const fleeChance = Math.random();

        if (fleeChance < 0.7) {
            // Successfully fled
            socket.emit('message', `You fled from combat with ${player.combatTarget}!`);
            game.worldService.broadcastToRoom(player.roomId, `${player.character.name} fled from combat!`, socket.id);

            player.inCombat = false;
            player.combatTarget = null;
            game.saveGame();
        } else {
            // Failed to flee - take damage
            const fleePenalty = Math.floor(Math.random() * 10) + 5;
            player.hp -= fleePenalty;

            socket.emit('message', `Failed to flee! You stumble and take ${fleePenalty} damage!`);
            socket.emit('message', `Your HP: ${player.hp}/${player.maxHp}`);
            game.sendStats(socket);

            if (player.hp <= 0) {
                game.combatManager.handleDeath(player, null, game);
            }

            game.saveGame();
        }
    }
}
