import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';
import { CONFIG } from '../config';

export class HealCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        const player = game.players.get(socket.id)!;

        // Check for healing potion in inventory
        const potionIndex = player.inventory.items.findIndex(item =>
            item.name.toLowerCase().includes('potion') ||
            item.name.toLowerCase().includes('heal')
        );

        if (potionIndex === -1) {
            socket.emit('message', "You don't have any healing potions!");
            return;
        }

        // Remove potion from inventory
        const potion = player.inventory.items[potionIndex];
        player.inventory.items.splice(potionIndex, 1);

        // Heal player
        const healAmount = CONFIG.HEALING.POTION_HEAL_AMOUNT;
        const oldHp = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        const actualHeal = player.hp - oldHp;

        socket.emit('message', `You drink the ${potion.name} and restore ${actualHeal} HP!`);
        socket.emit('message', `HP: ${player.hp}/${player.maxHp}`);

        game.sendStats(socket);
        socket.emit('updateInventory', player.inventory);
        game.saveGame();
    }
}
