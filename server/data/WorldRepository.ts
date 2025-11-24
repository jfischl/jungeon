import * as fs from 'fs';
import * as path from 'path';
import { WorldData, Room, Inventory, Character } from '../../shared/types';
import logger from '../logger';

export class WorldRepository {
    private dataDir: string;

    constructor() {
        this.dataDir = path.join(process.cwd(), 'server/data');
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadWorld(): WorldData | null {
        const worldPath = path.join(this.dataDir, 'world.json');
        if (!fs.existsSync(worldPath)) {
            logger.warn({ path: worldPath }, 'World file not found');
            return null;
        }
        try {
            const data = fs.readFileSync(worldPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            logger.error({ error: e, path: worldPath }, 'Failed to load world data');
            return null;
        }
    }

    saveWorld(world: WorldData): void {
        const worldPath = path.join(this.dataDir, 'world.json');
        try {
            fs.writeFileSync(worldPath, JSON.stringify(world, null, 2));
            logger.debug({ path: worldPath }, 'World data saved');
        } catch (e) {
            logger.error({ error: e, path: worldPath }, 'Failed to save world data');
        }
    }

    loadPlayers(): Record<string, { roomId: string; inventory: Inventory }> {
        const playersPath = path.join(this.dataDir, 'players.json');
        if (!fs.existsSync(playersPath)) {
            logger.debug({ path: playersPath }, 'No saved players file found, starting fresh');
            return {};
        }
        try {
            const data = fs.readFileSync(playersPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            logger.error({ error: e, path: playersPath }, 'Failed to load player data');
            return {};
        }
    }

    savePlayers(players: Record<string, { roomId: string; inventory: Inventory }>): void {
        const playersPath = path.join(this.dataDir, 'players.json');
        try {
            fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
            logger.debug({ path: playersPath, count: Object.keys(players).length }, 'Player data saved');
        } catch (e) {
            logger.error({ error: e, path: playersPath }, 'Failed to save player data');
        }
    }

    loadCharacters(): Character[] {
        const charPath = path.join(this.dataDir, 'characters.json');
        if (!fs.existsSync(charPath)) {
            logger.error({ path: charPath }, 'Characters file not found');
            return [];
        }
        try {
            const data = fs.readFileSync(charPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            logger.error({ error: e, path: charPath }, 'Failed to load character data');
            return [];
        }
    }
}
