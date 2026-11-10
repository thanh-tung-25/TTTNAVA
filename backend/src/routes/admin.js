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
  importFileDraftsHandler,
  listQuestionsHandler,
  questionAuditHandler,
  questionDetailHandler,
  updateQuestionHandler,
} from '../controllers/admin-question-controller.js';
import { adminStatsHandler } from '../controllers/admin-stats-controller.js';
import { authenticateToken, requireAdmin, requireAdminScope, requireSuperAdmin } from '../middlewares/auth.js';
import adminTeamRouter from './admin-team.js';
import { uploadDocx } from '../middlewares/upload-docx.js';
import {asyncHandler} from '../utils/errors.js';
import {deploymentCheck} from '../services/deployment-check.js';
import {requireSchoolAdmin} from '../middlewares/school-admin.js';

const router = Router();

router.use(authenticateToken, requireAdmin);
router.get('/deployment-check',requireSuperAdmin,asyncHandler(async(_r,res)=>res.json({data:await deploymentCheck()})));

router.use('/team',adminTeamRouter);
router.get('/stats', requireSchoolAdmin, adminStatsHandler);

router.get('/students', listStudentsHandler);
router.post('/students', requireAdminScope('chinese'), createStudentHandler);
router.patch('/students/:id', requireSuperAdmin, updateStudentHandler);
router.post('/students/:id/password', requireSuperAdmin, resetPasswordHandler);
router.post('/students/:id/lock', requireSuperAdmin, lockStudentHandler);

router.use(requireSchoolAdmin);
router.get('/curriculum/tree', curriculumTreeHandler);
router.get('/questions', listQuestionsHandler);
router.get('/questions/import/config', importConfigHandler);
router.post('/questions/import', importDraftsHandler);
router.post('/questions/import/file', uploadDocx, importFileDraftsHandler);
router.post('/questions/import/docx', uploadDocx, importDocxHandler);
router.post('/questions/import/ai', uploadDocx, importAiHandler);
router.post('/questions', createQuestionHandler);
router.get('/questions/:id', questionDetailHandler);
router.patch('/questions/:id', updateQuestionHandler);
router.get('/questions/:id/audit', questionAuditHandler);

export default router;
