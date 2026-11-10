import { Router } from 'express';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  registrationStatusHandler,
  requestRegistrationOtpHandler,
} from '../controllers/auth-controller.js';
import { authenticateToken } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';

const router = Router();

router.post('/login', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'login' }), loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticateToken, meHandler);
router.get('/registration-status',registrationStatusHandler);
router.post('/register/request-otp',rateLimit({windowMs:600_000,max:5,keyPrefix:'registration-send'}),requestRegistrationOtpHandler);
router.post('/register',rateLimit({windowMs:600_000,max:20,keyPrefix:'registration-verify'}),registerHandler);

export default router;
