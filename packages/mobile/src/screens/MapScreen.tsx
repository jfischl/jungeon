import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '../context/GameContext';
import { colors, spacing } from '../theme';

export function MapScreen() {
    const minimap = useGameStore((state) => state.currentRoom?.minimap);
    const currentRoom = useGameStore((state) => state.currentRoom);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>World Map</Text>

            {currentRoom && (
                <Text style={styles.roomName}>{currentRoom.name}</Text>
            )}

            <View style={styles.mapContainer}>
                <Text style={styles.mapText}>
                    {minimap || 'Exploring...'}
                </Text>
            </View>

            <View style={styles.legend}>
                <Text style={styles.legendTitle}>Legend</Text>
                <Text style={styles.legendItem}>* = You are here</Text>
                <Text style={styles.legendItem}>P = Other player</Text>
                <Text style={styles.legendItem}>[ ] = Room</Text>
                <Text style={styles.legendItem}>- | = Passages</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.md,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.accent,
        fontFamily: 'monospace',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    roomName: {
        fontSize: 14,
        color: colors.highlight,
        fontFamily: 'monospace',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 8,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapText: {
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 16,
    },
    legend: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 8,
    },
    legendTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        fontFamily: 'monospace',
        marginBottom: spacing.xs,
    },
    legendItem: {
        fontSize: 12,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
});
