export const FIXTURE_TOPIC_ID = 'toan-3-cong-tru-1000';
export const FIXTURE_PREFIX = 'fixture-q-';

function choice(index) {
  const total = 100 + index;
  const addend = 50 + index;
  const correct = total + addend;
  return {
    type: 'single_choice',
    prompt: `Câu luyện tập ${index}: ${total} + ${addend} bằng bao nhiêu?`,
    options: [
      { key: 'a', text: String(correct) },
      { key: 'b', text: String(correct + 10) },
      { key: 'c', text: String(correct - 10) },
      { key: 'd', text: String(correct + 100) },
    ],
    answer: { key: 'a' },
    explanation: `${total} + ${addend} = ${correct}.`,
    difficulty: index % 3 === 0 ? 'medium' : 'easy',
  };
}

const extra = [
  {
    type: 'multiple_choice',
    prompt: 'Những số nào dưới đây là số chẵn?',
    options: [
      { key: 'a', text: '12' }, { key: 'b', text: '15' },
      { key: 'c', text: '18' }, { key: 'd', text: '21' },
    ],
    answer: { keys: ['a', 'c'] },
    explanation: '12 và 18 chia hết cho 2 nên là số chẵn.',
    difficulty: 'medium',
  },
  {
    type: 'multiple_choice',
    prompt: 'Những phép tính nào có kết quả bằng 100?',
    options: [
      { key: 'a', text: '40 + 60' }, { key: 'b', text: '80 + 30' },
      { key: 'c', text: '150 - 50' }, { key: 'd', text: '120 - 10' },
    ],
    answer: { keys: ['a', 'c'] },
    explanation: '40 + 60 = 100 và 150 - 50 = 100.',
    difficulty: 'medium',
  },
  {
    type: 'true_false',
    prompt: '5 × 6 = 30.',
    options: [],
    answer: { value: true },
    explanation: '5 × 6 = 30 nên câu này đúng.',
    difficulty: 'easy',
  },
  {
    type: 'true_false',
    prompt: '8 × 4 = 24.',
    options: [],
    answer: { value: false },
    explanation: '8 × 4 = 32, không phải 24.',
    difficulty: 'easy',
  },
  {
    type: 'fill_in',
    prompt: 'Điền kết quả: 8 × 7 = ?',
    options: [],
    answer: { accepted: ['56'] },
    explanation: '8 × 7 = 56.',
    difficulty: 'medium',
  },
  {
    type: 'fill_in',
    prompt: 'Điền kết quả: 100 - 45 = ?',
    options: [],
    answer: { accepted: ['55'] },
    explanation: '100 - 45 = 55.',
    difficulty: 'easy',
  },
];

export const FIXTURE_QUESTIONS = [
  ...Array.from({ length: 22 }, (_, index) => choice(index + 1)),
  ...extra,
].map((question, index) => ({
  ...question,
  id: `${FIXTURE_PREFIX}${String(index + 1).padStart(4, '0')}`,
  topicId: FIXTURE_TOPIC_ID,
  status: 'published',
  createdBy: null,
}));

export async function insertFixtureQuestions(execute, { createdBy = null } = {}) {
  for (const question of FIXTURE_QUESTIONS) {
    await execute(
      `INSERT INTO questions
         (id, topic_id, type, prompt, image_url, difficulty, status, created_by, updated_by, published_at)
       VALUES (?, ?, ?, ?, NULL, ?, 'published', ?, ?, UTC_TIMESTAMP(3))`,
      [question.id, question.topicId, question.type, question.prompt, question.difficulty,
        createdBy, createdBy],
    );
    for (let index = 0; index < question.options.length; index += 1) {
      const option = question.options[index];
      await execute(
        'INSERT INTO question_options (question_id, opt_key, option_text, sort_order) VALUES (?, ?, ?, ?)',
        [question.id, option.key, option.text, index + 1],
      );
    }
    await execute(
      'INSERT INTO question_answers (question_id, answer_json, explanation) VALUES (?, ?, ?)',
      [question.id, JSON.stringify(question.answer), question.explanation],
    );
  }
}

export async function deleteFixtureQuestions(execute) {
  await execute('DELETE FROM questions WHERE id LIKE ?', [`${FIXTURE_PREFIX}%`]);
}
