import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useGameClient, useGameStore } from '../context/GameContext';
import { DPad } from '../components/DPad';
import { ActionButtons } from '../components/ActionButtons';
import { colors, spacing } from '../theme';

export function GameScreen() {
    const [command, setCommand] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const client = useGameClient();
    const messages = useGameStore((state) => state.messages);
    const currentRoom = useGameStore((state) => state.currentRoom);
    const playerStats = useGameStore((state) => state.playerStats);

    const handleSubmit = () => {
        if (command.trim()) {
            client.sendCommand(command.trim());
            setCommand('');
        }
    };

    const handleDirection = (direction: string) => {
        client.sendCommand(direction);
    };

    const handleAction = (action: string) => {
        client.sendCommand(action);
    };

    const exits = currentRoom?.exits || [];

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <Text style={styles.statText}>
                    HP: {playerStats?.hp ?? 0}/{playerStats?.maxHp ?? 0}
                </Text>
                <Text style={styles.statText}>
                    LVL: {playerStats?.level ?? 1}
                </Text>
                <Text style={styles.statText}>
                    XP: {playerStats?.experience ?? 0}/100
                </Text>
            </View>

            {/* Chat Output */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.chatOutput}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg) => (
                    <Text key={msg.id} style={[styles.message, styles[msg.type] || styles.info]}>
                        {msg.text}
                    </Text>
                ))}
            </ScrollView>

            {/* Controls Area */}
            <View style={styles.controlsArea}>
                <View style={styles.controlsRow}>
                    <DPad
                        onDirection={handleDirection}
                        exits={exits}
                    />
                    <ActionButtons onAction={handleAction} />
                </View>

                {/* Command Input */}
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={command}
                        onChangeText={setCommand}
                        onSubmitEditing={handleSubmit}
                        placeholder="Enter command..."
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="send"
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statText: {
        color: colors.text,
        fontFamily: 'monospace',
        fontSize: 12,
    },
    chatOutput: {
        flex: 1,
        padding: spacing.sm,
    },
    message: {
        fontFamily: 'monospace',
        fontSize: 13,
        marginBottom: 4,
    },
    info: {
        color: colors.info,
    },
    error: {
        color: colors.error,
    },
    success: {
        color: colors.accent,
    },
    warning: {
        color: colors.highlight,
    },
    command: {
        color: colors.textMuted,
    },
    'room-title': {
        color: colors.highlight,
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: spacing.sm,
    },
    'room-desc': {
        color: colors.text,
    },
    controlsArea: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: spacing.sm,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    inputRow: {
        flexDirection: 'row',
    },
    input: {
        flex: 1,
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: 'monospace',
        fontSize: 14,
        padding: spacing.sm,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
});
