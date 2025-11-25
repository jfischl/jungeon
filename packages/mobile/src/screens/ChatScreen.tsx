import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useGameClient, useGameStore } from '../context/GameContext';
import { colors, spacing } from '../theme';

export function ChatScreen() {
    const [message, setMessage] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const client = useGameClient();
    const messages = useGameStore((state) => state.messages);
    const currentRoom = useGameStore((state) => state.currentRoom);

    const handleSend = () => {
        if (message.trim()) {
            client.sendCommand(`say ${message.trim()}`);
            setMessage('');
        }
    };

    // Filter to show only chat-relevant messages
    const chatMessages = messages.filter(
        (msg) => msg.type === 'info' || msg.type === 'command'
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            {/* Room info */}
            <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{currentRoom?.name || 'Unknown'}</Text>
                {currentRoom?.players && currentRoom.players.length > 0 && (
                    <Text style={styles.playersHere}>
                        Also here: {currentRoom.players.join(', ')}
                    </Text>
                )}
            </View>

            {/* Chat messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messageList}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {chatMessages.slice(-50).map((msg) => (
                    <View key={msg.id} style={styles.messageRow}>
                        <Text style={[styles.messageText, msg.type === 'command' ? styles.ownMessage : styles.otherMessage]}>
                            {msg.text}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {/* Input area */}
            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    roomInfo: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    roomName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.highlight,
        fontFamily: 'monospace',
    },
    playersHere: {
        fontSize: 12,
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginTop: 2,
    },
    messageList: {
        flex: 1,
        padding: spacing.sm,
    },
    messageRow: {
        marginBottom: spacing.xs,
    },
    messageText: {
        fontSize: 13,
        fontFamily: 'monospace',
    },
    ownMessage: {
        color: colors.textMuted,
    },
    otherMessage: {
        color: colors.text,
    },
    inputArea: {
        flexDirection: 'row',
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        marginRight: spacing.sm,
    },
    sendButton: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.md,
        borderRadius: 4,
        justifyContent: 'center',
    },
    sendButtonText: {
        color: colors.background,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
