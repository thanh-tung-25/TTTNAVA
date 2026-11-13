import { z } from 'zod';
import { parsePagination } from '../utils/pagination.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { adminScopeOf,canViewStudentEmail } from '../utils/admin-permissions.js';
import {
  createStudent,
  listStudents,
  resetStudentPassword,
  setStudentLocked,
  updateStudent,
} from '../services/admin-service.js';
import { createChineseStudentSchema, createStudentSchema, lockStudentSchema, updateStudentSchema } from '../validators/student.js';
import { resetPasswordSchema } from '../validators/auth.js';
import {getAccountDeletionPreview,issueAccountDeletionConfirmation,deleteAccountSafely,restoreAccount} from '../services/admin-account-deletion.js';

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  program: z.enum(['chinese', 'primary', 'secondary']).optional(),
  status:z.enum(['active','deleted']).default('active'),
});

export const listStudentsHandler = asyncHandler(async (request, response) => {
  const { page, limit } = parsePagination(request.query);
  const { q, program,status } = listQuery.parse(request.query);
  const scope = adminScopeOf(request.user);
  if (scope!=='super' && program && program!==scope) throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bạn chỉ được xem học sinh thuộc chương trình mình quản lý.');
  if(status==='deleted'&&scope!=='super')throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Chỉ admin tổng được xem thùng rác tài khoản.');
  const result = await listStudents(page, limit, q ?? '', scope==='super' ? program ?? '' : scope,request.user,status);
  if (scope!=='super') result.items = result.items.map(student=>({...student,...(!canViewStudentEmail(request.user)?{email:undefined}:{}),...(scope==='chinese'?{grade:null}:{})}));
  response.set('Cache-Control','private, no-store').json({ data: result.items, pagination: { page, limit, total: result.total } });
});

export const createStudentHandler = asyncHandler(async (request, response) => {
  const schema = adminScopeOf(request.user) === 'chinese' ? createChineseStudentSchema : createStudentSchema;
  const payload = schema.parse(request.body);
  response.status(201).json({ data: await createStudent(payload,request.user) });
});

export const updateStudentHandler = asyncHandler(async (request, response) => {
  const payload = updateStudentSchema.parse(request.body);
  response.json({ data: await updateStudent(request.params.id, payload) });
});

export const resetPasswordHandler = asyncHandler(async (request, response) => {
  const { newPassword } = resetPasswordSchema.parse(request.body);
  response.json({ data: await resetStudentPassword(request.params.id, newPassword) });
});

export const lockStudentHandler = asyncHandler(async (request, response) => {
  const { locked } = lockStudentSchema.parse(request.body);
  response.json({ data: await setStudentLocked(request.params.id, locked) });
});

export const studentDeletionPreviewHandler=asyncHandler(async(req,res)=>{
 const {account,...preview}=await getAccountDeletionPreview(req.user,req.params.id,'student');
 res.set('Cache-Control','no-store').json({data:{student:account,...preview}});
});
const deletionHandler=fn=>asyncHandler(async(req,res)=>{
 const result=await fn(req);
 res.locals.adminAuditWritten=true;
 res.set('Cache-Control','no-store').json({data:result});
});
export const confirmStudentDeletionHandler=deletionHandler(req=>issueAccountDeletionConfirmation(req.user,req.params.id,req.body,'student'));
export const deleteStudentHandler=deletionHandler(req=>deleteAccountSafely(req.user,req.params.id,req.body,'student'));
export const restoreStudentHandler=deletionHandler(req=>restoreAccount(req.user,req.params.id,'student'));
