import * as fs from 'fs';
import * as path from 'path';
import { Room, Item, WorldData } from '../shared/types';

const NUM_ROOMS = 100;
const ROOM_NAMES: string[] = [
    "Damp Cave", "Dusty Library", "Armory", "Kitchen", "Throne Room",
    "Dungeon Cell", "Guard Room", "Torture Chamber", "Crypt", "Laboratory",
    "Gallery", "Observatory", "Wine Cellar", "Pantry", "Stable",
    "Barracks", "Chapel", "Treasury", "Workshop", "Garden",
    "Sewer", "Attic", "Balcony", "Hallway", "Corridor",
    "Antechamber", "Sanctuary", "Vault", "Study", "Bedroom"
];

const ITEMS: Item[] = [
    { id: "sword", name: "Rusty Sword", description: "Better than nothing." },
    { id: "shield", name: "Wooden Shield", description: "Splintery but sturdy." },
    { id: "potion", name: "Red Potion", description: "Smells like strawberries." },
    { id: "scroll", name: "Ancient Scroll", description: "Unreadable runes." },
    { id: "gem", name: "Blue Gem", description: "Sparkles in the dark." },
    { id: "ring", name: "Gold Ring", description: "My precious." },
    { id: "torch", name: "Unlit Torch", description: "Need a light?" },
    { id: "rope", name: "Coil of Rope", description: "Always useful." },
    { id: "bone", name: "Human Bone", description: "Spooky." },
    { id: "map", name: "Tattered Map", description: "Shows a place you aren't in." }
];

const DIRECTIONS = ['north', 'south', 'east', 'west'];
const OPPOSITE: Record<string, string> = { 'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east' };

const KEY_TYPES = [
    { name: "Ornate Bronze Key", desc: "A heavy bronze key engraved with twisted vines and thorns." },
    { name: "Rusted Iron Key", desc: "An ancient iron key, heavy with age and covered in rust." },
    { name: "Silver Skeleton Key", desc: "A delicate silver key etched with mysterious arcane runes." },
    { name: "Copper Dungeon Key", desc: "A tarnished copper key stained with green verdigris." },
    { name: "Blackened Steel Key", desc: "A steel key scorched black, as if touched by flame." },
    { name: "Golden Chamber Key", desc: "An ornate golden key with intricate filigree work." },
    { name: "Bone Key", desc: "A macabre key carved from yellowed bone, cold to the touch." },
    { name: "Crystalline Key", desc: "A translucent key that seems to shimmer with inner light." },
    { name: "Obsidian Key", desc: "A jet-black key carved from volcanic glass, razor-sharp edges." },
    { name: "Brass Vault Key", desc: "A thick brass key with complex teeth, clearly for something important." }
];

export class MapGenerator {
    rooms: Record<string, Room>;
    roomIds: string[];

    constructor() {
        this.rooms = {};
        this.roomIds = [];
    }

    generate(): void {
        console.log("Generating map...");
        this.rooms = {};
        this.roomIds = [];

        // Grid based generation
        // Start at 0,0
        const startRoomId = this.createRoom(0, 0);
        this.roomIds.push(startRoomId);

        let currentX = 0;
        let currentY = 0;
        let currentRoomId = startRoomId;

        // We need to keep track of occupied coordinates
        const occupied = new Set<string>(['0,0']);
        const coordsToRoomId: Record<string, string> = { '0,0': startRoomId };

        // Random walk until we have NUM_ROOMS
        while (this.roomIds.length < NUM_ROOMS) {
            const dirs = ['north', 'south', 'east', 'west'];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];

            let nextX = currentX;
            let nextY = currentY;

            if (dir === 'north') nextY--;
            if (dir === 'south') nextY++;
            if (dir === 'east') nextX++;
            if (dir === 'west') nextX--;

            const coordKey = `${nextX},${nextY}`;

            if (!occupied.has(coordKey)) {
                // Create new room
                const newRoomId = this.createRoom(nextX, nextY);
                this.roomIds.push(newRoomId);
                occupied.add(coordKey);
                coordsToRoomId[coordKey] = newRoomId;

                // Connect
                this.connectRooms(currentRoomId, newRoomId, dir);

                // Move there
                currentX = nextX;
                currentY = nextY;
                currentRoomId = newRoomId;
            } else {
                // Room exists, just connect and move there sometimes?
                // Or just move there without connecting?
                // Let's connect if not already connected to ensure high connectivity
                const existingRoomId = coordsToRoomId[coordKey];

                // Check if already connected
                if (!this.rooms[currentRoomId].exits[dir]) {
                    // 50% chance to connect to existing room to create loops
                    if (Math.random() > 0.5) {
                        this.connectRooms(currentRoomId, existingRoomId, dir);
                    }
                }

                // Move there
                currentX = nextX;
                currentY = nextY;
                currentRoomId = existingRoomId;
            }
        }

        // 2. Add Items
        this.placeItems();

        // 3. Place Locks and Keys
        this.placeLocksAndKeys();

