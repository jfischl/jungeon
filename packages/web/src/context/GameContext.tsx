import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { GameClient, GameStore, GameStoreInstance } from '@jungeon/client-core';
import { WebSoundManager } from '../services/WebSoundManager';

interface GameContextValue {
  client: GameClient;
  store: GameStoreInstance;
}

const GameContext = createContext<GameContextValue | null>(null);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<GameClient | null>(null);
  const soundManagerRef = useRef<WebSoundManager | null>(null);

  if (!clientRef.current) {
    soundManagerRef.current = new WebSoundManager();
    clientRef.current = new GameClient({
      socketConfig: { serverUrl: SERVER_URL },
      soundManager: soundManagerRef.current,
    });
  }

  const value: GameContextValue = {
    client: clientRef.current,
    store: clientRef.current.getStore(),
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameClient(): GameClient {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameClient must be used within a GameProvider');
  }
  return context.client;
}

export function useGameStore<T>(selector: (state: GameStore) => T): T {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameStore must be used within a GameProvider');
  }

  const { store } = context;

  return useSyncExternalStore(
    (callback) => store.subscribe(callback),
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
