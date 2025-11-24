# Jungeon Refactoring Implementation Plan

## Overview
This plan addresses technical debt and test coverage gaps identified in the architecture review. Work is prioritized by value/effort ratio and organized into 2 sprints.

## Completed Work (Phase 1)

### ✅ High-Value Quick Wins (Completed)
- **Fixed flaky test**: SharedCombat.test.ts respawn test converted to deterministic unit test
- **Type safety**: Removed `any` types from AttackCommand.ts (Player, Ghost)
- **Security tests**: Added 28 comprehensive validator tests (XSS, SQL injection, command injection)
- **Manager tests**: Added 20 unit tests (PlayerManager: 10, GhostManager: 10)
- **Result**: 101/101 tests passing ✅

## Sprint 1: Remove Proxy Layers + Add Missing Tests (6-8 hours)

### ✅ Task 1.1: Remove Proxy Abstraction (COMPLETED)
**Goal**: Eliminate 35 LOC of unnecessary proxy layer, replace with direct manager calls

**Completed Changes**:
1. ✅ Updated 9 command files (17 usages total):
   - `server/commands/AttackCommand.ts` (5 usages)
   - `server/commands/ChallengeCommand.ts` (2 usages)
   - `server/commands/FleeCommand.ts` (1 usage)
   - `server/commands/DefendCommand.ts` (1 usage)
   - `server/commands/HealCommand.ts` (1 usage)
   - `server/commands/AcceptCommand.ts` (2 usages)
   - `server/commands/UnlockCommand.ts` (2 usages)
   - `server/commands/ExamineCommand.ts` (2 usages)
2. ✅ Removed proxy definitions from `server/game.ts` (37 lines removed)
3. ✅ Made managers public (playerManager, roomManager, ghostManager)
4. ✅ Updated 12 test files to use manager methods
5. ✅ All 107 tests passing

**Pattern Applied**:
```typescript
// BEFORE:
const player = game.players.get(socket.id);
const ghost = game.ghosts.find(...);
const room = game.rooms[roomId];

// AFTER:
const player = game.playerManager.getPlayer(socket.id);
const ghost = game.ghostManager.getAllGhosts().find(...);
const room = game.roomManager.getRoom(roomId);
```

**Verification**: ✅ All 107 tests passing

### Task 1.2: Add Missing Test Coverage (2-3 hours)
**Goal**: Achieve >80% coverage for untested command categories

**Tests to Add**:

1. **`server/commands/SocialCommands.test.ts`** (NEW - 6 tests)
   - SayCommand: broadcast to room, empty message handling
   - EmoteCommand: broadcast emote, empty emote handling
   - Multiplayer scenarios

2. **`server/commands/ItemCommands.test.ts`** (NEW - 8 tests)
   - GetCommand: pick up items, pick up coins, invalid item
   - DropCommand: drop items, drop coins, invalid item
   - ExamineCommand: examine items in room/inventory
   - UnlockCommand: unlock door with key, missing key, already unlocked

3. **`server/managers/RoomManager.test.ts`** (NEW - 6 tests)
   - getRoomExits: get available directions
   - hasLock: check door lock status
   - removeLock: unlock door
   - addItem/removeItem: room item management

**Verification**: Run `npm test -- --coverage` to verify >80% coverage

## Sprint 2: Split GameManager God Object (6-8 hours)

### Task 2.1: Extract ConnectionManager (2 hours)
**Responsibility**: Handle player connections, disconnections, login

**New File**: `server/managers/ConnectionManager.ts`

```typescript
export class ConnectionManager {
    constructor(
        private playerManager: PlayerManager,
        private roomManager: RoomManager,
        private ghostManager: GhostManager
    ) {}

    handleConnection(socket: Socket): void { /* ... */ }
    handleLogin(socket: Socket, characterId: string): void { /* ... */ }
    handleDisconnect(socket: Socket): void { /* ... */ }
}
```