        // 4. Verify Solvability
        if (!this.isSolvable()) {
            console.log("Map not solvable (unreachable rooms due to locks). Regenerating...");
            this.generate(); // Recursive retry
            return;
        }

        // 5. Save
        const world: WorldData = {
            starting_room: this.roomIds[0],
            rooms: this.rooms
        };

        fs.writeFileSync(path.join(__dirname, 'data/world.json'), JSON.stringify(world, null, 2));
        console.log("Map generated and saved to data/world.json");
    }

    createRoom(x: number, y: number): string {
        const id = `room_${x}_${y}_${Math.floor(Math.random() * 1000)}`;
        const name = this.getRandomName();

        this.rooms[id] = {
            id: id,
            name: name,
            description: `A dark and spooky place at ${x},${y}.`,
            exits: {},
            x: x,
            y: y,
            coins: this.generateCoins(),
            items: [],
            locks: {}
        };
        return id;
    }

    connectRooms(id1: string, id2: string, dir: string): void {
        this.rooms[id1].exits[dir] = id2;
        const opp = this.getOppositeDirection(dir);
        if (opp) {
            this.rooms[id2].exits[opp] = id1;
        }
    }

    getOppositeDirection(dir: string): string {
        return OPPOSITE[dir];
    }
    getRandomName(): string {
        const base = ROOM_NAMES[Math.floor(Math.random() * ROOM_NAMES.length)];
        const suffix = Math.floor(Math.random() * 1000);
        return `${base} ${suffix}`;
    }

    isSolvable(): boolean {
        const visited = new Set<string>();
        const keys = new Set<string>();
        visited.add(this.roomIds[0]);

        // We need to simulate traversal.
        // Since collecting a key might open up previously visited rooms' locked exits,
        // we might need to revisit or re-evaluate reachable neighbors.
        // A simple approach:
        // Keep looping as long as we find something new (new room or new key).

        let changed = true;
        while (changed) {
            changed = false;

            // Check all visited rooms for new keys or new exits
            const currentVisited = Array.from(visited); // Snapshot

            for (const roomId of currentVisited) {
                const room = this.rooms[roomId];

                // Collect keys
                for (const item of room.items) {
                    if (item.id.startsWith('key_') && !keys.has(item.id)) {
                        keys.add(item.id);
                        changed = true;
                    }
                }

                // Check exits
                for (const [dir, nextRoomId] of Object.entries(room.exits)) {
                    if (!visited.has(nextRoomId)) {
                        // Check if locked
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

        console.log(`Solvability check: ${visited.size}/${NUM_ROOMS} rooms reachable.`);
        return visited.size === NUM_ROOMS;
    }

    generateCoins(): number {
        // Normal distribution approx: (u + v + w + x + y + z) - 3
        // Or Box-Muller. Let's stick to simple approximation or just summing randoms.
        // Mean 5, range 0-10.
        let sum = 0;
        for (let i = 0; i < 5; i++) sum += Math.random();
        // sum is 0-5. Multiply by 2 -> 0-10. Mean 5.
        return Math.floor(sum * 2);
    }

    placeItems(): void {
        const numItems = Math.floor(NUM_ROOMS / 3);
        for (let i = 0; i < numItems; i++) {
            const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
            const roomId = this.roomIds[Math.floor(Math.random() * NUM_ROOMS)];
            // Clone item to avoid reference issues
            this.rooms[roomId].items.push({ ...item, id: `${item.id}_${i}` });
        }
    }

    placeLocksAndKeys(): void {
        const numLocks = 5 + Math.floor(Math.random() * 5); // 5-10
        let locksPlaced = 0;
        let attempts = 0;

        while (locksPlaced < numLocks && attempts < 100) {
            attempts++;
            const roomId = this.roomIds[Math.floor(Math.random() * NUM_ROOMS)];
            const room = this.rooms[roomId];
            const exits = Object.keys(room.exits);

            if (exits.length > 0) {
                const dir = exits[Math.floor(Math.random() * exits.length)];

                // Check if already locked
                if (!room.locks[dir]) {
                    const keyId = `key_${locksPlaced}`;
                    const keyType = KEY_TYPES[locksPlaced % KEY_TYPES.length];

                    // Lock both sides
                    room.locks[dir] = keyId;
                    const neighborId = room.exits[dir];
                    const neighbor = this.rooms[neighborId];
                    neighbor.locks[this.getOppositeDirection(dir)] = keyId;

                    // Place key in a random DIFFERENT room
                    let keyRoomId;
                    do {
                        keyRoomId = this.roomIds[Math.floor(Math.random() * NUM_ROOMS)];
                    } while (keyRoomId === roomId || keyRoomId === neighborId);

                    this.rooms[keyRoomId].items.push({
                        id: keyId,
                        name: keyType.name,
                        description: keyType.desc
                    });

                    locksPlaced++;
                }
            }
        }
    }
}

// Check if run directly
if (require.main === module) {
    const generator = new MapGenerator();
    generator.generate();
}
