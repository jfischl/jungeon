import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../context/GameContext';
import { colors, spacing } from '../theme';

export function InventoryScreen() {
    const inventory = useGameStore((state) => state.inventory);
    const player = useGameStore((state) => state.player);
    const playerStats = useGameStore((state) => state.playerStats);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Inventory</Text>

            {/* Player Info */}
            {player && playerStats && (
                <View style={styles.playerCard}>
                    <Text style={styles.playerName}>{player.character.name}</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>HP</Text>
                            <Text style={styles.statValue}>{playerStats.hp}/{playerStats.maxHp}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>ATK</Text>
                            <Text style={styles.statValue}>{playerStats.attack}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>DEF</Text>
                            <Text style={styles.statValue}>{playerStats.defense}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>LVL</Text>
                            <Text style={styles.statValue}>{playerStats.level}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Gold */}
            <View style={styles.goldCard}>
                <Text style={styles.goldLabel}>Gold</Text>
                <Text style={styles.goldValue}>{inventory?.coins ?? 0}</Text>
            </View>

            {/* Items */}
            <Text style={styles.sectionTitle}>Items</Text>
            <ScrollView style={styles.itemList}>
                {inventory?.items && inventory.items.length > 0 ? (
                    inventory.items.map((item, index) => (
                        <View key={index} style={styles.itemCard}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            {item.description && (
                                <Text style={styles.itemDesc}>{item.description}</Text>
                            )}
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>Your inventory is empty</Text>
                )}
            </ScrollView>
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
        marginBottom: spacing.md,
    },
    playerCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    playerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.highlight,
        fontFamily: 'monospace',
        marginBottom: spacing.sm,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    statValue: {
        fontSize: 16,
        color: colors.text,
        fontFamily: 'monospace',
        fontWeight: 'bold',
    },
    goldCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.highlight,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    goldLabel: {
        fontSize: 16,
        color: colors.highlight,
        fontFamily: 'monospace',
        fontWeight: 'bold',
    },
    goldValue: {
        fontSize: 20,
        color: colors.highlight,
        fontFamily: 'monospace',
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        fontFamily: 'monospace',
        marginBottom: spacing.sm,
    },
    itemList: {
        flex: 1,
    },
    itemCard: {
        backgroundColor: colors.surface,
        borderRadius: 4,
        padding: spacing.sm,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemName: {
        fontSize: 14,
        color: colors.text,
        fontFamily: 'monospace',
    },
    itemDesc: {
        fontSize: 12,
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginTop: 2,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        fontFamily: 'monospace',
        textAlign: 'center',
        marginTop: spacing.lg,
    },
});
