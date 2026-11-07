const path = require('path');

module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text-summary',
    'text',
    ['lcovonly', { projectRoot: path.resolve(__dirname, '..') }],
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!jest.config.js',
    '!scripts/**',
  ],
};