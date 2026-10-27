import env from '../config/env.js';
import { query } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

export function readToken(request) {
  const cookieValue = request.cookies?.[env.cookie.name];
  if (cookieValue) return cookieValue;
  const header = request.get('authorization') ?? '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export async function resolveUser(request) {
  const token = readToken(request);
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Con cần đăng nhập để tiếp tục');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Phiên đăng nhập đã hết hạn, con đăng nhập lại nhé');
  }

  const rows = await query(
    'SELECT * FROM profiles WHERE id = ? LIMIT 1',
    [payload.sub],
  );
  const profile = rows[0];
  if (!profile) throw new AppError(401, 'UNAUTHENTICATED', 'Tài khoản không tồn tại');
  if (profile.banned_until && new Date(profile.banned_until) > new Date()) {
    throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khoá. Con hãy nhờ bố mẹ nhé');
  }
  if (profile.role === 'bot') {
    throw new AppError(403, 'BOT_FORBIDDEN', 'Tài khoản Robot không được đăng nhập');
  }
  return profile;
}

export async function authenticateToken(request, _response, next) {
  try {
    request.user = await resolveUser(request);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(request, _response, next) {
  try {
    request.user = await resolveUser(request);
  } catch {
    request.user = null;
  }
  next();
}

export function requireRole(...roles) {
  return function roleGuard(request, _response, next) {
    if (!request.user) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Con cần đăng nhập để tiếp tục'));
      return;
    }
    if (!roles.includes(request.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này'));
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireStudent = requireRole('student');
export const requirePlayer = requireRole('student', 'admin');

function redirectToLogin(request, response) {
  const next = encodeURIComponent(request.originalUrl);
  response.redirect(`/pages/login/?next=${next}`);
}

export function requirePageRole(role) {
  return async function pageGuard(request, response, next) {
    try {
      const user = await resolveUser(request);
      if (role === 'admin' && user.role !== 'admin') {
        response.redirect('/pages/student/home/');
        return;
      }
      if (role === 'student' && user.role !== 'student') {
        response.redirect('/pages/admin/students/');
        return;
      }
      request.user = user;
      next();
    } catch {
      redirectToLogin(request, response);
    }
  };
}

export function redirectIfAuthenticated(request, response, next) {
  resolveUser(request)
    .then((user) => {
      response.redirect(user.role === 'admin' ? '/pages/admin/students/' : '/pages/student/home/');
    })
    .catch(() => next());
}
