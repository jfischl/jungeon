import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import { GameScreen } from '../screens/GameScreen';
import { MapScreen } from '../screens/MapScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useGameStore } from '../context/GameContext';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.surface,
                    },
                    headerTintColor: colors.text,
                    headerTitleStyle: {
                        fontFamily: 'monospace',
                    },
                    tabBarStyle: {
                        backgroundColor: colors.surface,
                        borderTopColor: colors.border,
                    },
                    tabBarActiveTintColor: colors.accent,
                    tabBarInactiveTintColor: colors.textMuted,
                    tabBarLabelStyle: {
                        fontFamily: 'monospace',
                        fontSize: 10,
                    },
                }}
            >
                <Tab.Screen
                    name="Game"
                    component={GameScreen}
                    options={{
                        title: 'The Jungeon',
                        tabBarIcon: ({ focused }) => <Text style={{ opacity: focused ? 1 : 0.6 }}>⚔️</Text>,
                    }}
                />
                <Tab.Screen
                    name="Map"
                    component={MapScreen}
                    options={{
                        tabBarIcon: ({ focused }) => <Text style={{ opacity: focused ? 1 : 0.6 }}>🗺️</Text>,
                    }}
                />
                <Tab.Screen
                    name="Inventory"
                    component={InventoryScreen}
                    options={{
                        tabBarIcon: ({ focused }) => <Text style={{ opacity: focused ? 1 : 0.6 }}>🎒</Text>,
                    }}
                />
                <Tab.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={{
                        tabBarIcon: ({ focused }) => <Text style={{ opacity: focused ? 1 : 0.6 }}>💬</Text>,
                    }}
                />
            </Tab.Navigator>
    );
}

export function AppNavigator() {
    const isLoggedIn = useGameStore((state) => state.isLoggedIn);

    return (
        <NavigationContainer>
            {isLoggedIn ? <MainTabs /> : <LoginScreen />}
        </NavigationContainer>
    );
}
