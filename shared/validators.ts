/**
 * Shared Validation Layer
 *
 * This module provides input validation utilities that can be used on both
 * client (for immediate user feedback) and server (for security/data integrity).
 */

// Valid directions for movement
export const VALID_DIRECTIONS = ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'] as const;
export type Direction = typeof VALID_DIRECTIONS[number];

// Valid command names
export const VALID_COMMANDS = [
    'north', 'south', 'east', 'west', 'n', 's', 'e', 'w',
    'look', 'l',
    'get', 'collect',
    'drop',
    'inventory', 'inv', 'i',
    'say',
    'emote', 'em',
    'examine', 'ex',
    'unlock',
    'attack', 'kill',
    'flee', 'run',
    'defend', 'block',
    'heal', 'drink',
    'challenge', 'duel',
    'accept',
    'help', '?',
    'debug'
] as const;
export type ValidCommand = typeof VALID_COMMANDS[number];

/**
 * Validates if a direction string is valid
 */
export function isValidDirection(direction: string): direction is Direction {
    return VALID_DIRECTIONS.includes(direction.toLowerCase() as Direction);
}

/**
 * Validates if a command string is valid
 */
export function isValidCommand(command: string): command is ValidCommand {
    const normalized = command.toLowerCase().trim();
    const firstWord = normalized.split(' ')[0];
    return VALID_COMMANDS.includes(firstWord as ValidCommand);
}

/**
 * Validates item ID format
 * Item IDs should be alphanumeric with optional underscores/hyphens
 */
export function isValidItemId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Validates room ID format
 * Room IDs should be alphanumeric with optional underscores/hyphens
 */
export function isValidRoomId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Validates character name (no special characters, reasonable length)
 */
export function isValidCharacterName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 2 || name.length > 20) return false;
    return /^[a-zA-Z\s]+$/.test(name);
}

/**
 * Validates player message (say/emote)
 * Prevents excessively long messages and basic injection attempts
 */
export function isValidMessage(message: string): boolean {
    if (!message || typeof message !== 'string') return false;
    if (message.length === 0 || message.length > 500) return false;
    // Prevent script injection attempts (basic check)
    if (/<script|javascript:|onerror=/i.test(message)) return false;
    return true;
}

/**
 * Validates numeric value is within range
 */
export function isValidNumber(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Sanitizes user input by trimming and limiting length
 */
export function sanitizeInput(input: string, maxLength: number = 500): string {
    if (!input || typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
}

/**
 * Parses command input into command and arguments
 */
export function parseCommand(input: string): { command: string; args: string } {
    const trimmed = sanitizeInput(input);
    const firstSpace = trimmed.indexOf(' ');

    if (firstSpace === -1) {
        return { command: trimmed.toLowerCase(), args: '' };
    }

    return {
        command: trimmed.slice(0, firstSpace).toLowerCase(),
        args: trimmed.slice(firstSpace + 1).trim()
    };
}

/**
 * Validation result type for detailed error messages
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates a complete command input
 */
export function validateCommandInput(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
        return { valid: false, error: 'Command cannot be empty' };
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Command cannot be empty' };
    }

    if (trimmed.length > 500) {
        return { valid: false, error: 'Command too long (max 500 characters)' };
    }

    const { command } = parseCommand(trimmed);
    if (!isValidCommand(command)) {
        return { valid: false, error: `Unknown command: ${command}` };
    }

    return { valid: true };
}
