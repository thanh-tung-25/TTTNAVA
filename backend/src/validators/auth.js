import { z } from 'zod';
import { passwordSchema, usernameSchema } from './common.js';

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});
