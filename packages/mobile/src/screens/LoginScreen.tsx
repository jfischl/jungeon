import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameClient, useGameStore } from '../context/GameContext';
import { colors, spacing, globalStyles } from '../theme';
import type { Character } from '@jungeon/shared';

export function LoginScreen() {
    const client = useGameClient();
    const availableCharacters = useGameStore((state) => state.availableCharacters);
    const connectionState = useGameStore((state) => state.connectionState);

    const handleSelectCharacter = (character: Character) => {
        client.login(character.id);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>The Jungeon</Text>
                <Text style={styles.subtitle}>
                    {connectionState === 'connected'
                        ? 'Select your character to enter:'
                        : 'Connecting to server...'}
                </Text>
            </View>

            <ScrollView style={styles.characterList} contentContainerStyle={styles.characterListContent}>
                {availableCharacters.map((character) => (
                    <TouchableOpacity
                        key={character.id}
                        style={styles.characterCard}
                        onPress={() => handleSelectCharacter(character)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.characterName}>{character.name}</Text>
                        <Text style={styles.characterDesc}>{character.description}</Text>
                        <View style={styles.statsRow}>
                            <Text style={styles.stat}>HP: {character.baseHp}</Text>
                            <Text style={styles.stat}>ATK: {character.baseAttack}</Text>
                            <Text style={styles.stat}>DEF: {character.baseDefense}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.accent,
        fontFamily: 'monospace',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    characterList: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    characterListContent: {
        paddingBottom: spacing.xl,
    },
    characterCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    characterName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.highlight,
        fontFamily: 'monospace',
        marginBottom: spacing.xs,
    },
    characterDesc: {
        fontSize: 12,
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginBottom: spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    stat: {
        fontSize: 12,
        color: colors.text,
        fontFamily: 'monospace',
    },
});
