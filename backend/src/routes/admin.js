import { Router } from 'express';
import {
  createStudentHandler,
  listStudentsHandler,
  lockStudentHandler,
  resetPasswordHandler,
  updateStudentHandler,
} from '../controllers/admin-student-controller.js';
import {
  createQuestionHandler,
  curriculumTreeHandler,
  importAiHandler,
  importConfigHandler,
  importDocxHandler,
  importDraftsHandler,
  listQuestionsHandler,
  questionAuditHandler,
  questionDetailHandler,
  updateQuestionHandler,
} from '../controllers/admin-question-controller.js';
import { adminStatsHandler } from '../controllers/admin-stats-controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { uploadDocx } from '../middlewares/upload-docx.js';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/stats', adminStatsHandler);

router.get('/students', listStudentsHandler);
router.post('/students', createStudentHandler);
router.patch('/students/:id', updateStudentHandler);
router.post('/students/:id/password', resetPasswordHandler);
router.post('/students/:id/lock', lockStudentHandler);

router.get('/curriculum/tree', curriculumTreeHandler);
router.get('/questions', listQuestionsHandler);
router.get('/questions/import/config', importConfigHandler);
router.post('/questions/import', importDraftsHandler);
router.post('/questions/import/docx', uploadDocx, importDocxHandler);
router.post('/questions/import/ai', uploadDocx, importAiHandler);
router.post('/questions', createQuestionHandler);
router.get('/questions/:id', questionDetailHandler);
router.patch('/questions/:id', updateQuestionHandler);
router.get('/questions/:id/audit', questionAuditHandler);

export default router;
