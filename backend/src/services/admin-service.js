import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { hashPassword } from './auth-service.js';
import { parseJson, usernameToEmail } from '../utils/normalize.js';
import { publicProfile } from '../utils/serializers.js';
import { toIso } from '../utils/time.js';

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

export async function listQuestions(filters, page, limit) {
  const where = [];
  const params = [];
  if (filters.topicId) { where.push('q.topic_id = ?'); params.push(filters.topicId); }
  if (filters.subjectId) { where.push('t.subject_id = ?'); params.push(filters.subjectId); }
  if (filters.grade) { where.push('t.grade = ?'); params.push(filters.grade); }
  if (filters.status) { where.push('q.status = ?'); params.push(filters.status); }
  if (filters.type) { where.push('q.type = ?'); params.push(filters.type); }
  if (filters.q) { where.push('q.prompt LIKE ?'); params.push(`%${filters.q}%`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT q.id, q.type, q.prompt, q.difficulty, q.status, q.topic_id,
            t.name AS topic_name, t.grade, t.subject_id, s.name AS subject_name,
            (SELECT COUNT(*) FROM question_options qo WHERE qo.question_id = q.id) AS option_count
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     JOIN subjects s ON s.id = t.subject_id
     ${whereSql}
     ORDER BY q.id ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [total] = await query(
    `SELECT COUNT(*) AS total FROM questions q
     JOIN topics t ON t.id = q.topic_id
     JOIN subjects s ON s.id = t.subject_id
     ${whereSql}`,
    params,
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      prompt: row.prompt,
      difficulty: row.difficulty,
      status: row.status,
      topicId: row.topic_id,
      topicName: row.topic_name,
      grade: Number(row.grade),
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      optionCount: Number(row.option_count),
    })),
    total: Number(total.total),
  };
}

export async function getQuestionDetail(questionId) {
  const rows = await query(
    `SELECT q.*, t.name AS topic_name, t.grade, t.subject_id, s.name AS subject_name,
            a.answer_json, a.explanation
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     JOIN subjects s ON s.id = t.subject_id
     JOIN question_answers a ON a.question_id = q.id
     WHERE q.id = ? LIMIT 1`,
    [questionId],
  );
  if (!rows[0]) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Câu hỏi không tồn tại');
  const options = await query(
    'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC, opt_key ASC',
    [questionId],
  );
  const row = rows[0];
  return {
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    imageUrl: row.image_url,
    difficulty: row.difficulty,
    status: row.status,
    topicId: row.topic_id,
    topicName: row.topic_name,
    grade: Number(row.grade),
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    options: options.map((option) => ({ key: option.opt_key, text: option.option_text })),
    answer: parseJson(row.answer_json),
    explanation: row.explanation,
    updatedAt: toIso(row.updated_at),
  };
}

function validateQuestionPayload(type, payload) {
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt || prompt.length > 1000) throw new AppError(400, 'INVALID_PROMPT', 'Đề bài phải từ 1 đến 1000 ký tự');
  if (!payload.explanation || !String(payload.explanation).trim()) {
    throw new AppError(400, 'INVALID_EXPLANATION', 'Lời giải không được để trống');
  }
  const options = payload.options ?? [];
  const answer = payload.answer ?? {};

  if (type === 'single_choice' || type === 'multiple_choice') {
    const min = type === 'single_choice' ? 2 : 3;
    const max = type === 'single_choice' ? 4 : 5;
    if (!Array.isArray(options) || options.length < min || options.length > max) {
      throw new AppError(400, 'INVALID_OPTIONS', `Câu hỏi cần từ ${min} đến ${max} phương án`);
    }
    const keys = new Set();
    const texts = new Set();
    for (const option of options) {
      if (!/^[a-e]$/.test(option.key)) throw new AppError(400, 'INVALID_OPTION_KEY', 'Khóa phương án phải là a–e');
      if (keys.has(option.key)) throw new AppError(400, 'DUPLICATE_OPTION_KEY', 'Khóa phương án bị trùng');
      keys.add(option.key);
      const text = String(option.text ?? '').trim();
      if (!text || text.length > 500) throw new AppError(400, 'INVALID_OPTION_TEXT', 'Nội dung phương án phải từ 1 đến 500 ký tự');
      const textKey = text.toLocaleLowerCase('vi');
      if (texts.has(textKey)) throw new AppError(400, 'DUPLICATE_OPTION_TEXT', 'Nội dung các phương án không được trùng');
      texts.add(textKey);
    }
    if (type === 'single_choice') {
      if (!keys.has(answer.key)) throw new AppError(400, 'INVALID_ANSWER', 'Đáp án đúng không nằm trong các phương án');
    } else {
      const answerKeys = [...new Set(answer.keys ?? [])];
      if (answerKeys.length < 2 || answerKeys.length >= options.length || answerKeys.some((key) => !keys.has(key))) {
        throw new AppError(400, 'INVALID_ANSWER', 'Câu nhiều đáp án cần ít nhất 2 đáp án đúng và không được chọn tất cả');
      }
    }
  } else if (type === 'true_false') {
    if (typeof answer.value !== 'boolean') throw new AppError(400, 'INVALID_ANSWER', 'Đáp án Đúng/Sai không hợp lệ');
  } else if (type === 'fill_in') {
    const accepted = Array.isArray(answer.accepted) ? answer.accepted.map((text) => String(text).trim()).filter(Boolean) : [];
    if (accepted.length === 0) throw new AppError(400, 'INVALID_ANSWER', 'Cần ít nhất một đáp án điền');
    if (accepted.some((text) => text.length > 200)) throw new AppError(400, 'INVALID_ANSWER', 'Đáp án điền tối đa 200 ký tự');
  }

  return {
    prompt,
    options: (type === 'single_choice' || type === 'multiple_choice')
      ? options.map((option, index) => ({
        key: option.key,
        text: String(option.text).trim(),
        sortOrder: index + 1,
      }))
      : [],
    answer,
    explanation: String(payload.explanation).trim(),
    difficulty: payload.difficulty,
    imageUrl: payload.imageUrl ?? null,
    status: payload.status,
  };
}

