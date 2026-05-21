import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../shared'],
  testMatch: ['**/_tests_/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^zod$': '<rootDir>/node_modules/zod',
  },
  setupFiles: ['<rootDir>/src/_tests_/setup-env.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '../shared/**/*.ts',
    '!src/**/*.d.ts',
    '!../shared/**/*.d.ts',
    '!src/**/_tests_/**/*.ts',
    '!../shared/**/_tests_/**/*.ts',
  ],
};

export default config;
