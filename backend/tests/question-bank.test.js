import { describe, expect, test } from 'vitest';
import { query } from '../src/config/db.js';

describe('Danh mục và dữ liệu kiểm thử câu hỏi', () => {
  test('test_question_bank_has_catalog_and_fixture_questions', async () => {
    const subjects = await query('SELECT COUNT(*) AS total FROM subjects');
    const topics = await query('SELECT COUNT(*) AS total FROM topics');
    const fixtures = await query(
      "SELECT COUNT(*) AS total FROM questions WHERE id LIKE 'fixture-q-%'",
    );
    expect(Number(subjects[0].total)).toBe(3);
    expect(Number(topics[0].total)).toBe(91);
    expect(Number(fixtures[0].total)).toBe(28);
  });

  test('test_question_bank_fixture_has_mixed_types', async () => {
    const rows = await query(
      "SELECT type, COUNT(*) AS total FROM questions WHERE id LIKE 'fixture-q-%' GROUP BY type",
    );
    const counts = Object.fromEntries(rows.map((row) => [row.type, Number(row.total)]));
    expect(counts).toEqual({
      single_choice: 22,
      multiple_choice: 2,
      true_false: 2,
      fill_in: 2,
    });
  });

  test('test_question_bank_catalog_covers_five_grades_per_subject', async () => {
    const rows = await query(
      `SELECT subject_id, grade, COUNT(*) AS topics
       FROM topics GROUP BY subject_id, grade ORDER BY subject_id, grade`,
    );
    expect(rows).toHaveLength(15);
    for (const row of rows) {
      expect(Number(row.topics)).toBeGreaterThan(0);
    }
    const subjects = await query('SELECT DISTINCT subject_id FROM topics ORDER BY subject_id');
    expect(subjects.map((row) => row.subject_id)).toEqual(['tieng-anh', 'tieng-viet', 'toan']);
  });

  test('test_question_bank_fixture_every_question_has_answer_and_options', async () => {
    const missing = await query(
      `SELECT COUNT(*) AS total FROM questions q
       LEFT JOIN question_answers a ON a.question_id = q.id
       WHERE q.id LIKE 'fixture-q-%' AND a.question_id IS NULL`,
    );
    expect(Number(missing[0].total)).toBe(0);

    const badOptions = await query(
      `SELECT COUNT(*) AS total FROM questions q
       WHERE q.id LIKE 'fixture-q-%'
         AND q.type IN ('single_choice', 'multiple_choice')
         AND (SELECT COUNT(*) FROM question_options o WHERE o.question_id = q.id) NOT BETWEEN 2 AND 5`,
    );
    expect(Number(badOptions[0].total)).toBe(0);
  });

  test('test_question_bank_subject_topic_quotas_match', async () => {
    const rows = await query(
      'SELECT subject_id, COUNT(*) AS total FROM topics GROUP BY subject_id ORDER BY subject_id',
    );
    expect(rows.map((row) => [row.subject_id, Number(row.total)])).toEqual([
      ['tieng-anh', 30],
      ['tieng-viet', 31],
      ['toan', 30],
    ]);
  });

  test('test_question_bank_robot_account_exists', async () => {
    const rows = await query(
      "SELECT id, username, role, display_name FROM profiles WHERE id = '00000000-0000-4000-8000-000000000b07'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].username).toBe('robot_thach_dau');
    expect(rows[0].role).toBe('bot');
    expect(rows[0].display_name).toBe('Robot Thách Đấu');
  });
});
