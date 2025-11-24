import * as fs from 'fs';
import * as path from 'path';
import { WorldData, Room, Inventory, Character } from '../../shared/types';

export class WorldRepository {
    private dataDir: string;

    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadWorld(): WorldData | null {
        const worldPath = path.join(this.dataDir, 'world.json');
        if (!fs.existsSync(worldPath)) {
            return null;
        }
        try {
            const data = fs.readFileSync(worldPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error loading world:", e);
            return null;
        }
    }

    saveWorld(world: WorldData): void {
        const worldPath = path.join(this.dataDir, 'world.json');
        try {
            fs.writeFileSync(worldPath, JSON.stringify(world, null, 2));
        } catch (e) {
            console.error("Error saving world:", e);
        }
    }

    loadPlayers(): Record<string, { roomId: string; inventory: Inventory }> {
        const playersPath = path.join(this.dataDir, 'players.json');
        if (!fs.existsSync(playersPath)) {
            return {};
        }
        try {
            const data = fs.readFileSync(playersPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error loading players:", e);
            return {};
        }
    }

    savePlayers(players: Record<string, { roomId: string; inventory: Inventory }>): void {
        const playersPath = path.join(this.dataDir, 'players.json');
        try {
            fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
        } catch (e) {
            console.error("Error saving players:", e);
        }
    }

    loadCharacters(): Character[] {
        const charPath = path.join(this.dataDir, 'characters.json');
        if (!fs.existsSync(charPath)) {
            return [];
        }
        try {
            const data = fs.readFileSync(charPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error loading characters:", e);
            return [];
        }
    }
}
