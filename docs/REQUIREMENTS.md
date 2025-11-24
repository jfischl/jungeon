# Project Tasks & Requirements

## Phase 1: Core Combat System (Completed)
- [x] **Player Stats**
  - [x] Add HP, MaxHP, Attack, Defense, Level, Experience to Player interface
  - [x] Initialize stats based on Character class
- [x] **Combat Engine**
  - [x] Implement `CombatManager` class
  - [x] Damage calculation formula (Attack vs Defense + RNG)
  - [x] Critical hit system
  - [x] Death handling (Respawn at start, XP penalty)
- [x] **Basic Combat Commands**
  - [x] `attack <target>` command implementation
  - [x] Turn-based combat loop

## Phase 2: Ghost Combat - PvE (Completed)
- [x] **Ghost Implementation**
  - [x] Define Ghost stats (HP, Atk, Def, Gold)
  - [x] Spawn ghosts in random rooms
  - [x] Ghost respawn logic (5 minute timer)
- [x] **Cooperative Combat**
  - [x] **Shared Combat**: Allow multiple players to attack one ghost
  - [x] **Reward Splitting**: Split Gold and XP equally among all participants
  - [x] **Multi-Target Attacks**: Ghosts counter-attack all active combatants
  - [x] **Loot System**: Gold rewards added to inventory

## Phase 3: PvP System (Completed)
- [x] **Challenge System**
  - [x] Implement `challenge <player>` command
  - [x] Implement `accept` command
  - [x] Challenge timeout (15 seconds)
  - [x] Track pending challenges in GameManager
- [x] **PvP Combat Flow**
  - [x] PvP-specific damage calculation
  - [x] Strict turn-based enforcement (optional/loose for now)
  - [x] **Rewards**: Winner steals 30% of loser's gold
  - [x] **Death**: Loser respawns at starting room
- [x] **Safeguards**
  - [x] **Safe Zones**: No combat in starting room
  - [x] **Newbie Protection**: Cannot attack players < Level 3

## Phase 4: Progression & Polish (Completed)
- [x] **Advanced Commands**
  - [x] `flee`: 70% chance to escape combat
  - [x] `block` / `defend`: Reduce incoming damage by 50%
  - [x] `heal` / `drink`: Use potion to restore 30 HP
- [x] **Leveling System**
  - [x] XP thresholds (100 XP per level)
  - [x] Stat growth on level up (+10 HP, +1 Atk, +1 Def)
  - [x] Full heal on level up
- [x] **UI & Feedback**
  - [x] Real-time stats display in client sidebar
  - [x] Combat notifications and logs
  - [x] Inventory updates

## Verification
- [x] **Integration Tests**
  - [x] `AttackCommand.test.ts` (Core combat)
  - [x] `SharedCombat.test.ts` (Co-op mechanics)
  - [x] `PvP.test.ts` (Duel mechanics)
  - [x] `CombatCommands.test.ts` (Flee/Heal/Defend)
