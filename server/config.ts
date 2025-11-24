/**
 * Game Configuration Constants
 *
 * This file centralizes all game balance parameters and magic numbers
 * for easy tuning without modifying core logic.
 */

export const CONFIG = {
    // Combat Settings
    COMBAT: {
        CRITICAL_HIT_CHANCE: 0.1,           // 10% chance for critical hits
        CRITICAL_HIT_MULTIPLIER: 2,         // Critical hits deal 2x damage
        DEFEND_DAMAGE_REDUCTION: 0.5,       // Defending reduces damage by 50%
        MINIMUM_DAMAGE: 1,                  // Minimum damage dealt per attack
    },

    // Healing
    HEALING: {
        POTION_HEAL_AMOUNT: 30,             // HP restored by healing potions
    },

    // Level Progression
    LEVELING: {
        XP_PER_LEVEL: 100,                  // XP required per level
        HP_PER_LEVEL: 10,                   // HP gained per level
        ATTACK_PER_LEVEL: 1,                // Attack gained per level
        DEFENSE_PER_LEVEL: 1,               // Defense gained per level
    },

    // Death Penalties & Rewards
    DEATH: {
        GOLD_LOSS_PERCENTAGE: 0.3,          // Lose 30% of gold on death
        MAX_GOLD_LOSS: 50,                  // Maximum coins lost on death
        XP_LOSS: 25,                        // XP lost on death
        PVP_XP_REWARD: 50,                  // XP gained for winning PvP
    },

    // PvP Settings
    PVP: {
        CHALLENGE_TIMEOUT_MS: 15000,        // 15 seconds to accept challenge
        NEWBIE_PROTECTION_LEVEL: 3,         // Players under level 3 cannot be challenged
    },

    // Ghost/NPC Settings
    GHOSTS: {
        MOVE_INTERVAL_MS: 15000,            // Ghosts move every 15 seconds
        RESPAWN_TIME_MS: 300000,            // Ghosts respawn after 5 minutes (300 seconds)
        DEFAULT_SPAWNS: [
            { name: "Hooded Figure", desc: "A mysterious figure in dark robes.", hp: 40, maxHp: 40, attack: 12, defense: 5, goldReward: 20 },
            { name: "Skeleton Knight", desc: "An undead warrior with rusted armor.", hp: 45, maxHp: 45, attack: 15, defense: 8, goldReward: 25 },
            { name: "The Chain Rattler", desc: "Covered in heavy iron chains.", hp: 50, maxHp: 50, attack: 18, defense: 3, goldReward: 30 }
        ]
    },

    // Map Generation
    MAP: {
        ROOM_COUNT: 100,                    // Total rooms in generated map
        MIN_LOCKS: 5,                       // Minimum locked doors
        MAX_LOCKS: 10,                      // Maximum locked doors
        MAX_LOCK_ATTEMPTS: 100,             // Max attempts to place locks before giving up
    }
} as const;

// Export type for type safety
export type GameConfig = typeof CONFIG;
