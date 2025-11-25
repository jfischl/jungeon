import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';

interface ActionButtonsProps {
    onAction: (action: string) => void;
}

const actions = [
    { label: 'Look', command: 'look' },
    { label: 'Get', command: 'collect' },
    { label: 'Inv', command: 'inv' },
    { label: 'Drop', command: 'drop' },
];

export function ActionButtons({ onAction }: ActionButtonsProps) {
    const handlePress = (command: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAction(command);
    };

    return (
        <View style={styles.container}>
            {actions.map((action) => (
                <TouchableOpacity
                    key={action.command}
                    style={styles.button}
                    onPress={() => handlePress(action.command)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>{action.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    button: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surfaceLight,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    buttonText: {
        color: colors.text,
        fontFamily: 'monospace',
        fontSize: 12,
    },
});
