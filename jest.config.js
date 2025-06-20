module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'bin/**/*.js',
    '!bin/**/*.test.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
