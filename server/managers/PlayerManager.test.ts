import { PlayerManager } from './PlayerManager';
import { Player } from '../../shared/types';

describe('PlayerManager Unit Tests', () => {
    let playerManager: PlayerManager;
    let testPlayer: Player;

    beforeEach(() => {
        playerManager = new PlayerManager();
        testPlayer = {
            id: 'socket-123',
            character: { id: 'warrior', name: 'TestWarrior', description: 'A brave warrior', baseHp: 100, baseAttack: 10, baseDefense: 5 },
            roomId: 'room1',
            inventory: { coins: 50, items: [] },
            exploredRooms: new Set(['room1']),
            hp: 100,
            maxHp: 100,
            attack: 10,
            defense: 5,
            level: 1,
            experience: 0,
            inCombat: false,
            combatTarget: null,
            isDefending: false
        };
    });

    describe('addPlayer', () => {
        it('should add a player', () => {
            playerManager.addPlayer('socket-123', testPlayer);
            expect(playerManager.hasPlayer('socket-123')).toBe(true);
        });

        it('should allow adding multiple players', () => {
            const player2 = { ...testPlayer, id: 'socket-456', character: { ...testPlayer.character, id: 'rogue' } };
            playerManager.addPlayer('socket-123', testPlayer);
            playerManager.addPlayer('socket-456', player2);
            expect(playerManager.getAllPlayers().length).toBe(2);
        });
    });

    describe('getPlayer', () => {
        it('should retrieve an existing player', () => {
            playerManager.addPlayer('socket-123', testPlayer);
            const retrieved = playerManager.getPlayer('socket-123');
            expect(retrieved).toEqual(testPlayer);
        });

        it('should return undefined for non-existent player', () => {
            expect(playerManager.getPlayer('invalid')).toBeUndefined();
        });
    });

    describe('removePlayer', () => {
        it('should remove a player', () => {
            playerManager.addPlayer('socket-123', testPlayer);
            playerManager.removePlayer('socket-123');
            expect(playerManager.hasPlayer('socket-123')).toBe(false);
        });

        it('should handle removing non-existent player gracefully', () => {
            expect(() => playerManager.removePlayer('invalid')).not.toThrow();
        });
    });

    describe('getPlayersInRoom', () => {
        it('should return all players in a specific room', () => {
            const player2 = { ...testPlayer, id: 'socket-456', roomId: 'room1' };
            const player3 = { ...testPlayer, id: 'socket-789', roomId: 'room2' };

            playerManager.addPlayer('socket-123', testPlayer);
            playerManager.addPlayer('socket-456', player2);
            playerManager.addPlayer('socket-789', player3);

            const playersInRoom1 = playerManager.getPlayersInRoom('room1');
            expect(playersInRoom1.length).toBe(2);
            expect(playersInRoom1.every(p => p.roomId === 'room1')).toBe(true);
        });

        it('should return empty array for room with no players', () => {
            expect(playerManager.getPlayersInRoom('empty-room')).toEqual([]);
        });
    });

    describe('isCharacterTaken', () => {
        it('should return true for taken character', () => {
            playerManager.addPlayer('socket-123', testPlayer);
            expect(playerManager.isCharacterTaken('warrior')).toBe(true);
        });

        it('should return false for available character', () => {
            expect(playerManager.isCharacterTaken('mage')).toBe(false);
        });
    });

    describe('getAllPlayers', () => {
        it('should return all players', () => {
            const player2 = { ...testPlayer, id: 'socket-456' };
            playerManager.addPlayer('socket-123', testPlayer);
            playerManager.addPlayer('socket-456', player2);
            expect(playerManager.getAllPlayers().length).toBe(2);
        });

        it('should return empty array when no players', () => {
            expect(playerManager.getAllPlayers()).toEqual([]);
        });
    });

    describe('count', () => {
        it('should return correct player count', () => {
            expect(playerManager.count()).toBe(0);
            playerManager.addPlayer('socket-123', testPlayer);
            expect(playerManager.count()).toBe(1);
        });
    });
});
