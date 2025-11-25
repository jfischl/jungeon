import React, { createContext, useContext, useRef, useSyncExternalStore } from 'react';
import Constants from 'expo-constants';
import { GameClient, GameStore, GameStoreInstance } from '@jungeon/client-core';
import { MobileSoundManager } from '../services/MobileSoundManager';

interface GameContextValue {
    client: GameClient;
    store: GameStoreInstance;
}

const GameContext = createContext<GameContextValue | null>(null);

// Get the dev server host from Expo (includes IP:port like "192.168.1.100:8081")
// Extract just the IP and use port 3000 for the game server
function getServerUrl(): string {
    const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
        const host = debuggerHost.split(':')[0];
        return `http://${host}:3000`;
    }
    // Fallback for simulator or when debuggerHost is unavailable
    return 'http://localhost:3000';
}

const SERVER_URL = getServerUrl();

export function GameProvider({ children }: { children: React.ReactNode }) {
    const clientRef = useRef<GameClient | null>(null);
    const soundManagerRef = useRef<MobileSoundManager | null>(null);

    if (!clientRef.current) {
        soundManagerRef.current = new MobileSoundManager();
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
