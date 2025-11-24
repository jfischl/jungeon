import { ExamineCommand } from './ExamineCommand';
import { GameManager } from '../game';
import { Socket } from 'socket.io';
import { Player, Room, Item } from '../../shared/types';

describe('ExamineCommand', () => {
    let command: ExamineCommand;
    let mockSocket: any;
    let mockGame: any;

    beforeEach(() => {
        command = new ExamineCommand();

        // Mock socket with emit tracking
        mockSocket = {
            id: 'test-socket-id',
            emit: jest.fn()
        };

        // Create test items
        const testKey: Item = {
            id: 'key_0',
            name: 'Ornate Bronze Key',
            description: 'A heavy bronze key engraved with twisted vines and thorns.'
        };

        const testPotion: Item = {
            id: 'potion_1',
            name: 'Red Potion',
            description: 'Smells like strawberries.'
        };

        const testPlayer: Player = {
            id: 'test-socket-id',
            character: { id: 'warrior', name: 'Garreth', description: 'A warrior' },
            roomId: 'room_1',
            inventory: {
                coins: 10,
                items: [testKey]
            }
        };

        const testRoom: Room = {
            id: 'room_1',
            name: 'Test Room',
            description: 'A test room',
            exits: {},
            x: 0,
            y: 0,
            coins: 0,
            items: [testPotion],
            locks: {}
        };

        // Mock game manager
        mockGame = {
            players: new Map([[mockSocket.id, testPlayer]]),
            rooms: { 'room_1': testRoom }
        };
    });

    it('should display item description from inventory', () => {
        command.execute(mockSocket, 'Ornate Bronze Key', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'Ornate Bronze Key: A heavy bronze key engraved with twisted vines and thorns.'
        );
    });

    it('should display item description from room', () => {
        command.execute(mockSocket, 'Red Potion', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'Red Potion: Smells like strawberries.'
        );
    });

    it('should work with partial item names', () => {
        command.execute(mockSocket, 'bronze', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'Ornate Bronze Key: A heavy bronze key engraved with twisted vines and thorns.'
        );
    });

    it('should prioritize inventory over room items', () => {
        // Add same item to both
        const duplicateKey: Item = {
            id: 'key_0',
            name: 'Ornate Bronze Key',
            description: 'A heavy bronze key engraved with twisted vines and thorns.'
        };
        mockGame.rooms['room_1'].items.push(duplicateKey);

        command.execute(mockSocket, 'bronze', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    });

    it('should handle item not found', () => {
        command.execute(mockSocket, 'nonexistent item', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'You don\'t see any "nonexistent item" here.'
        );
    });

    it('should require an argument', () => {
        command.execute(mockSocket, '', mockGame);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'message',
            'Examine what? Usage: examine <item>'
        );
    });
});
