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
