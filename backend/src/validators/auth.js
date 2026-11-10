import { z } from 'zod';
import { avatarSchema, displayNameSchema, passwordSchema, usernameSchema } from './common.js';

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const requestRegistrationOtpSchema=z.object({email:z.string().trim().min(1).max(120)});
export const completeRegistrationSchema=z.object({
 accountKind:z.enum(['student','guardian']).default('student'),
 challengeId:z.uuid(),
 otp:z.string().regex(/^\d{6}$/,'Mã xác minh phải gồm 6 chữ số.'),
 username:usernameSchema,
 password:passwordSchema,
 displayName:displayNameSchema,
 grade:z.number().int().min(1).max(9).nullable().default(null),
 avatarKey:avatarSchema.optional(),
});
