import { Router } from 'express';
import {
  createStudentHandler,
  listStudentsHandler,
  lockStudentHandler,
  resetPasswordHandler,
  updateStudentHandler,
} from '../controllers/admin-student-controller.js';
import {
  listQuestionsHandler,
  questionAuditHandler,
  questionDetailHandler,
  updateQuestionHandler,
} from '../controllers/admin-question-controller.js';
import { adminStatsHandler } from '../controllers/admin-stats-controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/stats', adminStatsHandler);

router.get('/students', listStudentsHandler);
router.post('/students', createStudentHandler);
router.patch('/students/:id', updateStudentHandler);
router.post('/students/:id/password', resetPasswordHandler);
router.post('/students/:id/lock', lockStudentHandler);

router.get('/questions', listQuestionsHandler);
router.get('/questions/:id', questionDetailHandler);
router.patch('/questions/:id', updateQuestionHandler);
router.get('/questions/:id/audit', questionAuditHandler);

export default router;
