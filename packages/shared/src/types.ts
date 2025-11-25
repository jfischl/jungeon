export interface Item {
    id: string;
    name: string;
    description: string;
}

export interface Character {
    id: string;
    name: string;
    description: string;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
}

export interface Inventory {
    coins: number;
    items: Item[];
}

export interface Player {
    id: string; // Socket ID
    character: Character;
    roomId: string;
    inventory: Inventory;
    exploredRooms: Set<string>;
    // Combat stats
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    level: number;
    experience: number;
    inCombat: boolean;
    combatTarget: string | null;
    isDefending: boolean;
}

export interface Room {
    id: string;
    name: string;
    description: string;
    exits: Record<string, string>; // direction -> roomId
    x: number;
    y: number;
    coins: number;
    items: Item[];
    locks: Record<string, string>; // direction -> keyId
}

export interface WorldData {
    starting_room: string;
    rooms: Record<string, Room>;
}

export interface RoomDataPacket {
    name: string;
    desc: string;
    exits: string[];
    coins: number;
    players: string[];
    items: Item[];
    ghosts: string[];
    minimap: string;
    soundHint?: SoundHint;
}

// Sound hints that the server can send to trigger client-side audio
export type SoundHint =
    // Combat
    | 'attack'
    | 'attack-critical'
    | 'damage-taken'
    | 'defend'
    | 'flee'
    | 'flee-fail'
    | 'heal'
    | 'victory'
    | 'death'
    | 'level-up'
    // Movement & Environment
    | 'enter-room'
    | 'door-locked'
    | 'unlock'
    // Items
    | 'pickup-item'
    | 'pickup-coins'
    | 'drop'
    // Social
    | 'chat'
    | 'challenge-received'
    | 'challenge-sent'
    | 'duel-start'
    // Monsters
    | 'ghost-enters'
    | 'ghost-nearby'
    // Errors
    | 'error';
