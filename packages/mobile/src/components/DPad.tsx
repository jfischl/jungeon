import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';

interface DPadProps {
    onDirection: (direction: string) => void;
    exits: string[];
}

export function DPad({ onDirection, exits }: DPadProps) {
    const hasExit = (dir: string) => exits.includes(dir);

    const handlePress = (direction: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDirection(direction);
    };

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <View style={styles.spacer} />
                <TouchableOpacity
                    style={[styles.button, !hasExit('north') && styles.disabled]}
                    onPress={() => handlePress('n')}
                    disabled={!hasExit('north')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>N</Text>
                </TouchableOpacity>
                <View style={styles.spacer} />
            </View>
            <View style={styles.row}>
                <TouchableOpacity
                    style={[styles.button, !hasExit('west') && styles.disabled]}
                    onPress={() => handlePress('w')}
                    disabled={!hasExit('west')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>W</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, !hasExit('south') && styles.disabled]}
                    onPress={() => handlePress('s')}
                    disabled={!hasExit('south')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>S</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, !hasExit('east') && styles.disabled]}
                    onPress={() => handlePress('e')}
                    disabled={!hasExit('east')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>E</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    spacer: {
        width: 44,
        height: 44,
    },
    button: {
        width: 44,
        height: 44,
        backgroundColor: colors.surfaceLight,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    disabled: {
        opacity: 0.3,
    },
    buttonText: {
        color: colors.text,
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
