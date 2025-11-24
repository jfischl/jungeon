import { GhostManager, Ghost } from './GhostManager';

describe('GhostManager Unit Tests', () => {
    let ghostManager: GhostManager;
    let testGhost: Ghost;
    const getRandomRoomId = jest.fn(() => 'room-' + Math.random());

    beforeEach(() => {
        ghostManager = new GhostManager(getRandomRoomId);
        testGhost = {
            name: 'Skeleton',
            desc: 'A spooky skeleton',
            roomId: 'room1',
            hp: 50,
            maxHp: 50,
            attack: 10,
            defense: 5,
            goldReward: 30,
            combatants: new Set()
        };
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('spawnInitialGhosts', () => {
        it('should spawn ghosts from config', () => {
            ghostManager.spawnInitialGhosts();
            expect(ghostManager.count()).toBeGreaterThan(0);
        });

        it('should assign random room IDs to spawned ghosts', () => {
            ghostManager.spawnInitialGhosts();
            const ghosts = ghostManager.getAllGhosts();
            ghosts.forEach(ghost => {
                expect(ghost.roomId).toBeTruthy();
            });
        });

        it('should spawn first ghost near starting room when getNearbyRoomId is provided', () => {
            const nearbyRoomId = 'nearby-room-123';
            const getNearbyRoomId = jest.fn(() => nearbyRoomId);
            const getRandomRoomMock = jest.fn(() => 'random-room-' + Math.random());

            const managerWithNearby = new GhostManager(getRandomRoomMock, getNearbyRoomId);
            managerWithNearby.spawnInitialGhosts('starting-room');

            const ghosts = managerWithNearby.getAllGhosts();
            expect(ghosts.length).toBeGreaterThan(0);

            // First ghost should spawn near starting room
            expect(ghosts[0].roomId).toBe(nearbyRoomId);
            expect(getNearbyRoomId).toHaveBeenCalledWith('starting-room');

            // Subsequent ghosts should spawn randomly
            if (ghosts.length > 1) {
                ghosts.slice(1).forEach(ghost => {
                    expect(ghost.roomId).toContain('random-room-');
                });
            }
        });

        it('should spawn all ghosts randomly when getNearbyRoomId is not provided', () => {
            const getRandomRoomMock = jest.fn(() => 'random-room-' + Math.random());
            const managerWithoutNearby = new GhostManager(getRandomRoomMock);

            managerWithoutNearby.spawnInitialGhosts('starting-room');

            const ghosts = managerWithoutNearby.getAllGhosts();
            expect(ghosts.length).toBeGreaterThan(0);

            // All ghosts should spawn randomly
            expect(getRandomRoomMock).toHaveBeenCalledTimes(ghosts.length);
            ghosts.forEach(ghost => {
                expect(ghost.roomId).toContain('random-room-');
            });
        });

        it('should spawn all ghosts randomly when startingRoomId is not provided', () => {
            const nearbyRoomId = 'nearby-room-123';
            const getNearbyRoomId = jest.fn(() => nearbyRoomId);
            const getRandomRoomMock = jest.fn(() => 'random-room-' + Math.random());

            const managerWithNearby = new GhostManager(getRandomRoomMock, getNearbyRoomId);
            managerWithNearby.spawnInitialGhosts(); // No starting room provided

            const ghosts = managerWithNearby.getAllGhosts();
            expect(ghosts.length).toBeGreaterThan(0);

            // All ghosts should spawn randomly (getNearbyRoomId should not be called)
            expect(getNearbyRoomId).not.toHaveBeenCalled();
            ghosts.forEach(ghost => {
                expect(ghost.roomId).toContain('random-room-');
            });
        });
    });

    describe('getGhostsInRoom', () => {
        it('should return ghosts in specific room', () => {
            ghostManager.spawnInitialGhosts();
            const allGhosts = ghostManager.getAllGhosts();
            if (allGhosts.length > 0) {
                const roomId = allGhosts[0].roomId;
                allGhosts[0].roomId = roomId; // Ensure at least one ghost in specific room
                const ghostsInRoom = ghostManager.getGhostsInRoom(roomId);
                expect(ghostsInRoom.length).toBeGreaterThan(0);
            }
        });

        it('should return empty array for room with no ghosts', () => {
            expect(ghostManager.getGhostsInRoom('empty-room')).toEqual([]);
        });
    });

    describe('findGhostByName', () => {
        beforeEach(() => {
            ghostManager.spawnInitialGhosts();
        });

        it('should find ghost by exact name (case-insensitive)', () => {
            const ghosts = ghostManager.getAllGhosts();
            if (ghosts.length > 0) {
                const ghostName = ghosts[0].name.toLowerCase();
                const found = ghostManager.findGhostByName(ghostName);
                expect(found).toBeDefined();
            }
        });

        it('should find ghost by partial name', () => {
            const ghosts = ghostManager.getAllGhosts();
            if (ghosts.length > 0 && ghosts[0].name.length > 3) {
                const partialName = ghosts[0].name.substring(0, 3).toLowerCase();
                const found = ghostManager.findGhostByName(partialName);
                expect(found).toBeDefined();
            }
        });

        it('should return undefined for non-existent ghost', () => {
            expect(ghostManager.findGhostByName('nonexistent123')).toBeUndefined();
        });

        it('should filter by room ID if provided', () => {
            const ghosts = ghostManager.getAllGhosts();
            if (ghosts.length > 0) {
                const ghost = ghosts[0];
                const found = ghostManager.findGhostByName(ghost.name, ghost.roomId);
                expect(found).toBeDefined();

                const notFound = ghostManager.findGhostByName(ghost.name, 'wrong-room');
                expect(notFound).toBeUndefined();
            }
        });
    });

    describe('combatant tracking', () => {
        beforeEach(() => {
            ghostManager.spawnInitialGhosts();
        });

        it('should add combatant to ghost', () => {
            const ghosts = ghostManager.getAllGhosts();
            if (ghosts.length > 0) {
                const ghost = ghosts[0];
                ghostManager.addCombatant(ghost, 'player-123');
                expect(ghost.combatants.has('player-123')).toBe(true);
            }
        });

        it('should remove combatant from ghost', () => {
            const ghosts = ghostManager.getAllGhosts();
            if (ghosts.length > 0) {
                const ghost = ghosts[0];
                ghostManager.addCombatant(ghost, 'player-123');
                ghostManager.removeCombatant(ghost, 'player-123');
                expect(ghost.combatants.has('player-123')).toBe(false);
            }
        });

        it('should remove player from all ghosts', () => {
            const ghosts = ghostManager.getAllGhosts();
            ghosts.forEach(ghost => ghostManager.addCombatant(ghost, 'player-123'));

            ghostManager.removePlayerFromAllCombat('player-123');

            ghosts.forEach(ghost => {
                expect(ghost.combatants.has('player-123')).toBe(false);
            });
        });
    });

    describe('removeGhost', () => {
        it('should remove ghost from list', () => {
            ghostManager.spawnInitialGhosts();
            const initialCount = ghostManager.count();
            const ghosts = ghostManager.getAllGhosts();

            if (ghosts.length > 0) {
                ghostManager.removeGhost(ghosts[0]);
                expect(ghostManager.count()).toBe(initialCount - 1);
            }
        });
    });

    describe('moveGhost', () => {
        it('should move ghost to adjacent room', () => {
            ghostManager.spawnInitialGhosts();
            const ghosts = ghostManager.getAllGhosts();

            if (ghosts.length > 0) {
                const ghost = ghosts[0];
                const initialRoom = ghost.roomId;
                const exits = ['north', 'south'];
                const getExitRoomId = jest.fn(() => 'new-room');

                ghostManager.moveGhost(ghost, exits, getExitRoomId);

                expect(getExitRoomId).toHaveBeenCalled();
                if (ghost.roomId !== initialRoom) {
                    expect(ghost.roomId).toBe('new-room');
                }
            }
        });

        it('should not move ghost if no exits', () => {
            ghostManager.spawnInitialGhosts();
            const ghosts = ghostManager.getAllGhosts();

            if (ghosts.length > 0) {
                const ghost = ghosts[0];
                const initialRoom = ghost.roomId;
                const getExitRoomId = jest.fn();

                ghostManager.moveGhost(ghost, [], getExitRoomId);

                expect(ghost.roomId).toBe(initialRoom);
                expect(getExitRoomId).not.toHaveBeenCalled();
            }
        });
    });
});
