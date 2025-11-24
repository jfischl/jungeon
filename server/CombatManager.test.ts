import { CombatManager } from './CombatManager';
import { GameManager } from './game';
import { Server } from 'socket.io';

describe('CombatManager Unit Tests', () => {
    let combatManager: CombatManager;
    let gameManager: any;
    let mockSocket: any;
    let mockIo: any;

    beforeEach(() => {
        mockIo = {
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: { sockets: new Map() }
        } as any;

        gameManager = new GameManager(mockIo);
        combatManager = gameManager.combatManager;

        mockSocket = {
            id: 'test-socket',
            emit: jest.fn(),
            on: jest.fn()
        };

        mockIo.sockets.sockets.set(mockSocket.id, mockSocket);
    });

    describe('calculateDamage', () => {
        it('should calculate damage based on attack and defense', () => {
            const attacker = {
                attack: 20,
                defense: 10,
                hp: 100,
                maxHp: 100,
                level: 1,
                experience: 0,
                inCombat: false,
                combatTarget: null,
                id: 'attacker',
                character: { id: '', name: '', description: '', baseHp: 0, baseAttack: 0, baseDefense: 0 },
                roomId: '',
                inventory: { coins: 0, items: [] },
                exploredRooms: new Set(),
                isDefending: false
            };

            const defender = {
                attack: 10,
                defense: 10,
                hp: 100,
                maxHp: 100,
                level: 1,
                experience: 0,
                inCombat: false,
                combatTarget: null,
                id: 'defender',
                character: { id: '', name: '', description: '', baseHp: 0, baseAttack: 0, baseDefense: 0 },
                roomId: '',
                inventory: { coins: 0, items: [] },
                exploredRooms: new Set(),
                isDefending: false
            };

            const damage = combatManager.calculateDamage(attacker, defender);

            // Damage = attack - (defense/2) + dice(1-6)
            // = 20 - 5 + dice = 15 + (1-6) = 16-21
            expect(damage).toBeGreaterThanOrEqual(16);
            expect(damage).toBeLessThanOrEqual(21 * 2); // *2 for possible crit
        });

        it('should reduce damage when defending', () => {
            const attacker = {
                attack: 20,
                defense: 10,
                hp: 100,
                maxHp: 100,
                level: 1,
                experience: 0,
                inCombat: false,
                combatTarget: null,
                id: 'attacker',
                character: { id: '', name: '', description: '', baseHp: 0, baseAttack: 0, baseDefense: 0 },
                roomId: '',
                inventory: { coins: 0, items: [] },
                exploredRooms: new Set(),
                isDefending: false
            };

            const defender = {
                attack: 10,
                defense: 10,
                hp: 100,
                maxHp: 100,
                level: 1,
                experience: 0,
                inCombat: false,
                combatTarget: null,
                id: 'defender',
                character: { id: '', name: '', description: '', baseHp: 0, baseAttack: 0, baseDefense: 0 },
                roomId: '',
                inventory: { coins: 0, items: [] },
                exploredRooms: new Set(),
                isDefending: false
            };

            const normalDamage = combatManager.calculateDamage(attacker, defender, false);
            const defendingDamage = combatManager.calculateDamage(attacker, defender, true);

            expect(defendingDamage).toBeLessThan(normalDamage);
            expect(defendingDamage).toBeGreaterThanOrEqual(Math.floor(normalDamage / 2) - 1);
        });

        it('should deal minimum 1 damage', () => {
            const attacker = {
                attack: 1,
                defense: 0,
                hp: 100,
                maxHp: 100,
                level: 1,
                experience: 0,
                inCombat: false,
                combatTarget: null,
                id: 'attacker',
                character: { id: '', name: '', description: '', baseHp: 0, baseAttack: 0, baseDefense: 0 },
                roomId: '',
                inventory: { coins: 0, items: [] },
                exploredRooms: new Set(),
                isDefending: false
            };

            const defender = {
                attack: 1,
                defense: 100,
                hp: 100,
                maxHp: 100,
                level: 1,
                experience: 0,
                inCombat: false,
                combatTarget: null,
                id: 'defender',
                character: { id: '', name: '', description: '', baseHp: 0, baseAttack: 0, baseDefense: 0 },
                roomId: '',
                inventory: { coins: 0, items: [] },
                exploredRooms: new Set(),
                isDefending: false
            };

            const damage = combatManager.calculateDamage(attacker, defender);

            expect(damage).toBeGreaterThanOrEqual(1);
        });
    });

    describe('awardExperience', () => {
        it('should award XP without leveling', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const player = gameManager.players.get(mockSocket.id);
            const initialXp = player.experience;

            combatManager.awardExperience(player, 50, mockSocket);

            expect(player.experience).toBe(initialXp + 50);
            expect(player.level).toBe(1);
        });

        it('should level up at 100 XP', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const player = gameManager.players.get(mockSocket.id);
            player.experience = 90;
            const initialMaxHp = player.maxHp;
            const initialAttack = player.attack;
            const initialDefense = player.defense;

            combatManager.awardExperience(player, 15, mockSocket);

            expect(player.level).toBe(2);
            expect(player.maxHp).toBe(initialMaxHp + 10);
            expect(player.attack).toBe(initialAttack + 1);
            expect(player.defense).toBe(initialDefense + 1);
            expect(player.hp).toBe(player.maxHp); // Full heal on level up
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'message',
                expect.stringContaining('LEVEL UP')
            );
        });

        it('should support multiple level ups', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const player = gameManager.players.get(mockSocket.id);

            combatManager.awardExperience(player, 250, mockSocket);

            expect(player.level).toBe(3); // 250 XP = level 3
        });
    });

    describe('handleDeath', () => {
        it('should respawn player at starting room', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const player = gameManager.players.get(mockSocket.id);
            player.hp = 0;
            player.roomId = 'some_other_room';

            combatManager.handleDeath(player, null, gameManager);

            expect(player.hp).toBe(player.maxHp);
            expect(player.roomId).toBe(gameManager.worldData.starting_room);
            expect(player.inCombat).toBe(false);
        });

        it('should deduct 30% gold (capped at 50)', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const player = gameManager.players.get(mockSocket.id);
            player.inventory.coins = 200;

            combatManager.handleDeath(player, null, gameManager);

            const lostGold = 200 - player.inventory.coins;
            expect(lostGold).toBe(50); // Capped at 50
        });

        it('should deduct 25 XP on death', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const player = gameManager.players.get(mockSocket.id);
            player.experience = 50;

            combatManager.handleDeath(player, null, gameManager);

            expect(player.experience).toBe(25);
        });

        it('should not reduce XP below 0', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const player = gameManager.players.get(mockSocket.id);
            player.experience = 10;

            combatManager.handleDeath(player, null, gameManager);

            expect(player.experience).toBe(0);
        });

        it('should transfer gold to killer in PvP', () => {
            gameManager.handleLogin(mockSocket, 'warrior');
            const deadPlayer = gameManager.players.get(mockSocket.id);
            deadPlayer.inventory.coins = 100;

            const mockKillerSocket = {
                id: 'killer-socket',
                emit: jest.fn()
            };
            mockIo.sockets.sockets.set(mockKillerSocket.id, mockKillerSocket);
            gameManager.handleLogin(mockKillerSocket, 'rogue');
            const killer = gameManager.players.get(mockKillerSocket.id);
            const initialKillerGold = killer.inventory.coins;

            combatManager.handleDeath(deadPlayer, killer, gameManager);

            expect(killer.inventory.coins).toBe(initialKillerGold + 30); // 30% of 100
        });
    });
});
