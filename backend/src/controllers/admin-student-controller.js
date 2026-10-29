import { z } from 'zod';
import { parsePagination } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';
import {
  createStudent,
  listStudents,
  resetStudentPassword,
  setStudentLocked,
  updateStudent,
} from '../services/admin-service.js';
import { createStudentSchema, lockStudentSchema, updateStudentSchema } from '../validators/student.js';
import { resetPasswordSchema } from '../validators/auth.js';

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  program: z.enum(['chinese', 'primary']).optional(),
});

export const listStudentsHandler = asyncHandler(async (request, response) => {
  const { page, limit } = parsePagination(request.query);
  const { q, program } = listQuery.parse(request.query);
  const result = await listStudents(page, limit, q ?? '', program ?? '');
  response.json({ data: result.items, pagination: { page, limit, total: result.total } });
});

export const createStudentHandler = asyncHandler(async (request, response) => {
  const payload = createStudentSchema.parse(request.body);
  response.status(201).json({ data: await createStudent(payload) });
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
