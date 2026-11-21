import {defineConfig} from 'vitest/config';
// Client queue checks use an in-memory DOM stub and mock transport only.
export default defineConfig({test:{environment:'node',include:['tests/study-progress-client.test.js'],fileParallelism:false}});
