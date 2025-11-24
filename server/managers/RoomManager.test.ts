import { RoomManager } from './RoomManager';
import { WorldData, Room } from '../../shared/types';

describe('RoomManager', () => {
    let roomManager: RoomManager;
    let testWorldData: WorldData;

    beforeEach(() => {
        roomManager = new RoomManager();

        // Create test world data
        testWorldData = {
            starting_room: 'room1',
            rooms: {
                room1: {
                    id: 'room1',
                    name: 'Test Room 1',
                    description: 'A test room',
                    exits: { north: 'room2', south: 'room3' },
                    x: 0,
                    y: 0,
                    coins: 10,
                    items: [],
                    locks: { north: 'key1' }
                },
                room2: {
                    id: 'room2',
                    name: 'Test Room 2',
                    description: 'Another test room',
                    exits: { south: 'room1' },
                    x: 0,
                    y: 1,
                    coins: 0,
                    items: [],
                    locks: {}
                },
                room3: {
                    id: 'room3',
                    name: 'Test Room 3',
                    description: 'Third test room',
                    exits: { north: 'room1' },
                    x: 0,
                    y: -1,
                    coins: 5,
                    items: [],
                    locks: {}
                }
            }
        };

        roomManager.loadWorldData(testWorldData);
    });

    describe('Room Queries', () => {
        it('should load world data and get rooms', () => {
            const room = roomManager.getRoom('room1');
            expect(room).toBeDefined();
            expect(room?.name).toBe('Test Room 1');
        });

        it('should check if room exists', () => {
            expect(roomManager.hasRoom('room1')).toBe(true);
            expect(roomManager.hasRoom('nonexistent')).toBe(false);
        });

        it('should get starting room ID', () => {
            expect(roomManager.getStartingRoomId()).toBe('room1');
        });

        it('should get random room ID', () => {
            const randomRoomId = roomManager.getRandomRoomId();
            expect(['room1', 'room2', 'room3']).toContain(randomRoomId);
        });
    });

    describe('Exit Operations', () => {
        it('should check if exit exists', () => {
            expect(roomManager.hasExit('room1', 'north')).toBe(true);
            expect(roomManager.hasExit('room1', 'east')).toBe(false);
        });

        it('should get exit room ID', () => {
            expect(roomManager.getExitRoomId('room1', 'north')).toBe('room2');
            expect(roomManager.getExitRoomId('room1', 'east')).toBeUndefined();
        });

        it('should get all exits for a room', () => {
            const exits = roomManager.getExits('room1');
            expect(exits).toContain('north');
            expect(exits).toContain('south');
            expect(exits.length).toBe(2);
        });
    });

    describe('Lock Operations', () => {
        it('should check if door is locked', () => {
            expect(roomManager.isLocked('room1', 'north')).toBe(true);
            expect(roomManager.isLocked('room1', 'south')).toBe(false);
        });

        it('should get required key ID for locked door', () => {
            expect(roomManager.getRequiredKeyId('room1', 'north')).toBe('key1');
            expect(roomManager.getRequiredKeyId('room1', 'south')).toBeUndefined();
        });

        it('should unlock door', () => {
            expect(roomManager.isLocked('room1', 'north')).toBe(true);
            roomManager.unlockDoor('room1', 'north');
            expect(roomManager.isLocked('room1', 'north')).toBe(false);
        });
    });
});
