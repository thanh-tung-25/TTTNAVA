import { Router } from 'express';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  registrationStatusHandler,
  requestRegistrationOtpHandler,
  passwordResetStatusHandler,requestPasswordResetHandler,verifyPasswordResetHandler,completePasswordResetHandler,
} from '../controllers/auth-controller.js';
import { authenticateToken,optionalAuth } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';

const router = Router();

router.post('/login', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'login' }), loginHandler);
router.post('/logout',optionalAuth, logoutHandler);
router.get('/me', authenticateToken, meHandler);
router.get('/registration-status',registrationStatusHandler);
router.post('/register/request-otp',rateLimit({windowMs:600_000,max:5,keyPrefix:'registration-send'}),requestRegistrationOtpHandler);
router.post('/register',rateLimit({windowMs:600_000,max:20,keyPrefix:'registration-verify'}),registerHandler);
router.get('/password-reset/status',passwordResetStatusHandler);
router.post('/password-reset/request',rateLimit({windowMs:600_000,max:5,keyPrefix:'password-reset-send'}),requestPasswordResetHandler);
router.post('/password-reset/verify',rateLimit({windowMs:600_000,max:30,keyPrefix:'password-reset-verify'}),verifyPasswordResetHandler);
router.post('/password-reset/complete',rateLimit({windowMs:600_000,max:20,keyPrefix:'password-reset-complete'}),completePasswordResetHandler);

export default router;
