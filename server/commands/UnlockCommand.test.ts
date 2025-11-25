import { UnlockCommand } from './UnlockCommand';
import { GameManager } from '../game';
import { Socket } from 'socket.io';
import { Player, Room, Item } from '../../shared/types';

describe('UnlockCommand', () => {
    let command: UnlockCommand;
    let mockSocket: any;
    let mockGame: any;

    beforeEach(() => {
        command = new UnlockCommand();

        mockSocket = {
            id: 'test-socket-id',
            emit: jest.fn()
        };

        const testKey: Item = {
            id: 'key_0',
            name: 'Ornate Bronze Key',
            description: 'A heavy bronze key engraved with twisted vines and thorns.'
        };

        const testPlayer: Player = {
            id: 'test-socket-id',
            character: { id: 'warrior', name: 'Garreth', description: 'A warrior', baseHp: 100, baseAttack: 15, baseDefense: 10 },
            roomId: 'room_1',
            inventory: {
                coins: 10,
                items: [testKey]
            },
            exploredRooms: new Set<string>(),
            hp: 100,
            maxHp: 100,
            attack: 15,
            defense: 10,
            level: 1,
            experience: 0,
            inCombat: false,
            combatTarget: null,
            isDefending: false
        };

        const currentRoom: Room = {
            id: 'room_1',
            name: 'Test Room',
            description: 'A test room',
            exits: { north: 'room_2', south: 'room_3' },
            x: 0,
            y: 0,
            coins: 0,
            items: [],
            locks: { north: 'key_0' } // North door locked with key_0
        };

        const northRoom: Room = {
            id: 'room_2',
            name: 'North Room',
            description: 'A north room',
            exits: { south: 'room_1' },
            x: 0,
            y: -1,
            coins: 0,
            items: [],
            locks: { south: 'key_0' } // Should unlock both sides
        };

        const southRoom: Room = {
            id: 'room_3',
            name: 'South Room',
            description: 'A south room',
            exits: { north: 'room_1' },
            x: 0,
            y: 1,
            coins: 0,
            items: [],
            locks: {}
        };

        mockGame = {
            playerManager: {
                getPlayer: (id: string) => id === mockSocket.id ? testPlayer : undefined
            },
            roomManager: {
                getRoom: (id: string) => {
                    const rooms: Record<string, Room> = {
                        'room_1': currentRoom,
                        'room_2': northRoom,
                        'room_3': southRoom
                    };
                    return rooms[id];
                }
            },
            getOppositeDirection: (dir: string) => {
                if (dir === 'north') return 'south';
                if (dir === 'south') return 'north';
                if (dir === 'east') return 'west';
                if (dir === 'west') return 'east';
                return '';
            },
            saveGame: jest.fn()
        };
    });

    it('should unlock door with correct key', () => {
        command.execute(mockSocket, 'north', mockGame);

        expect(mockSocket).toHaveEmittedMessage('You unlock the north door with the Ornate Bronze Key.', 'unlock');
        expect(mockGame.roomManager.getRoom('room_1')!.locks['north']).toBeUndefined();
        expect(mockGame.roomManager.getRoom('room_2')!.locks['south']).toBeUndefined();
        expect(mockGame.saveGame).toHaveBeenCalled();
    });

    it('should work with short direction aliases', () => {
        command.execute(mockSocket, 'n', mockGame);

        expect(mockSocket).toHaveEmittedMessage('You unlock the north door with the Ornate Bronze Key.', 'unlock');
    });

    it('should handle door that is not locked', () => {
        command.execute(mockSocket, 'south', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'The south exit is not locked.'
        );
    });

    it('should handle non-existent exit', () => {
        command.execute(mockSocket, 'east', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'There is no exit to the east.'
        );
    });

    it('should handle missing key', () => {
        // Remove the key from inventory
        const player = mockGame.playerManager.getPlayer(mockSocket.id);
        player.inventory.items = [];

        command.execute(mockSocket, 'north', mockGame);

        expect(mockSocket).toHaveEmittedMessage('The north door is locked. You don\'t have the right key.', 'door-locked');
    });

    it('should handle wrong key', () => {
        // Give player a different key
        const player = mockGame.playerManager.getPlayer(mockSocket.id);
        player.inventory.items = [{
            id: 'key_1',
            name: 'Wrong Key',
            description: 'This is the wrong key.'
        }];

        command.execute(mockSocket, 'north', mockGame);

        expect(mockSocket).toHaveEmittedMessage('The north door is locked. You don\'t have the right key.', 'door-locked');
    });

    it('should require a direction argument', () => {
        command.execute(mockSocket, '', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'Unlock which direction? (north, south, east, west)'
        );
    });

    it('should reject invalid direction', () => {
        command.execute(mockSocket, 'up', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'Unlock which direction? (north, south, east, west)'
        );
    });
});
