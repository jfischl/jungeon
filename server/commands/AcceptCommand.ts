import { Socket } from 'socket.io';
import { Command } from './Command';
import { GameManager } from '../game';

export class AcceptCommand implements Command {
    execute(socket: Socket, args: string, game: GameManager): void {
        const acceptor = game.players.get(socket.id)!;

        // Find pending challenge where this player is the target
        // We look for any challenge where targetId matches acceptor.id
        const challengeEntry = Array.from(game.pendingChallenges.entries())
            .find(([_, data]) => data.targetId === acceptor.id);

        if (!challengeEntry) {
            socket.emit('message', "You have no pending challenges.");
            return;
        }

        const [challengeId, data] = challengeEntry;
        const challenger = game.players.get(data.challengerId);

        if (!challenger) {
            socket.emit('message', "The challenger is no longer available.");
            game.pendingChallenges.delete(challengeId);
            return;
        }

        if (challenger.roomId !== acceptor.roomId) {
            socket.emit('message', "The challenger is no longer in this room.");
            game.pendingChallenges.delete(challengeId);
            return;
        }

        if (challenger.inCombat || acceptor.inCombat) {
            socket.emit('message', "One of you is already in combat!");
            return;
        }

        // Start Combat
        game.pendingChallenges.delete(challengeId);

        // Set combat state
        challenger.inCombat = true;
        challenger.combatTarget = acceptor.character.name;

        acceptor.inCombat = true;
        acceptor.combatTarget = challenger.character.name;

        // Notify room
        game.broadcastToRoom(acceptor.roomId, `⚔️  DUEL STARTED: ${challenger.character.name} vs ${acceptor.character.name}!`, '');

        const challengerSocket = Array.from(game.io.sockets.sockets.values()).find(s => s.id === challenger.id);

        if (challengerSocket) {
            challengerSocket.emit('message', `Duel accepted! You are fighting ${acceptor.character.name}!`);
            challengerSocket.emit('message', `You have the initiative! Type 'attack' to strike first!`);
        }

        socket.emit('message', `You accepted the duel! Prepare to fight ${challenger.character.name}!`);
    }
}
