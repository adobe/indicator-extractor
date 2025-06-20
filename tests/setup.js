// Jest setup file
// Add any global test setup here

const TestHelpers = require('./test-helpers');

// Extend Jest matchers if needed
// require('jest-extended');

// Global test timeout
jest.setTimeout(15000);

// Global cleanup after all tests
afterAll(async() => {
  await TestHelpers.cleanupAllTestDirs();
});
