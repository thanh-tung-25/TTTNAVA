import { Router } from 'express';
import authRouter from './auth.js';
import catalogRouter from './catalog.js';
import practiceRouter from './practice.js';
import examRouter from './exam.js';
import challengeRouter from './challenge.js';
import diamondRouter from './diamond.js';
import adminRouter from './admin.js';
import chineseRouter from './chinese.js';
import courseRouter from './courses.js';
import worksheetRouter from './worksheets.js';
import adminContentRouter from './admin-content.js';

const router = Router();
router.use('/admin/content', adminContentRouter);
router.use('/worksheets', worksheetRouter);
router.use('/courses', courseRouter);
router.use('/chinese', chineseRouter);

router.use('/auth', authRouter);
router.use('/catalog', catalogRouter);
router.use('/practice', practiceRouter);
router.use('/exams', examRouter);
router.use('/challenges', challengeRouter);
router.use('/diamonds', diamondRouter);
router.use('/admin', adminRouter);

export default router;
