import { Player } from '../shared/types';
import { Socket } from 'socket.io';
import { GameManager } from './game';
import { CONFIG } from './config';

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
        let actualDamage = Math.max(CONFIG.COMBAT.MINIMUM_DAMAGE, baseDamage + diceRoll);

        // Defending reduces damage
        if (isDefending) {
            actualDamage = Math.floor(actualDamage * CONFIG.COMBAT.DEFEND_DAMAGE_REDUCTION);
        }

        // Critical hit chance
        const critChance = Math.random();
        if (critChance < CONFIG.COMBAT.CRITICAL_HIT_CHANCE) {
            actualDamage *= CONFIG.COMBAT.CRITICAL_HIT_MULTIPLIER;
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

        // Calculate gold loss
        const goldLoss = Math.min(
            CONFIG.DEATH.MAX_GOLD_LOSS,
            Math.floor(deadPlayer.inventory.coins * CONFIG.DEATH.GOLD_LOSS_PERCENTAGE)
        );
        deadPlayer.inventory.coins -= goldLoss;

        // Transfer gold to killer if it was PvP
        if (killer) {
            killer.inventory.coins += goldLoss;
            killer.experience += CONFIG.DEATH.PVP_XP_REWARD;

            const killerSocket = Array.from(game.players.entries())
                .find(([_, p]) => p.id === killer.id)?.[0];

            if (killerSocket) {
                game.io.to(killerSocket).emit('message',
                    `You defeated ${deadPlayer.character.name}! +${goldLoss} coins, +${CONFIG.DEATH.PVP_XP_REWARD} XP`
                );
            }
        }

        // Reset player
        deadPlayer.hp = deadPlayer.maxHp;
        deadPlayer.roomId = game.worldData.starting_room;
        deadPlayer.inCombat = false;
        deadPlayer.combatTarget = null;
        deadPlayer.experience = Math.max(0, deadPlayer.experience - CONFIG.DEATH.XP_LOSS);

        // Notify player
        game.io.to(socket).emit('message',
            `You have been defeated! -${goldLoss} coins, -${CONFIG.DEATH.XP_LOSS} XP. Respawned at starting room.`
        );
        game.look(game.io.sockets.sockets.get(socket)!);
    }

    /**
     * Award XP and check for level up
     */
    awardExperience(player: Player, xp: number, socket: Socket): void {
        player.experience += xp;

        // Check for level up
        const newLevel = Math.floor(player.experience / CONFIG.LEVELING.XP_PER_LEVEL) + 1;
        if (newLevel > player.level) {
            player.level = newLevel;
            player.maxHp += CONFIG.LEVELING.HP_PER_LEVEL;
            player.hp = player.maxHp; // Full heal on level up
            player.attack += CONFIG.LEVELING.ATTACK_PER_LEVEL;
            player.defense += CONFIG.LEVELING.DEFENSE_PER_LEVEL;

            socket.emit('message',
                `🎉 LEVEL UP! You are now level ${player.level}! +${CONFIG.LEVELING.HP_PER_LEVEL} HP, +${CONFIG.LEVELING.ATTACK_PER_LEVEL} ATK, +${CONFIG.LEVELING.DEFENSE_PER_LEVEL} DEF`
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
