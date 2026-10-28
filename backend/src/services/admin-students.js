import { randomUUID } from 'node:crypto';
import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { hashPassword } from './auth-service.js';
import { usernameToEmail } from '../utils/normalize.js';
import { publicProfile } from '../utils/serializers.js';

export async function listStudents(page, limit, search = '') {
  const offset = (page - 1) * limit;
  const like = `%${search}%`;
  const rows = await query(
    `SELECT * FROM profiles
     WHERE role = 'student' AND (username LIKE ? OR display_name LIKE ?)
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [like, like, limit, offset],
  );
  const [total] = await query(
    'SELECT COUNT(*) AS total FROM profiles WHERE role = \'student\' AND (username LIKE ? OR display_name LIKE ?)',
    [like, like],
  );
  return { items: rows.map(publicProfile), total: Number(total.total) };
}

export async function createStudent({ username, password, displayName, grade, avatarKey }) {
  const id = randomUUID();
  const hash = await hashPassword(password);
  await query(
    `INSERT INTO profiles (id, username, email, password_hash, role, display_name, avatar_key, grade)
     VALUES (?, ?, ?, ?, 'student', ?, ?, ?)`,
    [id, username, usernameToEmail(username), hash, displayName, avatarKey ?? 'meo', grade],
  );
  const rows = await query('SELECT * FROM profiles WHERE id = ?', [id]);
  return publicProfile(rows[0]);
}

async function studentById(studentId) {
  const rows = await query('SELECT * FROM profiles WHERE id = ? AND role = \'student\' LIMIT 1', [studentId]);
  if (!rows[0]) throw new AppError(404, 'STUDENT_NOT_FOUND', 'Không tìm thấy học sinh');
  return rows[0];
}

export async function updateStudent(studentId, patch) {
  await studentById(studentId);
  const fields = [];
  const params = [];
  if (patch.displayName !== undefined) { fields.push('display_name = ?'); params.push(patch.displayName); }
  if (patch.grade !== undefined) { fields.push('grade = ?'); params.push(patch.grade); }
  if (patch.avatarKey !== undefined) { fields.push('avatar_key = ?'); params.push(patch.avatarKey); }
  if (fields.length === 0) throw new AppError(400, 'NO_CHANGES', 'Không có dữ liệu cần cập nhật');
  params.push(studentId);
  await query(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`, params);
  return publicProfile(await studentById(studentId));
}

export async function resetStudentPassword(studentId, newPassword) {
  await studentById(studentId);
  const hash = await hashPassword(newPassword);
  // Cố ý không đổi token_version / không xoá cookie: reset mật khẩu không đăng xuất thiết bị khác.
  await query('UPDATE profiles SET password_hash = ? WHERE id = ?', [hash, studentId]);
  return { updated: true };
}

export async function setStudentLocked(studentId, locked) {
  await studentById(studentId);
  await query(
    'UPDATE profiles SET banned_until = ? WHERE id = ?',
    [locked ? '2999-01-01 00:00:00' : null, studentId],
  );
  return publicProfile(await studentById(studentId));
}
