# Mobile Client Implementation Plan

## Overview

Add React Native mobile client support while rewriting the web client in React, sharing common code via a monorepo structure.

**Branch:** `feature/mobile-client-monorepo`
**Merge to main:** After all 4 phases complete

## Target Architecture

```
/packages
  /shared          # Types, validators, socket protocol
  /client-core     # Shared client logic (platform agnostic)
  /web             # React web client
  /mobile          # React Native app (arcade-style UI)
/server            # Existing server (unchanged)
```

## Tech Stack

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | React 18 + Vite | React Native + Expo |
| State | Zustand | Zustand |
| Routing | React Router | React Navigation |
| Audio | Web Audio API | expo-av |
| Styling | CSS Modules or Tailwind | StyleSheet |

## Phase 1: Monorepo Setup & Refactor ✅ COMPLETE

**Goal:** Convert to monorepo, extract shared packages, keep existing client working

### Tasks
- [x] Set up npm/pnpm workspaces
- [x] Create packages directory structure
- [x] Move `shared/` to `packages/shared`
- [x] Create `packages/client-core` with:
  - [x] SocketService (connection, reconnection, event handling)
  - [x] GameStateManager (Zustand store for player, room, inventory)
  - [x] Typed event protocol (request/response schemas)
  - [x] SoundManager interface
- [x] Update existing client to use packages (via re-export shims)
- [x] Update server imports (via re-export shims)
- [x] Verify all tests pass (186 tests)
- [x] Verify existing web client works

### Definition of Done
- Monorepo structure in place ✅
- Existing vanilla client still works ✅
- All tests pass ✅
- Can run `npm install` from root and all packages install ✅

---

## Phase 2: React Web Client

**Goal:** Rewrite current vanilla TypeScript client in React, using client-core

### Tasks
- [ ] Create `packages/web` with React + Vite setup
- [ ] Implement React components:
  - [ ] App (main layout)
  - [ ] LoginOverlay (character selection)
  - [ ] ChatOutput (message display)
  - [ ] CommandInput (text input + buttons)
  - [ ] Minimap
  - [ ] StatsPanel
  - [ ] InventoryPanel
  - [ ] Controls (D-pad, action buttons)
- [ ] Integrate Zustand store from client-core
- [ ] Implement Web Audio sound playback
- [ ] Style to match current UI
- [ ] Remove old vanilla client
- [ ] Update build scripts

### Definition of Done
- React web client fully functional
- Feature parity with vanilla client
- All sounds working
- Deployable to production

---

## Phase 3: React Native Mobile

**Goal:** Create Expo app with arcade-style UI, sharing client-core

### Tasks
- [ ] Create `packages/mobile` with Expo setup
- [ ] Design arcade-style UI mockups
- [ ] Implement screens:
  - [ ] Login/Character Select
  - [ ] Main Game (visual room view)
  - [ ] Map (fullscreen minimap)
  - [ ] Inventory
  - [ ] Combat (visual health bars, animations)
  - [ ] Chat
- [ ] Implement navigation (React Navigation tabs)
- [ ] Implement controls:
  - [ ] D-pad or swipe for movement
  - [ ] Touch buttons for actions
  - [ ] Haptic feedback
- [ ] Implement expo-av sound playback
- [ ] Test on iOS simulator
- [ ] Test on Android emulator

### Definition of Done
- Mobile app runs on iOS and Android
- Core gameplay functional (move, look, combat, chat)
- Sounds and haptics working
- Can connect to production server

---

## Phase 4: Polish & Push Notifications

**Goal:** Add push notifications, polish both clients

### Tasks
- [ ] Set up expo-notifications
- [ ] Server-side notification triggers:
  - [ ] Ghost enters your room
  - [ ] PvP challenge received
  - [ ] Chat message when backgrounded
  - [ ] Combat damage when backgrounded
- [ ] Handle notification permissions
- [ ] Deep linking from notifications
- [ ] Polish and bug fixes on both clients
- [ ] Performance optimization
- [ ] Final testing on real devices

### Definition of Done
- Push notifications working on iOS and Android
- Both clients polished and stable
- Ready to merge to main

---

## Decisions Made

1. **Keep Socket.IO** - Best fit for real-time MUD gameplay
2. **Zustand for state** - Lightweight, works on both platforms
3. **Separate UIs** - Web keeps current layout, mobile gets arcade style
4. **Expo for mobile** - Easier setup, OTA updates, good ecosystem
5. **No offline support** - Not needed initially
6. **Push notifications** - Phase 4, for background events

## Notes

- Server code remains unchanged (only import paths may change)
- Production (main branch) unaffected until all phases complete
- Test on branch with local server during development
