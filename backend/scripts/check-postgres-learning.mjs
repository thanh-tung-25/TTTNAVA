import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
if (process.env.PGSCHEMA && process.env.PGSCHEMA !== 'ttnava_stage') throw Error('Staging schema required');
process.env.PGSCHEMA = 'ttnava_stage';
process.env.DB_DRIVER = 'postgres';
const { query, withTransaction, closePool } = await import('../src/config/db.js');
const chinese = await import('../src/services/chinese.js');
const { createSet, removeContent } = await import('../src/services/chinese-manage.js');
const worksheets = await import('../src/services/worksheets.js');
const practice = await import('../src/services/practice-service.js');
const exams = await import('../src/services/exam-service.js');
const { createRobotChallenge, forfeitChallenge } = await import('../src/services/challenge-actions.js');
const { parseJson } = await import('../src/utils/normalize.js');
const { rateLimit } = await import('../src/middlewares/rate-limit.js');
const studentId = randomUUID();
const rollback = Error('EXPECTED_LEARNING_ROLLBACK');
let phase = 'fixtures';
function completed(name) { console.log(JSON.stringify({ checked: name })); }
async function correctAnswer(questionId) {
  const [q] = await query('SELECT q.type,a.answer_json FROM questions q JOIN question_answers a ON a.question_id=q.id WHERE q.id=?', [questionId]);
  const answer = parseJson(q.answer_json);
  return q.type === 'fill_in' ? { value: answer.accepted[0] } : answer;
}
try {
  await assert.rejects(withTransaction(async () => {
    const [admin] = await query("SELECT id FROM profiles WHERE role='admin' LIMIT 1");
    assert.ok(admin);
    await query("INSERT INTO profiles(id,username,email,role,display_name,grade) VALUES (?,?,?,'student','Migration rollback test',1)", [studentId, 'pg_' + studentId.slice(0, 8), studentId + '@example.invalid']);
    for (const course of ['grade-1', 'hsk-1']) await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,?,'admin')", [studentId, course]);

    phase = 'chinese';
    const lesson = await chinese.saveLesson(null, { level_id: 1, title: 'Migration rollback test', position: 99999, status: 'published' });
    const set = await createSet({ lesson_id: lesson.id, title: 'Migration rollback test' });
    const items = [{ kind: 'vocabulary', data: { hanzi: '你好', meaning: 'Xin chào' } }, ...Array.from({ length: 20 }, (_, index) => ({ kind: 'question', data: { prompt: 'Migration question ' + index, type: 'text', accepted: ['你好'], approved: true } }))];
    await chinese.saveSet(set.id, { title: 'Migration rollback test', status: 'published', items });
    const detail = await chinese.detail(set.id, true, studentId);
    const vocabulary = detail.items.find(item => item.kind === 'vocabulary');
    const event = { event_id: randomUUID(), memory: 'remembered', favorite: true };
    assert.equal((await chinese.review(studentId, vocabulary.id, event)).review_count, 1);
    assert.equal((await chinese.review(studentId, vocabulary.id, event)).review_count, 1);
    assert.equal((await chinese.review(studentId, vocabulary.id, { ...event, event_id: randomUUID() })).review_count, 2);
    await chinese.progress(studentId, set.id, { last_item: vocabulary.id, read_items: [] });
    const quiz = await chinese.start(studentId, { set_id: set.id, count: 20 });
    assert.equal(quiz.items.length, 20);
    assert.ok(quiz.items.every(item => !item.data.accepted));
    let finished;
    for (const item of quiz.items) finished = await chinese.attempt(studentId, quiz.id, 'answer', { item_id: item.id, value: '你好', lock: true });
    assert.equal(finished.score, 100);
    assert.equal(finished.diamonds_delta, 3);
    await chinese.attempt(studentId, quiz.id, 'finish');
    assert.equal((await query('SELECT COUNT(*) n FROM diamond_ledger WHERE profile_id=? AND ref_id=?', [studentId, quiz.id]))[0].n, 1);
    const test = await chinese.saveTest(null, { title: 'Migration test', set_ids: [set.id], duration_seconds: 30, pass_percent: 70, status: 'published' });
    const timed = await chinese.start(studentId, { test_id: test.id });
    await chinese.attempt(studentId, timed.id, 'finish');
    await removeContent('lesson', lesson.id);
    assert.ok((await chinese.attempt(studentId, quiz.id)).finished_at);
    completed(phase);

    phase = 'worksheets';
    const itemId = randomUUID();
    const body = { title: 'Migration worksheet', grade: 1, subject_id: 'toan', status: 'published', items: [{ id: itemId, type: 'fill', prompt: '1 + 1 = ?', config: {}, answer: { accepted: ['2'] } }] };
    const sheet = await worksheets.save(admin.id, null, body);
    const updated = await worksheets.save(admin.id, sheet.id, { ...body, version: sheet.version });
    assert.equal(updated.version, 2);
    const attempt = await worksheets.start(studentId, sheet.id);
    assert.ok(!attempt.items[0].answer);
    const marked = await worksheets.answer(studentId, attempt.id, { [itemId]: '2' }, true);
    assert.equal(marked.status, 'completed');
    assert.equal(marked.score, 100);
    completed(phase);

    const [topic] = await query("SELECT q.topic_id FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade=1 AND q.status='published' GROUP BY q.topic_id HAVING COUNT(*)>=20 LIMIT 1");
    assert.ok(topic);
    phase = 'practice';
    const round = await practice.startPractice(studentId, topic.topic_id);
    assert.equal(round.questions.length, 10);
    for (const question of round.questions) await practice.answerPractice(studentId, round.id, question.id, await correctAnswer(question.id));
    assert.equal((await practice.finishPractice(studentId, round.id)).diamondsEarned, 3);
    assert.equal((await practice.finishPractice(studentId, round.id)).diamondsEarned, 3);
    completed(phase);

    phase = 'exams';
    const exam = await exams.startExam(studentId, topic.topic_id);
    const question = exam.questions[0];
    const answer = await correctAnswer(question.id);
    await exams.saveExamAnswer(studentId, exam.id, question.id, answer);
    await exams.saveExamAnswer(studentId, exam.id, question.id, answer);
    assert.equal((await query('SELECT COUNT(*) n FROM exam_answers WHERE attempt_id=?', [exam.id]))[0].n, 1);
    await exams.submitExam(studentId, exam.id);
    completed(phase);

    phase = 'challenge';
    const [student] = await query('SELECT * FROM profiles WHERE id=?', [studentId]);
    const challenge = await createRobotChallenge(student, { topicId: topic.topic_id, durationSeconds: 60, botLevel: 'easy' });
    await forfeitChallenge(studentId, challenge.id);
    assert.equal((await query('SELECT status FROM challenges WHERE id=?', [challenge.id]))[0].status, 'finished');
    completed(phase);
    phase = 'distributed-rate-limit';
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = '1';
    try {
      const limiter = rateLimit({ max: 2, keyPrefix: 'migration-rollback-test' });
      const statuses = [];
      for (let count = 0; count < 3; count++) {
        const response = { set() {}, status(status) { statuses.push(status); return this; }, json() {} };
        await limiter({ user: { id: studentId } }, response, error => { if (error) throw error; });
      }
      assert.deepEqual(statuses, [429]);
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
    }
    completed(phase);
    throw rollback;
  }), error => error === rollback);
  assert.equal((await query('SELECT id FROM profiles WHERE id=?', [studentId])).length, 0);
  console.log(JSON.stringify({ ok: true, checked: ['chinese', 'worksheets', 'practice', 'exams', 'challenge', 'distributed-rate-limit'], rolledBack: true, committedRowsChanged: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, phase, code: error.code || 'LEARNING_CHECK_FAILED', errorType: error.name }));
  process.exitCode = 1;
} finally { await closePool(); }
