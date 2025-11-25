// Mock localStorage for Socket.IO client
// The Socket.IO client library expects localStorage to be available
// In Node.js v18+, there's a built-in localStorage that requires --localstorage-file flag
// This mock provides a complete localStorage implementation for tests

delete global.localStorage;

const storage = {};

Object.defineProperty(global, 'localStorage', {
    value: {
        getItem: (key) => storage[key] || null,
        setItem: (key, value) => { storage[key] = value; },
        removeItem: (key) => { delete storage[key]; },
        clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
        key: (index) => Object.keys(storage)[index] || null,
        get length() { return Object.keys(storage).length; }
    },
    writable: true,
    configurable: true
});

// Custom matcher for message events that handles both legacy string and new { message, soundHint } format
expect.extend({
    toHaveEmittedMessage(mockSocket, expectedMessage, expectedSoundHint = undefined) {
        const calls = mockSocket.emit.mock.calls.filter(call => call[0] === 'message');

        const messageMatches = (actual, expected) => {
            // Handle string messages
            if (typeof actual === 'string') {
                if (expected instanceof RegExp) return expected.test(actual);
                if (typeof expected === 'string') return actual === expected;
                if (expected && expected.asymmetricMatch) return expected.asymmetricMatch(actual);
                return false;
            }
            // Handle object messages { message, soundHint }
            if (typeof actual === 'object' && actual !== null && actual.message) {
                if (expected instanceof RegExp) return expected.test(actual.message);
                if (typeof expected === 'string') return actual.message === expected;
                if (expected && expected.asymmetricMatch) return expected.asymmetricMatch(actual.message);
                return false;
            }
            return false;
        };

        const found = calls.some(call => {
            const msgArg = call[1];
            if (!messageMatches(msgArg, expectedMessage)) return false;

            // If soundHint is specified, check it
            if (expectedSoundHint !== undefined) {
                if (typeof msgArg === 'object' && msgArg !== null) {
                    return msgArg.soundHint === expectedSoundHint;
                }
                return false; // String messages don't have soundHint
            }
            return true;
        });

        if (found) {
            return {
                pass: true,
                message: () => `Expected socket not to have emitted message matching ${expectedMessage}`
            };
        }

        const actualMessages = calls.map(c =>
            typeof c[1] === 'object' ? JSON.stringify(c[1]) : c[1]
        );

        return {
            pass: false,
            message: () => `Expected socket to have emitted message matching ${expectedMessage}\nActual messages: ${JSON.stringify(actualMessages, null, 2)}`
        };
    }
});

// Helper to extract message text from either string or object format
global.extractMessageText = (msg) => {
    if (typeof msg === 'string') return msg;
    if (typeof msg === 'object' && msg !== null && msg.message) return msg.message;
    return String(msg);
};
