// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.config.js is loaded as CommonJS by Jest itself, not bundled by Next.
const nextJest = require('next/jest');

// next/jest auto-configures SWC transform, module resolution matching
// tsconfig's `@/*` -> `src/*` paths, and .env loading — no manual babel or
// moduleNameMapper setup needed for a Next.js app.
const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
