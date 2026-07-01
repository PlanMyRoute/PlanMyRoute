/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "__tests__/jest\\.setup\\.ts"],
  moduleNameMapper: {
    "^.*middleware/auth(\\.js)?$": "<rootDir>/__mocks__/auth.cjs",
    "^.*middleware/permissions(\\.js)?$": "<rootDir>/__mocks__/permissions.cjs",
    "^.*config/geocoder(\\.js)?$": "<rootDir>/__mocks__/geocoder.cjs",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^node-fetch$": "<rootDir>/__mocks__/node-fetch.cjs",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          isolatedModules: true,
        },
      },
    ],
  },
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  collectCoverageFrom: [
    "src/**/*.{ts,js}",
    "!src/**/*.test.ts",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
};
