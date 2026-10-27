import { Router } from 'express';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerDisabled,
} from '../controllers/auth-controller.js';
import { authenticateToken } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';

const router = Router();

router.post('/login', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'login' }), loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticateToken, meHandler);
router.post('/register', registerDisabled);

export default router;
