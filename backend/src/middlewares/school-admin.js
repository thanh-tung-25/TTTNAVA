import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { adminScopeOf } from '../utils/admin-permissions.js';

export const schoolPrograms = ['primary', 'secondary'];
export const schoolProgramForGrade = grade => Number(grade) >= 6 ? 'secondary' : 'primary';
export function schoolGradeCondition(program, column = 'grade') {
  if (!schoolPrograms.includes(program)) return '1=1';
  return `${column} BETWEEN ${program === 'primary' ? '1 AND 5' : '6 AND 9'}`;
}
export function assertSchoolGrade(req, grade) {
  if (grade == null || grade === '') return;
  if (req.schoolProgram && schoolProgramForGrade(grade) !== req.schoolProgram) {
    throw new AppError(403, 'ADMIN_SCOPE_FORBIDDEN', 'Nội dung thuộc khối học khác.');
  }
}
const resources = {
  chapter: 'SELECT grade FROM curriculum_chapters WHERE id=?',
  lesson: 'SELECT c.grade FROM curriculum_lessons l JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.id=?',
  topic: 'SELECT grade FROM topics WHERE id=?',
  question: 'SELECT t.grade FROM questions q JOIN topics t ON t.id=q.topic_id WHERE q.id=?',
  worksheet: 'SELECT grade FROM worksheets WHERE id=?',
  attempt: 'SELECT grade FROM worksheet_attempts WHERE id=?',
  image: 'SELECT w.grade FROM worksheet_images i JOIN worksheets w ON w.id=i.worksheet_id WHERE i.id=?',
  document: 'SELECT c.grade FROM word_import_documents d JOIN curriculum_lessons l ON l.id=d.lesson_id JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE d.id=?',
};
export async function assertSchoolResource(req, kind, id) {
  if (!req.schoolProgram || !id) return;
  const [row] = await query(resources[kind], [String(id).trim()]);
  if (row) assertSchoolGrade(req, row.grade);
}
export async function assertSchoolPayload(req, payload = {}) {
  assertSchoolGrade(req, payload.grade);
  for (const [field, kind] of [['chapterId','chapter'],['lessonId','lesson'],['lesson_id','lesson'],['topicId','topic']]) {
    if (payload[field]) await assertSchoolResource(req, kind, payload[field]);
  }
}
export const requireSchoolAdmin = asyncHandler(async (req, _res, next) => {
  const scope = adminScopeOf(req.user);
  if (!['super', ...schoolPrograms].includes(scope)) throw new AppError(403, 'ADMIN_SCOPE_FORBIDDEN', 'Bạn không có quyền quản lý phần này.');
  const program = req.query.program;
  if (program && !schoolPrograms.includes(program)) throw new AppError(400, 'VALIDATION_ERROR', 'Khối học không hợp lệ.');
  if (scope !== 'super' && program && program !== scope) throw new AppError(403, 'ADMIN_SCOPE_FORBIDDEN', 'Nội dung thuộc khối học khác.');
  req.schoolProgram = scope === 'super' ? program || null : scope;
  await assertSchoolPayload(req, req.query);
  await assertSchoolPayload(req, req.body);
  next();
});
