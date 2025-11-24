import { WorldData, Character } from '../shared/types';

/**
 * Shared test fixtures for integration tests
 * Provides consistent mock data to avoid file I/O race conditions
 */

export const mockWorldData: WorldData = {
    starting_room: 'test_room_1',
    rooms: {
        'test_room_1': {
            id: 'test_room_1',
            name: 'Test Room 1',
            description: 'A test room for unit tests',
            exits: { north: 'test_room_2', east: 'test_room_3' },
            x: 0,
            y: 0,
            items: [],
            coins: 100,
            locks: {}
        },
        'test_room_2': {
            id: 'test_room_2',
            name: 'Test Room 2',
            description: 'Another test room',
            exits: { south: 'test_room_1' },
            x: 0,
            y: 1,
            items: [],
            coins: 50,
            locks: {}
        },
        'test_room_3': {
            id: 'test_room_3',
            name: 'Test Room 3',
            description: 'Third test room',
            exits: { west: 'test_room_1' },
            x: 1,
            y: 0,
            items: [],
            coins: 0,
            locks: {}
        }
    }
};

export const mockCharacters: Character[] = [
    {
        id: 'warrior',
        name: 'Test Warrior',
        description: 'A test warrior character',
        baseHp: 100,
        baseAttack: 15,
        baseDefense: 10
    },
    {
        id: 'mage',
        name: 'Test Mage',
        description: 'A test mage character',
        baseHp: 80,
        baseAttack: 20,
        baseDefense: 5
    },
    {
        id: 'rogue',
        name: 'Test Rogue',
        description: 'A test rogue character',
        baseHp: 90,
        baseAttack: 18,
        baseDefense: 8
    }
];

/**
 * Helper function to set up GameManager with mock data
 * Avoids file I/O and ensures consistent test environment
 */
export function setupMockGameManager(gameManager: any): void {
    // Override worldData
    gameManager.worldData = mockWorldData;

    // Load world data into RoomManager
    gameManager.roomManager.loadWorldData(mockWorldData);

    // Override characters
    gameManager.characters = mockCharacters;
}