**Extract from GameManager**:
- `handleConnection()` (lines 149-169)
- `handleLogin()` (lines 171-229)
- `handleDisconnect()` (lines 231-249)

### Task 2.2: Extract CommandRegistry (1 hour)
**Responsibility**: Register and execute commands

**New File**: `server/commands/CommandRegistry.ts`

```typescript
export class CommandRegistry {
    private commands = new Map<string, Command>();

    register(name: string, command: Command): void { /* ... */ }
    execute(name: string, socket: Socket, args: string, game: GameManager): void { /* ... */ }
}
```

**Extract from GameManager**:
- `registerCommands()` (lines 251-276)
- Command map storage

### Task 2.3: Extract WorldService (2 hours)
**Responsibility**: Room data, world state, minimap generation

**New File**: `server/services/WorldService.ts`

```typescript
export class WorldService {
    constructor(
        private roomManager: RoomManager,
        private playerManager: PlayerManager
    ) {}

    getRoomData(player: Player): RoomDataPacket { /* ... */ }
    getMinimap(player: Player): string { /* ... */ }
    getRandomRoomId(): string { /* ... */ }
    broadcastToRoom(roomId: string, message: string, excludeId?: string): void { /* ... */ }
}
```

**Extract from GameManager**:
- `getRoomData()` (lines 356-400)
- `getMinimap()` (lines 402-446)
- `getRandomRoomId()` (lines 448-452)
- `broadcastToRoom()` (lines 454-462)

### Task 2.4: Create GameFacade (1 hour)
**Responsibility**: Thin orchestrator, delegates to services

**Refactored**: `server/game.ts` (reduce from 616 to ~200 lines)

```typescript
export class GameManager {
    constructor(io: Server) {
        // Initialize managers
        this.playerManager = new PlayerManager();
        this.roomManager = new RoomManager();
        this.ghostManager = new GhostManager(() => this.worldService.getRandomRoomId());
        this.combatManager = new CombatManager();

        // Initialize services
        this.worldService = new WorldService(this.roomManager, this.playerManager);
        this.connectionManager = new ConnectionManager(
            this.playerManager,
            this.roomManager,
            this.ghostManager
        );
        this.commandRegistry = new CommandRegistry();

        this.setupSocketHandlers();
        this.startGhostMovement();
    }
}
```

## Architecture Impact

### Before Refactoring
```
GameManager (616 lines, 38 methods)
├── Player CRUD (proxy layer)
├── Room CRUD (proxy layer)
├── Ghost CRUD (proxy layer)
├── Connection handling
├── Command registry
├── Combat coordination
├── World state
└── Persistence
```

### After Refactoring
```
GameManager (facade, ~200 lines)
├── ConnectionManager (connection lifecycle)
├── CommandRegistry (command dispatch)
├── WorldService (room data, minimap, broadcast)
├── PlayerManager (player CRUD)
├── RoomManager (room CRUD)
├── GhostManager (ghost CRUD, spawning)
└── CombatManager (combat logic, XP, death)
```

## Benefits

1. **Testability**: Each service can be unit tested in isolation
2. **Single Responsibility**: Each class has one clear purpose
3. **Dependency Injection**: Services receive dependencies via constructor
4. **No Breaking Changes**: Public API remains identical for commands
5. **Incremental Migration**: Can refactor one service at a time

## Risk Mitigation

1. **Test Coverage First**: Sprint 1 adds tests before refactoring
2. **Run Tests After Each Change**: Catch regressions immediately
3. **Keep Commits Small**: Easy to revert if issues arise
4. **No Behavior Changes**: Only reorganize code, don't change logic

## Estimated Timeline

- **Sprint 1**: 6-8 hours (proxy removal + tests)
- **Sprint 2**: 6-8 hours (GameManager split)
- **Total**: 12-16 hours

## Success Metrics

- ✅ All 101+ tests passing
- ✅ >80% code coverage
- ✅ GameManager reduced from 616 to ~200 lines
- ✅ Zero proxy abstraction layers
- ✅ All services follow Single Responsibility Principle
