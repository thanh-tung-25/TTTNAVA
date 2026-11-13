import { Router } from 'express';
import {
  createStudentHandler,
  listStudentsHandler,
  lockStudentHandler,
  resetPasswordHandler,
  updateStudentHandler,
  studentDeletionPreviewHandler,confirmStudentDeletionHandler,deleteStudentHandler,restoreStudentHandler,
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
import {rateLimit} from '../middlewares/rate-limit.js';
import {accessAccounts,accessHistory} from '../services/user-access-history.js';

const router = Router();

router.use(authenticateToken, requireAdmin);
router.get('/access-history',asyncHandler(async(req,res)=>res.set('Cache-Control','private, no-store').json({data:await accessAccounts(req.user,req.query)})));
router.get('/access-history/:id',asyncHandler(async(req,res)=>res.set('Cache-Control','private, no-store').json({data:await accessHistory(req.user,req.params.id,req.query)})));
router.get('/deployment-check',requireSuperAdmin,asyncHandler(async(_r,res)=>res.json({data:await deploymentCheck()})));

router.use('/team',adminTeamRouter);
router.get('/stats', requireSchoolAdmin, adminStatsHandler);

router.get('/students', listStudentsHandler);
router.post('/students', requireAdminScope('chinese'), createStudentHandler);
router.patch('/students/:id', requireSuperAdmin, updateStudentHandler);
router.post('/students/:id/password', requireSuperAdmin, resetPasswordHandler);
router.post('/students/:id/lock', requireSuperAdmin, lockStudentHandler);
router.get('/students/:id/deletion-preview',requireSuperAdmin,studentDeletionPreviewHandler);
router.post('/students/:id/deletion-confirmation',requireSuperAdmin,rateLimit({windowMs:300_000,max:5,keyPrefix:'student-deletion-confirm'}),confirmStudentDeletionHandler);
router.delete('/students/:id',requireSuperAdmin,rateLimit({windowMs:60_000,max:10,keyPrefix:'student-delete'}),deleteStudentHandler);
router.post('/students/:id/restore',requireSuperAdmin,restoreStudentHandler);

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
