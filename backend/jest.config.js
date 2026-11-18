/** Pruebas del backend con Jest + Supertest. SWC transpila TypeScript (compatible con TS 7). */
module.exports = {
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js", "json"],
  transform: { "^.+\\.ts$": ["@swc/jest"] },
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  setupFiles: ["<rootDir>/src/tests/setupEnv.ts"],
  // Auth0 y la base de datos se sustituyen por dobles de prueba: las pruebas no necesitan credenciales.
  moduleNameMapper: {
    "^.*middlewares/auth$": "<rootDir>/src/tests/mocks/auth.mock.ts",
    "^.*lib/prisma$": "<rootDir>/src/tests/mocks/prisma.mock.ts",
  },
  clearMocks: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/generated/**", "!src/tests/**", "!src/server.ts"],
  coverageDirectory: "coverage",
};
