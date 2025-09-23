/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  preset: "ts-jest/presets/default",
  setupFilesAfterEnv: [
    "<rootDir>/tests/utils/setup.ts",
    "<rootDir>/tests/utils/next-setup.ts"
  ],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next/server$": "<rootDir>/tests/__mocks__/next/server.js",
  },
  collectCoverage: false,
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
  ],
  testMatch: [
    "**/__tests__/**/*.(ts|js)",
    "**/*.(test|spec).(ts|js)"
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  testTimeout: 15000
};
