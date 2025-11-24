# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Jungeon is a text-based Multi-User Dungeon (MUD) featuring real-time multiplayer, procedurally generated maps, and a combat system with both PvE and PvP modes. Built with Node.js, Socket.IO, TypeScript, and Vite.

## Development Commands

### Build & Run
```bash
npm install              # Install dependencies
npm run build:server     # Build server-side TypeScript
npm run build            # Build client-side assets with Vite
npm start                # Start production server (requires built files)
npm run start:dev        # Start dev server with ts-node
npm run dev              # Start Vite dev server (client only)
```

### Testing
```bash
npm test                 # Run all Jest integration tests
npm test -- --testNamePattern="<pattern>"  # Run specific test
npm test -- AttackCommand.test.ts         # Run specific file
```

### Map Generation
```bash
npm run start:dev -- --generate  # Generate new 100-room procedural map
```

## Architecture

### Server-Side (server/)

**GameManager** (`server/game.ts`)
- Central game state manager: players, rooms, ghosts, combat
- Socket.IO event handling (connection, login, commands)
- Command pattern registry: all commands registered in `registerCommands()`
- Persistence: auto-saves player/world state via WorldRepository
- Ghost AI: 15-second movement loop for wandering NPCs

**CombatManager** (`server/CombatManager.ts`)
- Damage calculation: dice rolls, critical hits, defense
- Level progression: 100 XP per level, stat growth (+10 HP, +1 ATK/DEF)
- Death handling: respawn, gold transfer, XP penalties
- Shared combat support: multiple players vs single ghost

**MapGenerator** (`server/map-generator.ts`)
- Procedural generation: 100 rooms via random walk algorithm
- Lock & key system: 5-10 locked doors with keys placed in separate rooms
- Solvability verification: ensures all rooms reachable with proper key collection
- Grid-based coordinates: rooms stored with (x,y) positions for minimap

**Command Pattern** (`server/commands/`)
- All commands extend `Command` interface with `execute(socket, args, game)`
- Combat: `AttackCommand`, `FleeCommand`, `DefendCommand`, `HealCommand`
- PvP: `ChallengeCommand`, `AcceptCommand`
- Movement: `MoveCommand` (handles locked doors)
- Social: `SayCommand`, `EmoteCommand`
- Items: `GetCommand`, `DropCommand`, `UnlockCommand`, `ExamineCommand`

**Data Layer** (`server/data/`)
- `WorldRepository.ts`: JSON persistence for world/player state
- `world.json`: Room graph, items, locks, coins
- `players.json`: Player inventory, location, exploration state
- `characters.json`: 10 character classes with base stats

### Client-Side (client/)

**main.ts**
- Socket.IO client: handles real-time updates
- UI rendering: command output, stats panel, inventory, minimap
- Command input: text input + on-screen button controls

### Shared Types (shared/types.ts)

Key interfaces:
- `Player`: id, character, roomId, inventory, combat stats (hp, attack, defense, level, xp)
- `Room`: id, name, description, exits (Record<direction, roomId>), x/y coords, items, coins, locks
- `Character`: 10 classes with baseHp, baseAttack, baseDefense
- `WorldData`: starting_room, rooms map
- `Inventory`: coins, items[]

## Key System Details

### Combat Flow

**PvE (Ghost Combat)**
1. Player uses `attack <ghost>` to initiate combat
2. Turn-based: player attacks, ghost attacks back
3. Shared combat: multiple players can fight same ghost, combatants tracked in `ghost.combatants` Set
4. Rewards split equally: gold and XP divided among all participants
5. Ghost respawns 5 minutes after death

**PvP (Duels)**
1. `challenge <player>` sends duel request (15-second timeout)
2. `accept` starts turn-based duel
3. Winner gets 30% of loser's gold, loser respawns at start
4. Safeguards: newbie protection (level < 3), safe zones (starting room)

### State Management

