import { Router } from 'express';
import {
  answerPracticeHandler,
  finishPracticeHandler,
  getPracticeHandler,
  practiceHistoryHandler,
  startPracticeHandler,
} from '../controllers/practice-controller.js';
import { authenticateToken, requireStudent } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';

const router = Router();

router.use(authenticateToken, requireStudent);
router.get('/history', practiceHistoryHandler);
router.post('/', rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'practice-start' }), startPracticeHandler);
router.get('/:id', getPracticeHandler);
router.post('/:id/answers', answerPracticeHandler);
router.post('/:id/finish', finishPracticeHandler);

export default router;
