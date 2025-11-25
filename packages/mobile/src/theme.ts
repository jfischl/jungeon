import { StyleSheet } from 'react-native';

export const colors = {
    background: '#1a1a1a',
    surface: '#222222',
    surfaceLight: '#333333',
    text: '#e0e0e0',
    textMuted: '#888888',
    accent: '#4caf50',
    highlight: '#ff9800',
    error: '#ff5252',
    info: '#64b5f6',
    border: '#444444',
};

export const fonts = {
    mono: 'monospace',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    text: {
        color: colors.text,
        fontFamily: fonts.mono,
        fontSize: 14,
    },
    textMuted: {
        color: colors.textMuted,
        fontFamily: fonts.mono,
        fontSize: 12,
    },
    title: {
        color: colors.highlight,
        fontFamily: fonts.mono,
        fontSize: 20,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    button: {
        backgroundColor: colors.surfaceLight,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    buttonText: {
        color: colors.text,
        fontFamily: fonts.mono,
        fontSize: 14,
        textAlign: 'center',
    },
});
