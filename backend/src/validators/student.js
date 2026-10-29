import { z } from 'zod';
import { avatarSchema, displayNameSchema, passwordSchema, usernameSchema } from './common.js';

export const createStudentSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  grade: z.coerce.number().int().min(1).max(5).nullable(),
  avatarKey: avatarSchema.optional(),
});

export const updateStudentSchema = z.object({
  displayName: displayNameSchema.optional(),
  grade: z.coerce.number().int().min(1).max(5).nullable().optional(),
  avatarKey: avatarSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'Không có dữ liệu cần cập nhật' });

export const lockStudentSchema = z.object({
  locked: z.boolean(),
});
