import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/context/GameContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <GameProvider>
                <AppNavigator />
                <StatusBar style="light" />
            </GameProvider>
        </SafeAreaProvider>
    );
}
