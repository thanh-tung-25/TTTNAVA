import { createHash } from 'node:crypto';

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

const PINNED_LAST = /^(cả hai|tất cả|cả a và b|a và b|không có (phương án|đáp án)|none)/i;

export function buildDisplayOptions(question, seed) {
  if (question.type === 'true_false') {
    return [
      { key: 'true', text: 'Đúng' },
      { key: 'false', text: 'Sai' },
    ];
  }
  const options = question.options ?? [];
  if (question.type === 'fill_in') return [];
  const pinned = options.filter((option) => PINNED_LAST.test(option.text));
  const normal = options.filter((option) => !PINNED_LAST.test(option.text));
  const shuffled = seededShuffle(normal, `${seed}|${question.id}|options`);
  return [...shuffled, ...pinned];
}

export function shuffleQuestionForClient(question, seed) {
  const options = buildDisplayOptions(question, seed).map((option, index) => ({
    key: option.key,
    label: String.fromCharCode(65 + index),
    text: option.text,
  }));
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    imageUrl: question.image_url ?? null,
    difficulty: question.difficulty,
    options,
  };
}
