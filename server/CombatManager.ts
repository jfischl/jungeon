import { Player } from '../shared/types';
import { Socket } from 'socket.io';
import { GameManager } from './game';

export class CombatManager {
    private game: GameManager;

    constructor(game: GameManager) {
        this.game = game;
    }

    /**
     * Calculate damage dealt from attacker to defender
     */
    calculateDamage(attacker: Player, defender: Player, isDefending: boolean = false): number {
        const baseDamage = attacker.attack - (defender.defense / 2);
        const diceRoll = Math.floor(Math.random() * 6) + 1; // 1-6
        let actualDamage = Math.max(1, baseDamage + diceRoll); // Minimum 1 damage

        // Defending reduces damage by 50%
        if (isDefending) {
            actualDamage = Math.floor(actualDamage / 2);
        }

        // 10% critical hit chance (double damage)
        const critChance = Math.random();
        if (critChance < 0.1) {
            actualDamage *= 2;
            return actualDamage; // Return early to indicate crit
        }

        return actualDamage;
    }

    /**
     * Apply damage to a player
     */
    applyDamage(target: Player, damage: number): void {
        target.hp = Math.max(0, target.hp - damage);
    }

    /**
     * Check if player is dead
     */
    isDead(player: Player): boolean {
        return player.hp <= 0;
    }

    /**
     * Handle player death
     */
    handleDeath(deadPlayer: Player, killer: Player | null, game: GameManager): void {
        const socket = Array.from(game.players.entries())
            .find(([_, p]) => p.id === deadPlayer.id)?.[0];

        if (!socket) return;

        // Calculate gold loss (30% or max 50 coins)
        const goldLoss = Math.min(50, Math.floor(deadPlayer.inventory.coins * 0.3));
        deadPlayer.inventory.coins -= goldLoss;

        // Transfer gold to killer if it was PvP
        if (killer) {
            killer.inventory.coins += goldLoss;
            killer.experience += 50;

            const killerSocket = Array.from(game.players.entries())
                .find(([_, p]) => p.id === killer.id)?.[0];

            if (killerSocket) {
                game.io.to(killerSocket).emit('message',
                    `You defeated ${deadPlayer.character.name}! +${goldLoss} coins, +50 XP`
                );
            }
        }

        // Reset player
        deadPlayer.hp = deadPlayer.maxHp;
        deadPlayer.roomId = game.worldData.starting_room;
        deadPlayer.inCombat = false;
        deadPlayer.combatTarget = null;
        deadPlayer.experience = Math.max(0, deadPlayer.experience - 25);

        // Notify player
        game.io.to(socket).emit('message',
            `You have been defeated! -${goldLoss} coins, -25 XP. Respawned at starting room.`
        );
        game.look(game.io.sockets.sockets.get(socket)!);
    }

    /**
     * Award XP and check for level up
     */
    awardExperience(player: Player, xp: number, socket: Socket): void {
        player.experience += xp;

        // Check for level up (100 XP per level)
        const newLevel = Math.floor(player.experience / 100) + 1;
        if (newLevel > player.level) {
            player.level = newLevel;
            player.maxHp += 10;
            player.hp = player.maxHp; // Full heal on level up
            player.attack += 1;
            player.defense += 1;

            socket.emit('message',
                `🎉 LEVEL UP! You are now level ${player.level}! +10 HP, +1 ATK, +1 DEF`
            );
        }
    }

    /**
     * End combat for a player
     */
    endCombat(player: Player): void {
        player.inCombat = false;
        player.combatTarget = null;
    }
}