**Player State**
- Persisted: roomId, inventory (coins, items), exploredRooms (for minimap)
- Runtime: hp, maxHp, attack, defense, level, experience, inCombat, combatTarget, isDefending
- Combat stats initialized from character base stats on login

**Ghost State**
- Runtime only (not persisted)
- Each ghost tracks: hp, maxHp, attack, defense, goldReward, roomId, combatants (Set of player IDs)
- Three ghosts spawn on server start, wander every 15 seconds

### Minimap System

- 7x7 grid centered on player
- Only shows explored rooms (`player.exploredRooms` Set)
- Current position marked with `*`, other players marked with `P`
- Displays exits as `-` (east) and `|` (south)

## Testing Strategy

Integration tests cover:
- Combat mechanics: `AttackCommand.test.ts` (10 tests)
- Shared ghost combat: `SharedCombat.test.ts` (6 tests)
- Combat commands: `CombatCommands.test.ts` (10 tests - flee, defend, heal)
- PvP system: `PvP.test.ts` (6 tests)
- Ghost movement: `GhostMovement.test.ts` (3 tests)
- Map generation: `solvability.test.ts`

Tests use mock Socket.IO and in-memory game state.

### Fake Timers in Tests

**IMPORTANT:** Tests that execute commands which create `setTimeout` calls MUST use fake timers to prevent open handles and worker warnings.

Commands that create pending timers:
- `AttackCommand.execute()` - Creates 1500ms setTimeout for ghost counter-attack
- `ChallengeCommand.execute()` - Creates 15-second setTimeout for challenge expiration
- Ghost death - Triggers `scheduleRespawn()` with 5-minute setTimeout

**Required pattern for tests calling these commands:**

```typescript
it('test description', () => {
    jest.useFakeTimers();

    // Test setup
    const player = gameManager.playerManager.getPlayer(mockSocket.id);

    // Execute command that creates setTimeout
    attackCommand.execute(mockSocket, 'ghost', gameManager);

    // Assertions
    expect(player.inCombat).toBe(true);

    // CRITICAL: Flush all pending timers before test ends
    jest.runAllTimers();
    jest.useRealTimers();
});
```

**DO NOT use fake timers for:**
- Tests that don't call commands creating timers
- Tests that only set up state without executing commands
- Tests using `done` callbacks for async operations (convert to fake timers instead)

**Cleanup:**
- All test files already have `afterEach(() => gameManager.ghostManager.stopMovementLoop())` to prevent ghost movement interval leaks
- Always call `jest.useRealTimers()` at the end of each test using fake timers

### localStorage Warning (Expected and Harmless)

When running tests, you will see this warning:
```
(node:XXXXX) Warning: `--localstorage-file` was provided without a valid path
```

**This warning is expected and harmless.** Here's why:

1. **Root Cause**: Socket.IO client (used in integration tests) needs `localStorage` API
2. **Node.js v18+ behavior**: Has built-in `localStorage` that expects `--localstorage-file` CLI flag
3. **Jest cleanup phase**: When Jest tears down test environment, it accesses `global.localStorage`, triggering Node's internal webstorage getter which emits this warning
4. **Our mock**: `jest.setup.js` provides a working `localStorage` implementation for tests, but cannot prevent Jest from accessing Node's internal property during cleanup

**Why jsdom environment doesn't work:**
- This is a **server-side Node.js application** (not a browser app)
- The jsdom environment lacks Node.js globals like `TextEncoder`, `Buffer`, etc.
- Switching to jsdom breaks all server tests with `TextEncoder is not defined` errors
- The jsdom solution is only for browser-based applications (React, Vue, etc.)

**Resolution**: Accept the warning as cosmetic. All tests pass successfully and the warning has no functional impact.

## Important Notes

- The project uses CommonJS (`"type": "commonjs"` in package.json)
- TypeScript strict mode enabled
- Client built with Vite, server built with `tsc`
- Server runs on port 3000 (configurable via PORT env var)
- CORS enabled for Socket.IO (`origin: "*"`)
