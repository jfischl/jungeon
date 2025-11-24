import { CONFIG } from '../config';

export interface Ghost {
    name: string;
    desc: string;
    roomId: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    goldReward: number;
    combatants: Set<string>; // Player IDs fighting this ghost
}

/**
 * GhostManager - Manages all ghost/NPC operations
 * Handles ghost spawning, movement, and combat tracking
 */
export class GhostManager {
    private ghosts: Ghost[];
    private moveInterval?: NodeJS.Timeout;
    private getRandomRoomId: () => string;
    private getNearbyRoomId?: (startingRoomId: string) => string;

    constructor(getRandomRoomIdFn: () => string, getNearbyRoomIdFn?: (startingRoomId: string) => string) {
        this.ghosts = [];
        this.getRandomRoomId = getRandomRoomIdFn;
        this.getNearbyRoomId = getNearbyRoomIdFn;
    }

    /**
     * Spawn initial ghosts from config
     */
    spawnInitialGhosts(startingRoomId?: string): void {
        this.ghosts = CONFIG.GHOSTS.DEFAULT_SPAWNS.map((spawn, index) => {
            // Spawn first ghost near starting room if available
            let roomId: string;
            if (index === 0 && startingRoomId && this.getNearbyRoomId) {
                roomId = this.getNearbyRoomId(startingRoomId);
            } else {
                roomId = this.getRandomRoomId();
            }

            return {
                ...spawn,
                roomId,
                combatants: new Set<string>()
            };
        });
    }

    /**
     * Start ghost movement loop
     */
    startMovementLoop(moveGhostsCallback: () => void): void {
        this.moveInterval = setInterval(() => {
            moveGhostsCallback();
        }, CONFIG.GHOSTS.MOVE_INTERVAL_MS);
    }

    /**
     * Stop ghost movement loop
     */
    stopMovementLoop(): void {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
        }
    }

    /**
     * Get all ghosts
     */
    getAllGhosts(): Ghost[] {
        return this.ghosts;
    }

    /**
     * Get ghosts in a specific room
     */
    getGhostsInRoom(roomId: string): Ghost[] {
        return this.ghosts.filter(g => g.roomId === roomId);
    }

    /**
     * Find ghost by name (case-insensitive)
     */
    findGhostByName(name: string, roomId?: string): Ghost | undefined {
        const lowerName = name.toLowerCase();
        return this.ghosts.find(g =>
            g.name.toLowerCase().includes(lowerName) &&
            (!roomId || g.roomId === roomId)
        );
    }

    /**
     * Remove a ghost (when killed)
     */
    removeGhost(ghost: Ghost): void {
        const index = this.ghosts.indexOf(ghost);
        if (index !== -1) {
            this.ghosts.splice(index, 1);
        }
    }

    /**
     * Schedule ghost respawn
     */
    scheduleRespawn(ghost: Ghost): void {
        setTimeout(() => {
            ghost.hp = ghost.maxHp;
            ghost.roomId = this.getRandomRoomId();
            ghost.combatants = new Set();
            this.ghosts.push(ghost);
        }, CONFIG.GHOSTS.RESPAWN_TIME_MS);
    }

    /**
     * Move a ghost to a random adjacent room
     */
    moveGhost(ghost: Ghost, exits: string[], getExitRoomId: (dir: string) => string | undefined): void {
        if (exits.length === 0) return;

        const randomDir = exits[Math.floor(Math.random() * exits.length)];
        const nextRoomId = getExitRoomId(randomDir);

        if (nextRoomId) {
            ghost.roomId = nextRoomId;
        }
    }

    /**
     * Add combatant to ghost
     */
    addCombatant(ghost: Ghost, playerId: string): void {
        ghost.combatants.add(playerId);
    }

    /**
     * Remove combatant from ghost
     */
    removeCombatant(ghost: Ghost, playerId: string): void {
        ghost.combatants.delete(playerId);
    }

    /**
     * Remove player from all ghosts' combatant lists
     */
    removePlayerFromAllCombat(playerId: string): void {
        this.ghosts.forEach(ghost => {
            ghost.combatants.delete(playerId);
        });
    }

    /**
     * Get count of ghosts
     */
    count(): number {
        return this.ghosts.length;
    }
}
