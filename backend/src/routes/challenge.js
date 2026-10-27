import { Router } from 'express';
import {
  acceptHandler,
  answerHandler,
  declineHandler,
  forfeitHandler,
  inviteHandler,
  lobbyHandler,
  robotHandler,
  stateHandler,
} from '../controllers/challenge-controller.js';
import { authenticateToken, requireStudent } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rate-limit.js';

const router = Router();

router.use(authenticateToken, requireStudent);
router.get('/lobby', lobbyHandler);
router.post('/invites', rateLimit({ windowMs: 60_000, max: 12, keyPrefix: 'challenge-invite' }), inviteHandler);
router.post('/robot', rateLimit({ windowMs: 60_000, max: 12, keyPrefix: 'challenge-robot' }), robotHandler);
router.get('/:id', stateHandler);
router.post('/:id/accept', acceptHandler);
router.post('/:id/decline', declineHandler);
router.post('/:id/forfeit', forfeitHandler);
router.post('/:id/answers', answerHandler);

export default router;
