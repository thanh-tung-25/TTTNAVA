import { randomUUID } from 'node:crypto';
import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { hashPassword } from './auth-service.js';
import { usernameToEmail } from '../utils/normalize.js';
import { publicProfile } from '../utils/serializers.js';
import { studentProgramCondition,adminScopeOf } from '../utils/admin-permissions.js';
import {studentVisibleCondition} from '../utils/student-visibility.js';

export async function listStudents(page, limit, search = '', program = '', viewer=null) {
  const offset = (page - 1) * limit;
  const like = `%${search}%`;
  const programWhere = program ? ' AND '+studentProgramCondition('p',program) : '';
  const privacyWhere=' AND '+studentVisibleCondition(viewer,'p');
  const rows = await query(
    `SELECT p.* FROM profiles p
     WHERE role = 'student' AND (username LIKE ? OR display_name LIKE ?)
     ${programWhere}${privacyWhere}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [like, like, limit, offset],
  );
  const [total] = await query(
    `SELECT COUNT(*) AS total FROM profiles p WHERE role = 'student' AND (username LIKE ? OR display_name LIKE ?) ${programWhere}${privacyWhere}`,
    [like, like],
  );
  return { items: rows.map(publicProfile), total: Number(total.total) };
}

export async function createStudent({ username, password, displayName, grade, avatarKey },actor=null) {
  const actorScope = adminScopeOf(actor);
  if (actorScope === 'chinese' && grade != null) throw new AppError(400, 'INVALID_STUDENT_GRADE', 'Học sinh Tiếng Trung không có khối lớp phổ thông.');
  const id = randomUUID();
  const hash = await hashPassword(password);
  await query(
    `INSERT INTO profiles (id, username, email, password_hash, role, display_name, avatar_key, grade,student_created_by,student_creator_scope,student_management_scope)
     VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?)`,
    [id, username, usernameToEmail(username), hash, displayName, avatarKey ?? 'meo', actorScope === 'chinese' ? null : grade,actor?.role==='admin'?actor.id:null,actorScope,actorScope],
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
