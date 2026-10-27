import { createHash } from 'node:crypto';

const OPTION_KEYS = ['a', 'b', 'c', 'd', 'e'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export function sha256Hex(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function seededRandom(seed) {
  let state = Number.parseInt(sha256Hex(seed).slice(0, 8), 16) >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, seed) {
  const result = [...items];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

function normalizeText(value) {
  return String(value).normalize('NFC').trim().replace(/\s+/g, ' ');
}

function assertUniqueOptionTexts(options) {
  const seen = new Set();
  for (const option of options) {
    const key = normalizeText(option).toLocaleLowerCase('vi');
    if (!key) throw new Error('Phương án rỗng');
    if (seen.has(key)) throw new Error(`Phương án trùng: ${option}`);
    seen.add(key);
  }
}

function arrangeSingleOptions(correct, distractors, id, targetIndex) {
  const uniqueDistractors = [];
  const seen = new Set([normalizeText(correct).toLocaleLowerCase('vi')]);
  for (const item of distractors) {
    const key = normalizeText(item).toLocaleLowerCase('vi');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueDistractors.push(item);
  }
  if (uniqueDistractors.length < 3) {
    throw new Error(`Không đủ phương án nhiễu cho câu ${id}`);
  }
  const pool = seededShuffle(uniqueDistractors.slice(0, 3), `${id}|options`);
  const ordered = [...pool];
  ordered.splice(targetIndex % 4, 0, correct);
  assertUniqueOptionTexts(ordered);
  return ordered;
}

export function difficultyAt(index, total) {
  const easy = Math.round(total * 0.4);
  const medium = Math.round(total * 0.4);
  const position = (index * 37) % total;
  if (position < easy) return DIFFICULTIES[0];
  if (position < easy + medium) return DIFFICULTIES[1];
  return DIFFICULTIES[2];
}

export function singleChoice({ id, prompt, correct, distractors, explanation, difficulty, targetIndex }) {
  const options = arrangeSingleOptions(correct, distractors, id, targetIndex ?? 0);
  const answerKey = OPTION_KEYS[options.indexOf(correct)];
  return {
    id,
    type: 'single_choice',
    prompt: normalizeText(prompt),
    options: options.map((text, index) => ({ key: OPTION_KEYS[index], text: normalizeText(text) })),
    answer: { key: answerKey },
    explanation: normalizeText(explanation),
    imageUrl: null,
    difficulty,
  };
}

export function fillIn({ id, prompt, accepted, explanation, difficulty }) {
  const values = [...new Set(accepted.map(normalizeText).filter(Boolean))];
  if (values.length === 0) throw new Error(`Câu điền ${id} thiếu đáp án`);
  return {
    id,
    type: 'fill_in',
    prompt: normalizeText(prompt),
    answer: { accepted: values },
    explanation: normalizeText(explanation),
    imageUrl: null,
    difficulty,
  };
}

export function trueFalse({ id, statement, value, explanation, difficulty }) {
  return {
    id,
    type: 'true_false',
    prompt: normalizeText(statement),
    answer: { value: Boolean(value) },
    explanation: normalizeText(explanation),
    imageUrl: null,
    difficulty,
  };
}

export function multipleChoice({ id, prompt, correct, wrong, explanation, difficulty }) {
  const uniqueCorrect = [...new Map(correct.map((text) => [normalizeText(text).toLocaleLowerCase('vi'), text])).values()];
  const wrongPool = wrong.filter((text) => {
    const key = normalizeText(text).toLocaleLowerCase('vi');
    return !uniqueCorrect.some((item) => normalizeText(item).toLocaleLowerCase('vi') === key);
  });
  const optionCount = Math.min(5, Math.max(3, uniqueCorrect.length + wrongPool.length));
  if (uniqueCorrect.length < 2) throw new Error(`Câu nhiều đáp án ${id} cần ít nhất 2 đáp án đúng`);
  if (uniqueCorrect.length >= optionCount) throw new Error(`Câu nhiều đáp án ${id} không được đúng tất cả`);

  const selectedCorrect = uniqueCorrect.slice(0, Math.min(uniqueCorrect.length, optionCount - 1));
  const neededWrong = optionCount - selectedCorrect.length;
  const selectedWrong = wrongPool.slice(0, neededWrong);
  if (selectedWrong.length < neededWrong) throw new Error(`Câu nhiều đáp án ${id} thiếu phương án nhiễu`);

  const ordered = seededShuffle([...selectedCorrect, ...selectedWrong], `${id}|multi`);
  assertUniqueOptionTexts(ordered);
  const correctKeys = ordered
    .map((text, index) => (selectedCorrect.includes(text) ? OPTION_KEYS[index] : null))
    .filter(Boolean);
  return {
    id,
    type: 'multiple_choice',
    prompt: normalizeText(prompt),
    options: ordered.map((text, index) => ({ key: OPTION_KEYS[index], text: normalizeText(text) })),
    answer: { keys: correctKeys },
    explanation: normalizeText(explanation),
    imageUrl: null,
    difficulty,
  };
}

const TYPE_ORDER = ['single_choice', 'multiple_choice', 'true_false', 'fill_in'];

export function buildTopicQuestions(topic, provider, quota) {
  const total = Object.values(quota).reduce((sum, value) => sum + value, 0);
  const questions = [];
  const counters = { single_choice: 0, multiple_choice: 0, true_false: 0, fill_in: 0 };
  const prompts = new Set();

  for (const type of TYPE_ORDER) {
    for (let index = 0; index < quota[type]; index += 1) {
      const sequence = counters[type];
      counters[type] += 1;
      const id = `${topic.id}-${String(questions.length + 1).padStart(3, '0')}`;
      const difficulty = difficultyAt(questions.length, total);
      let question;

      if (type === 'single_choice') {
        const fact = provider.single(sequence);
        question = singleChoice({ id, ...fact, difficulty, targetIndex: counters.single_choice - 1 });
      } else if (type === 'multiple_choice') {
        question = multipleChoice({ id, ...provider.multi(sequence), difficulty });
      } else if (type === 'true_false') {
        question = trueFalse({ id, ...provider.tf(sequence), difficulty });
      } else {
        question = fillIn({ id, ...provider.fill(sequence), difficulty });
      }

      const promptKey = normalizeText(question.prompt).toLocaleLowerCase('vi');
      if (prompts.has(promptKey)) {
        throw new Error(`Trùng đề trong ${topic.id}: ${question.prompt}`);
      }
      prompts.add(promptKey);
      if (question.prompt.length > 1000) {
        throw new Error(`Đề quá 1000 ký tự trong ${topic.id}`);
      }
      questions.push(question);
    }
  }

  return questions;
}
