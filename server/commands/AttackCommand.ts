import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';
import { CONFIG } from '../config';
import { Player } from '../../shared/types';
import { Ghost } from '../managers/GhostManager';
import { emitMessage, emitSound } from '../utils/socketEmit';

export class AttackCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        const player = game.playerManager.getPlayer(socket.id)!;

        if (!args || args.trim().length === 0) {
            socket.emit('message', "Attack who? Usage: attack <target>");
            return;
        }

        const targetName = args.toLowerCase().trim();

        // Check for ghost targets
        const ghost = game.ghostManager.getAllGhosts().find(g =>
            g.roomId === player.roomId &&
            g.name.toLowerCase().includes(targetName)
        );

        if (ghost) {
            this.initiateGhostCombat(socket, player, ghost, game);
            return;
        }

        // Check for player targets
        const targetPlayer = game.playerManager.getAllPlayers().find(p =>
            p.roomId === player.roomId &&
            p.id !== player.id &&
            p.character.name.toLowerCase().includes(targetName)
        );

        if (targetPlayer) {
            this.initiatePvPCombat(socket, player, targetPlayer, game);
            return;
        }

        socket.emit('message', `You don't see "${args}" here.`);
    }

    private initiateGhostCombat(socket: Socket, player: Player, ghost: Ghost, game: GameManager): void {
        // Add player to ghost's combatants if not already there
        if (!ghost.combatants.has(player.id)) {
            ghost.combatants.add(player.id);
        }

        // If already in combat with this ghost, continue attacking
        if (player.inCombat && player.combatTarget === ghost.name) {
            // Player attacks
            const damage = game.combatManager.calculateDamage(player, {
                attack: 0,
                defense: ghost.defense,
                hp: ghost.hp,
                maxHp: ghost.maxHp,
                level: 1,
                experience: 0,
                inCombat: false,
                combatTarget: null,
                id: '',
                character: { id: '', name: '', description: '', baseHp: 0, baseAttack: 0, baseDefense: 0 },
                roomId: '',
                inventory: { coins: 0, items: [] },
                exploredRooms: new Set(),
                isDefending: false
            });

            ghost.hp -= damage;
            const isCrit = damage > (player.attack - ghost.defense / 2 + 6); // Rough crit detection

            emitMessage(socket, `You attack ${ghost.name} for ${damage} damage!${isCrit ? ' CRITICAL HIT!' : ''}`, isCrit ? 'attack-critical' : 'attack');
            socket.emit('message', `${ghost.name}: ${ghost.hp}/${ghost.maxHp} HP`);
            game.worldService.broadcastToRoom(player.roomId, `${player.character.name} attacks ${ghost.name}!`, socket.id);

            if (ghost.hp <= 0) {
                // Ghost defeated - distribute rewards to all combatants
                const combatantIds = Array.from(ghost.combatants);
                const goldPerPlayer = Math.floor(ghost.goldReward / combatantIds.length);
                const xpPerPlayer = Math.floor(40 / combatantIds.length);

                // Reward all participants
                combatantIds.forEach(playerId => {
                    const participant = game.playerManager.getPlayer(playerId as string);
                    if (participant) {
                        participant.inventory.coins += goldPerPlayer;

                        // Find socket for this participant
                        const participantSocket = game.io.sockets?.sockets
                            ? Array.from(game.io.sockets.sockets.values()).find(s => s.id === playerId)
                            : undefined;

                        // Award XP even if socket not found (for tests)
                        if (participantSocket) {
                            game.combatManager.awardExperience(participant, xpPerPlayer, participantSocket);
                            emitMessage(participantSocket, `💀 ${ghost.name} was defeated! You receive ${goldPerPlayer} coins and ${xpPerPlayer} XP!`, 'victory');
                            participantSocket.emit('updateInventory', participant.inventory);
                            game.sendStats(participantSocket);
                        } else {
                            // If socket not found (e.g., in tests), still award XP
                            participant.experience += xpPerPlayer;
                        }

                        // End combat for this participant
                        participant.inCombat = false;
                        participant.combatTarget = null;
                    }
                });

                game.worldService.broadcastToRoom(player.roomId, `${ghost.name} has been vanquished!`, '');

                // Remove ghost and respawn elsewhere later
                game.ghostManager.removeGhost(ghost);
                game.ghostManager.scheduleRespawn(ghost);

                game.saveGame();
                return;
            }

            // Ghost counter-attacks ALL combatants in room
            setTimeout(() => {
                if (ghost.hp > 0) {
                    const activeCombatants = Array.from(ghost.combatants)
                        .map(id => game.playerManager.getPlayer(id as string))
                        .filter(p => p && p.roomId === ghost.roomId && p.inCombat);

                    activeCombatants.forEach(combatant => {
                        if (!combatant) return;

                        let ghostDamage = Math.floor(Math.random() * 8) + ghost.attack;

                        // Check if player was defending
                        if (combatant.isDefending) {
                            ghostDamage = Math.floor(ghostDamage / 2);
                            combatant.isDefending = false;
                        }

                        combatant.hp -= ghostDamage;

                        const combatantSocket = game.io.sockets?.sockets
                            ? Array.from(game.io.sockets.sockets.values()).find(s => s.id === combatant.id)
                            : undefined;

                        if (combatantSocket) {
                            if (combatant.isDefending) {
                                combatantSocket.emit('message', `Your defense reduces the damage!`);
                            }
                            emitMessage(combatantSocket, `${ghost.name} strikes you for ${ghostDamage} damage!`, 'damage-taken');
                            combatantSocket.emit('message', `Your HP: ${combatant.hp}/${combatant.maxHp}`);
                            game.sendStats(combatantSocket);

                            if (combatant.hp <= 0) {
                                ghost.combatants.delete(combatant.id); // Remove from combatants
                                game.combatManager.handleDeath(combatant, null, game);
                            } else {
                                combatantSocket.emit('message', `Type 'attack ${ghost.name.split(' ')[0].toLowerCase()}' to continue fighting, 'defend' to brace, or 'flee' to escape!`);
                            }
                        }
                    });

                    game.saveGame();
                }
            }, 1500);

        } else {
            // Initiate new combat
            player.inCombat = true;
            player.combatTarget = ghost.name;

            socket.emit('message', `⚔️  You engage ${ghost.name} in combat!`);

            // Show other combatants if any
            const otherCombatants = Array.from(ghost.combatants)
                .filter(id => id !== player.id)
                .map(id => game.playerManager.getPlayer(id as string)?.character.name)
                .filter(name => name);

            if (otherCombatants.length > 0) {
                socket.emit('message', `${otherCombatants.join(', ')} ${otherCombatants.length === 1 ? 'is' : 'are'} also fighting this ghost!`);
            }

            socket.emit('message', `${ghost.name}: ${ghost.hp}/${ghost.maxHp} HP`);
            game.worldService.broadcastToRoom(player.roomId, `${player.character.name} engages ${ghost.name} in combat!`, socket.id);

            // Trigger first attack
            this.initiateGhostCombat(socket, player, ghost, game);
        }
    }

    private initiatePvPCombat(socket: Socket, attacker: Player, defender: Player, game: GameManager): void {
        // Check if they are actually in combat with each other
        if (!attacker.inCombat || !defender.inCombat ||
            attacker.combatTarget !== defender.character.name ||
            defender.combatTarget !== attacker.character.name) {

            socket.emit('message', `You must challenge ${defender.character.name} to a duel first! Use 'challenge <player>'.`);
            return;
        }

        // Attacker strikes
        const damage = game.combatManager.calculateDamage(attacker, defender);

        // Check defense
        let actualDamage = damage;
        if (defender.isDefending) {
            actualDamage = Math.floor(damage / 2);
            defender.isDefending = false;

            const defenderSocket = game.io.sockets?.sockets
                ? Array.from(game.io.sockets.sockets.values()).find(s => s.id === defender.id)
                : undefined;
            if (defenderSocket) {
                defenderSocket.emit('message', "Your defense reduces the damage!");
            }
        }

        defender.hp -= actualDamage;
        const isCrit = damage > (attacker.attack - defender.defense / 2 + 6);

        // Notify attacker
        emitMessage(socket, `You attack ${defender.character.name} for ${actualDamage} damage!${isCrit ? ' CRITICAL HIT!' : ''}`, isCrit ? 'attack-critical' : 'attack');
        game.sendStats(socket);

        // Notify defender
        const defenderSocket = game.io.sockets?.sockets
            ? Array.from(game.io.sockets.sockets.values()).find(s => s.id === defender.id)
            : undefined;
        if (defenderSocket) {
            emitMessage(defenderSocket, `${attacker.character.name} attacks you for ${actualDamage} damage!${isCrit ? ' CRITICAL HIT!' : ''}`, 'damage-taken');
            defenderSocket.emit('message', `Your HP: ${defender.hp}/${defender.maxHp}`);
            game.sendStats(defenderSocket);
        }

        // Notify room
        game.worldService.broadcastToRoom(attacker.roomId, `${attacker.character.name} attacks ${defender.character.name}!`, socket.id);

        // Check for death
        if (defender.hp <= 0) {
            game.worldService.broadcastToRoom(attacker.roomId, `💀 ${attacker.character.name} has defeated ${defender.character.name} in a duel!`, '');

            // Handle death (rewards transfer handled in CombatManager)
            game.combatManager.handleDeath(defender, attacker, game);

            // End combat for attacker
            attacker.inCombat = false;
            attacker.combatTarget = null;
            game.sendStats(socket);
        } else {
            // Turn passes (in a real turn-based system we'd enforce this, 
            // but for now it's free-for-all turns like ghost combat)
            if (defenderSocket) {
                defenderSocket.emit('message', `It's your turn! Attack back!`);
            }
        }

        game.saveGame();
    }
}
