/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  preset: "ts-jest/presets/default",
  setupFilesAfterEnv: ["<rootDir>/tests/utils/setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { 
      tsconfig: {
        jsx: "react-jsx",
        esModuleInterop: true
      }
    }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/tests/__mocks__/fileMock.js",
  },
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/prisma/",
    "<rootDir>/docker/",
    "<rootDir>/diagrams/",
    "<rootDir>/markdowns/",
    "<rootDir>/.idea/",
  ],
  testMatch: [
    "**/__tests__/**/*.(ts|tsx|js|jsx)",
    "**/*.(test|spec).(ts|tsx|js|jsx)",
    "!**/tests/e2e/**"  // Exclude E2E tests from Jest (they use Playwright)
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  testTimeout: 30000
};