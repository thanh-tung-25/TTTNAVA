import { Router } from 'express';
import {
  subjectsHandler,
  topicDetailHandler,
  topicsHandler,
} from '../controllers/catalog-controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/subjects', authenticateToken, subjectsHandler);
router.get('/topics', authenticateToken, topicsHandler);
router.get('/topics/:id', authenticateToken, topicDetailHandler);

export default router;
