import env from '../config/env.js';
import { loginSchema } from '../validators/auth.js';
import { login } from '../services/auth-service.js';
import { publicProfile } from '../utils/serializers.js';
import { asyncHandler } from '../utils/errors.js';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookie.secure,
    path: '/',
  };
}

export const loginHandler = asyncHandler(async (request, response) => {
  const { username, password } = loginSchema.parse(request.body);
  const result = await login(username, password);
  response.cookie(env.cookie.name, result.token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE });
  response.json({ data: { profile: result.profile } });
});

export const logoutHandler = asyncHandler(async (_request, response) => {
  response.clearCookie(env.cookie.name, cookieOptions());
  response.json({ data: { loggedOut: true } });
});

export const meHandler = asyncHandler(async (request, response) => {
  response.json({ data: { profile: publicProfile(request.user) } });
});

export const registerDisabled = asyncHandler(async (_request, response) => {
  response.status(403).json({
    error: {
      code: 'REGISTRATION_DISABLED',
      message: 'Ứng dụng không cho phép tự đăng ký. Bố mẹ hãy nhờ quản trị viên cấp tài khoản.',
    },
  });
});
