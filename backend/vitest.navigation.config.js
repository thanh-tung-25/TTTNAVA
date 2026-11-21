import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['tests/course-page-navigation.test.js'],fileParallelism:false}});
