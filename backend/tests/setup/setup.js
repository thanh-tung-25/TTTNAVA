import { beforeEach } from 'vitest';
import { resetRateLimits } from '../../src/middlewares/rate-limit.js';

beforeEach(() => {
  resetRateLimits();
});
