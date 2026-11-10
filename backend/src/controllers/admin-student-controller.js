import { z } from 'zod';
import { parsePagination } from '../utils/pagination.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { adminScopeOf } from '../utils/admin-permissions.js';
import {
  createStudent,
  listStudents,
  resetStudentPassword,
  setStudentLocked,
  updateStudent,
} from '../services/admin-service.js';
import { createChineseStudentSchema, createStudentSchema, lockStudentSchema, updateStudentSchema } from '../validators/student.js';
import { resetPasswordSchema } from '../validators/auth.js';

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  program: z.enum(['chinese', 'primary', 'secondary']).optional(),
});

export const listStudentsHandler = asyncHandler(async (request, response) => {
  const { page, limit } = parsePagination(request.query);
  const { q, program } = listQuery.parse(request.query);
  const scope = adminScopeOf(request.user);
  if (scope!=='super' && program && program!==scope) throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bạn chỉ được xem học sinh thuộc chương trình mình quản lý.');
  const result = await listStudents(page, limit, q ?? '', scope==='super' ? program ?? '' : scope,request.user);
  if (scope!=='super') result.items = result.items.map(student=>({...student,email:undefined,...(scope==='chinese'?{grade:null}:{})}));
  response.json({ data: result.items, pagination: { page, limit, total: result.total } });
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
