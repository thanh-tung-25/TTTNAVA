import { Router } from 'express';
import { z } from 'zod';
import { requireSuperAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { rateLimit } from '../middlewares/rate-limit.js';
import { listAdmins,createAdmin,updateAdminAccess,resetAdminPassword,listAdminAudit } from '../services/admin-team.js';
const router = Router();
router.use(requireSuperAdmin);
router.get('/',asyncHandler(async(_req,res)=>res.json({data:await listAdmins()})));
router.get('/audit',asyncHandler(async(req,res)=>res.json({data:await listAdminAudit(z.coerce.number().int().min(1).default(1).parse(req.query.page))})));
const handle = (fn,status=200) => asyncHandler(async(req,res)=>{
  const result = await fn(req);
  res.locals.adminAuditWritten = true;
  res.status(status).json({data:result});
});
router.post('/',rateLimit({max:10,keyPrefix:'create-admin'}),handle(req=>createAdmin(req.user,req.body),201));
router.patch('/:id',handle(req=>updateAdminAccess(req.user,z.string().uuid().parse(req.params.id),req.body)));
router.post('/:id/password',rateLimit({max:10,keyPrefix:'admin-password'}),handle(req=>resetAdminPassword(req.user,z.string().uuid().parse(req.params.id),req.body)));
export default router;
