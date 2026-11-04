import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { rateLimit } from '../middlewares/rate-limit.js';
import { issueWordUpload } from '../services/storage-upload.js';
const router = Router();
router.post('/word-upload', authenticateToken, requireAdmin,
  rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'word-upload' }),
  asyncHandler(async (req, res) => res.json({ data: await issueWordUpload(req.user, req.body) })));
export default router;
