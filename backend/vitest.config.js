import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    globalSetup: ['./tests/setup/global-setup.js'],
    setupFiles: ['./tests/setup/setup.js'],
    env: {
      DB_NAME: 'kids_learning_test',
      NODE_ENV: 'test',
      APP_ORIGIN: 'http://localhost:3000',
    },
  },
});
