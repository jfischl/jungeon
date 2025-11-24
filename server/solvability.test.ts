import * as fs from 'fs';
import * as path from 'path';
import { WorldData, Room } from '../shared/types';

describe('Map Solvability', () => {
    let worldData: WorldData;

    beforeAll(() => {
        const worldPath = path.join(__dirname, 'data', 'world.json');
        worldData = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
    });

    test('all rooms should be reachable from starting room', () => {
        const rooms = worldData.rooms;
        const startId = worldData.starting_room;
        const totalRooms = Object.keys(rooms).length;

        const visited = new Set<string>();
        const keys = new Set<string>();
        visited.add(startId);

        let changed = true;
        while (changed) {
            changed = false;
            const currentVisited = Array.from(visited);

            for (const roomId of currentVisited) {
                const room = rooms[roomId];

                // Collect keys
                if (room.items) {
                    for (const item of room.items) {
                        if (item.id.startsWith('key_') && !keys.has(item.id)) {
                            keys.add(item.id);
                            changed = true;
                        }
                    }
                }

                // Check exits
                for (const [dir, nextRoomId] of Object.entries(room.exits)) {
                    if (!visited.has(nextRoomId)) {
                        let locked = false;
                        if (room.locks && room.locks[dir]) {
                            if (!keys.has(room.locks[dir])) {
                                locked = true;
                            }
                        }

                        if (!locked) {
                            visited.add(nextRoomId);
                            changed = true;
                        }
                    }
                }
            }
        }

        expect(visited.size).toBe(totalRooms);
    });
});
