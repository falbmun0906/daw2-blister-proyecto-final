import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e', '<rootDir>/src', '<rootDir>/../shared'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^zod$': '<rootDir>/node_modules/zod',
  },
  setupFiles: ['<rootDir>/src/_tests_/setup-env.ts'],
};

export default config;
