import { z } from 'zod';

export const usernameSchema = z.string()
  .trim()
  .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
  .max(20, 'Tên đăng nhập tối đa 20 ký tự')
  .regex(/^[a-z0-9_]+$/, 'Tên đăng nhập chỉ gồm chữ thường, số và dấu gạch dưới');

export const passwordSchema = z.string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự');

export const avatarKeys = [
  'meo', 'cho', 'tho', 'gau', 'cao', 'cu', 'ech', 'ga', 'voi', 'khi', 'gau-truc', 'ho',
];

export const avatarSchema = z.enum(avatarKeys);

export const displayNameSchema = z.string().trim().min(1, 'Tên hiển thị không được để trống').max(60);

export const topicIdSchema = z.string().trim().min(3).max(60);

export const durationSchema = z.union([z.literal(300), z.literal(600), z.literal(900)]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(100).optional(),
});