export async function updateQuestion(questionId, adminId, payload) {
  return withTransaction(async (connection) => {
    const [rows] = await connection.query(
      'SELECT * FROM questions WHERE id = ? FOR UPDATE',
      [questionId],
    );
    if (!rows[0]) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Câu hỏi không tồn tại');
    const current = rows[0];
    const [currentOptions] = await connection.query(
      'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC',
      [questionId],
    );
    const [currentAnswer] = await connection.query(
      'SELECT answer_json, explanation FROM question_answers WHERE question_id = ?',
      [questionId],
    );

    const clean = validateQuestionPayload(current.type, payload);
    const nextStatus = clean.status ?? current.status;
    const action = nextStatus !== current.status
      ? (nextStatus === 'hidden' ? 'hide' : 'show')
      : 'update';

    const before = {
      prompt: current.prompt,
      difficulty: current.difficulty,
      status: current.status,
      imageUrl: current.image_url,
      options: currentOptions.map((option) => ({ key: option.opt_key, text: option.option_text })),
      answer: parseJson(currentAnswer[0]?.answer_json),
      explanation: currentAnswer[0]?.explanation,
    };

    await connection.query(
      `UPDATE questions SET prompt = ?, difficulty = ?, status = ?, image_url = ?
       WHERE id = ?`,
      [clean.prompt, clean.difficulty, nextStatus, clean.imageUrl, questionId],
    );
    await connection.query('DELETE FROM question_options WHERE question_id = ?', [questionId]);
    for (const option of clean.options) {
      await connection.query(
        'INSERT INTO question_options (question_id, opt_key, option_text, sort_order) VALUES (?, ?, ?, ?)',
        [questionId, option.key, option.text, option.sortOrder],
      );
    }
    await connection.query(
      `UPDATE question_answers SET answer_json = ?, explanation = ? WHERE question_id = ?`,
      [JSON.stringify(clean.answer), clean.explanation, questionId],
    );

    const after = {
      prompt: clean.prompt,
      difficulty: clean.difficulty,
      status: nextStatus,
      imageUrl: clean.imageUrl,
      options: clean.options,
      answer: clean.answer,
      explanation: clean.explanation,
    };
    await connection.query(
      `INSERT INTO atomic_question_writes (question_id, admin_id, action, before_json, after_json)
       VALUES (?, ?, ?, ?, ?)`,
      [questionId, adminId, action, JSON.stringify(before), JSON.stringify(after)],
    );
    return { id: questionId, action, status: nextStatus };
  }).then(() => getQuestionDetail(questionId));
}

export async function listWriteAudit(questionId, limit = 20) {
  const rows = await query(
    `SELECT a.id, a.action, a.created_at, p.display_name AS admin_name
     FROM atomic_question_writes a JOIN profiles p ON p.id = a.admin_id
     WHERE a.question_id = ? ORDER BY a.created_at DESC LIMIT ?`,
    [questionId, limit],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    action: row.action,
    adminName: row.admin_name,
    createdAt: toIso(row.created_at),
  }));
}
