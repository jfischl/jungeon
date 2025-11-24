import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';
import { CONFIG } from '../config';

export class ChallengeCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        const challenger = game.playerManager.getPlayer(socket.id)!;

        if (!args || args.trim().length === 0) {
            socket.emit('message', "Challenge who? Usage: challenge <player>");
            return;
        }

        if (challenger.inCombat) {
            socket.emit('message', "You cannot issue challenges while in combat!");
            return;
        }

        const targetName = args.toLowerCase().trim();

        // Find target player in same room
        const targetPlayer = game.playerManager.getAllPlayers().find(p =>
            p.roomId === challenger.roomId &&
            p.id !== challenger.id &&
            p.character.name.toLowerCase().includes(targetName)
        );

        if (!targetPlayer) {
            socket.emit('message', `You don't see "${args}" here.`);
            return;
        }

        if (targetPlayer.inCombat) {
            socket.emit('message', `${targetPlayer.character.name} is currently fighting!`);
            return;
        }

        // Check safeguards
        if (targetPlayer.level < CONFIG.PVP.NEWBIE_PROTECTION_LEVEL) {
            socket.emit('message', `${targetPlayer.character.name} has newbie protection (under level ${CONFIG.PVP.NEWBIE_PROTECTION_LEVEL}).`);
            return;
        }

        if (challenger.roomId === game.worldData.starting_room) {
            socket.emit('message', "Combat is not allowed in the starting room.");
            return;
        }

        // Store challenge
        const challengeId = `${challenger.id}-${targetPlayer.id}`;
        game.pendingChallenges.set(challengeId, {
            challengerId: challenger.id,
            targetId: targetPlayer.id,
            timestamp: Date.now()
        });

        // Notify players
        socket.emit('message', `You have challenged ${targetPlayer.character.name} to a duel! Waiting for response...`);

        const targetSocket = Array.from(game.io.sockets.sockets.values()).find(s => s.id === targetPlayer.id);
        if (targetSocket) {
            targetSocket.emit('message', `⚔️  ${challenger.character.name} has challenged you to a duel!`);
            targetSocket.emit('message', `Type 'accept' within ${CONFIG.PVP.CHALLENGE_TIMEOUT_MS / 1000} seconds to fight!`);
        }

        // Set expiration
        setTimeout(() => {
            if (game.pendingChallenges.has(challengeId)) {
                game.pendingChallenges.delete(challengeId);
                socket.emit('message', `Challenge to ${targetPlayer.character.name} expired.`);
                if (targetSocket) {
                    targetSocket.emit('message', `Challenge from ${challenger.character.name} expired.`);
                }
            }
        }, CONFIG.PVP.CHALLENGE_TIMEOUT_MS);
    }
}
