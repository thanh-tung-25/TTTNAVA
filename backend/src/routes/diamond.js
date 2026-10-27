import { Router } from 'express';
import { leaderboardHandler, summaryHandler } from '../controllers/diamond-controller.js';
import { authenticateToken, requireStudent } from '../middlewares/auth.js';

const router = Router();

router.get('/summary', authenticateToken, requireStudent, summaryHandler);
router.get('/leaderboard', authenticateToken, requireStudent, leaderboardHandler);

export default router;
