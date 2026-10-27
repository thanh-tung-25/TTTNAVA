import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { seededShuffle } from '../utils/hash.js';
import { parseJson } from '../utils/normalize.js';

function chunk(items, size = 50) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function loadQuestionsByIds(ids) {
  if (ids.length === 0) return [];
  const rows = [];
  for (const part of chunk(ids, 50)) {
    const placeholders = part.map(() => '?').join(',');
    rows.push(...await query(
      `SELECT q.*, a.answer_json, a.explanation
       FROM questions q
       JOIN question_answers a ON a.question_id = q.id
       WHERE q.id IN (${placeholders})`,
      part,
    ));
  }

  const options = [];
  for (const part of chunk(ids, 50)) {
    const placeholders = part.map(() => '?').join(',');
    options.push(...await query(
      `SELECT question_id, opt_key, option_text
       FROM question_options
       WHERE question_id IN (${placeholders})
       ORDER BY sort_order ASC, opt_key ASC`,
      part,
    ));
  }

  const optionsByQuestion = new Map();
  for (const option of options) {
    if (!optionsByQuestion.has(option.question_id)) optionsByQuestion.set(option.question_id, []);
    optionsByQuestion.get(option.question_id).push({ key: option.opt_key, text: option.option_text });
  }

  const byId = new Map();
  for (const row of rows) {
    byId.set(row.id, {
      ...row,
      answer: parseJson(row.answer_json),
      options: optionsByQuestion.get(row.id) ?? [],
    });
  }
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function getTopicWithSubject(topicId) {
  const rows = await query(
    `SELECT t.*, s.name AS subject_name, s.color AS subject_color
     FROM topics t
     JOIN subjects s ON s.id = t.subject_id
     WHERE t.id = ? LIMIT 1`,
    [topicId],
  );
  if (!rows[0]) throw new AppError(404, 'TOPIC_NOT_FOUND', 'Chủ đề không tồn tại');
  return rows[0];
}

export async function countVisibleQuestions(topicId) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM questions WHERE topic_id = ? AND status = \'visible\'',
    [topicId],
  );
  return Number(rows[0]?.total ?? 0);
}

async function recentQuestionIds(studentId, topicId, limitRefs = 3) {
  const refs = await query(
    `SELECT ref_type, ref_id, started_at FROM (
       SELECT 'practice' AS ref_type, id AS ref_id, started_at
       FROM practice_sessions
       WHERE student_id = ? AND topic_id = ? AND status = 'finished'
       UNION ALL
       SELECT 'exam' AS ref_type, id AS ref_id, started_at
       FROM exam_attempts
       WHERE student_id = ? AND topic_id = ?
     ) refs
     ORDER BY started_at DESC
     LIMIT ${Number(limitRefs)}`,
    [studentId, topicId, studentId, topicId],
  );

  const ids = [];
  for (const ref of refs) {
    const table = ref.ref_type === 'practice' ? 'practice_questions' : 'exam_questions';
    const column = ref.ref_type === 'practice' ? 'session_id' : 'attempt_id';
    const rows = await query(`SELECT question_id FROM ${table} WHERE ${column} = ?`, [ref.ref_id]);
    ids.push(...rows.map((row) => row.question_id));
  }
  return new Set(ids);
}

export async function selectQuestionsForRound({ studentId, topicId, count, seed }) {
  const topic = await getTopicWithSubject(topicId);
  const rows = await query(
    'SELECT id FROM questions WHERE topic_id = ? AND status = \'visible\' ORDER BY id ASC',
    [topicId],
  );
  const allIds = rows.map((row) => row.id);
  if (allIds.length === 0) {
    throw new AppError(409, 'TOPIC_EMPTY', 'Chủ đề này chưa có câu hỏi');
  }

  const recent = await recentQuestionIds(studentId, topicId);
  const eligible = allIds.filter((id) => !recent.has(id));
  const ordered = seededShuffle(eligible.length > 0 ? eligible : allIds, seed);
  const selected = ordered.slice(0, count);

  if (selected.length < count) {
    const fallback = seededShuffle(allIds.filter((id) => !selected.includes(id)), `${seed}|fallback`);
    selected.push(...fallback.slice(0, count - selected.length));
  }

  if (selected.length < count) {
    throw new AppError(409, 'NOT_ENOUGH_QUESTIONS', `Chủ đề chỉ có ${selected.length} câu hỏi, cần ${count} câu`);
  }
  return { topic, questionIds: selected };
}

export async function buildChallengeQuestionIds(topic, seed) {
  const topicRows = await query(
    'SELECT id FROM questions WHERE topic_id = ? AND status = \'visible\' ORDER BY id ASC',
    [topic.id],
  );
  if (topicRows.length < 5) {
    throw new AppError(409, 'TOPIC_TOO_SMALL', 'Chủ đề cần ít nhất 5 câu hỏi để thách đấu');
  }

  const otherRows = await query(
    `SELECT q.id
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     WHERE t.subject_id = ? AND t.grade = ? AND t.id <> ? AND q.status = 'visible'
     ORDER BY q.id ASC`,
    [topic.subject_id, topic.grade, topic.id],
  );

  const primary = seededShuffle(topicRows.map((row) => row.id), `${seed}|topic`);
  const secondary = seededShuffle(otherRows.map((row) => row.id), `${seed}|others`);
  const merged = [...new Set([...primary, ...secondary])].slice(0, 1000);
  return merged;
}
