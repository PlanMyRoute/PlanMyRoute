/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
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

  // --- AÑADE ESTO DESDE AQUÍ ---
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"], // "lcov" para Sonar, "text" para que tú lo veas en consola
  collectCoverageFrom: [
    "src/**/*.{ts,js}", // Analizar todo el código fuente
    "!src/**/*.test.ts", // Ignorar los archivos de test
    "!**/node_modules/**", // Ignorar librerías
    "!**/dist/**", // Ignorar código compilado
  ],
};
