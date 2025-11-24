module.exports = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/server'],
    testMatch: ['**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
