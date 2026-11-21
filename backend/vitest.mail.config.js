// Transport-only checks: no application database setup and no real delivery.
import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['tests/registration-mail.test.js','tests/password-reset-mail.test.js'],fileParallelism:false}});
