import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { normalizeUsername } from '../utils/normalize.js';
import { signToken } from '../utils/jwt.js';
import { publicProfile } from '../utils/serializers.js';

export async function login(rawUsername, password) {
  const username = normalizeUsername(rawUsername);
  const rows = await query('SELECT * FROM profiles WHERE username = ? LIMIT 1', [username]);
  const profile = rows[0];

  // Robot và tài khoản không tồn tại dùng chung một thông báo để không lộ thông tin.
  if (!profile || profile.role === 'bot' || !profile.password_hash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu chưa đúng');
  }
  if (profile.banned_until && new Date(profile.banned_until) > new Date()) {
    throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khoá. Con hãy nhờ bố mẹ nhé');
  }

  const valid = await bcrypt.compare(password, profile.password_hash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu chưa đúng');
  }

  return { profile: publicProfile(profile), token: signToken(profile) };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function getProfileById(id) {
  const rows = await query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}
