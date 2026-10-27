import { Router } from 'express';
import {
  examHistoryHandler,
  getExamHandler,
  saveExamAnswerHandler,
  startExamHandler,
  submitExamHandler,
} from '../controllers/exam-controller.js';
import { authenticateToken, requireStudent } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';

const router = Router();

router.use(authenticateToken, requireStudent);
router.get('/history', examHistoryHandler);
router.post('/', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'exam-start' }), startExamHandler);
router.get('/:id', getExamHandler);
router.post('/:id/answers', saveExamAnswerHandler);
router.post('/:id/submit', submitExamHandler);

export default router;
