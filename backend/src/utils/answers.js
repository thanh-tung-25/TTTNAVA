import { badRequest } from './errors.js';
import { normalizeFillIn, parseJson } from './normalize.js';

export function validateClientAnswer(question, raw) {
  if (!raw || typeof raw !== 'object') {
    throw badRequest('Con chưa chọn đáp án');
  }

  if (question.type === 'single_choice') {
    const key = String(raw.key ?? '');
    if (!question.options.some((option) => option.key === key)) {
      throw badRequest('Đáp án không hợp lệ');
    }
    return { key };
  }

  if (question.type === 'multiple_choice') {
    if (!Array.isArray(raw.keys) || raw.keys.length === 0) {
      throw badRequest('Con cần chọn ít nhất một đáp án');
    }
    const validKeys = new Set(question.options.map((option) => option.key));
    const keys = [...new Set(raw.keys.map(String))].sort();
    if (keys.some((key) => !validKeys.has(key))) {
      throw badRequest('Đáp án không hợp lệ');
    }
    return { keys };
  }

  if (question.type === 'true_false') {
    if (typeof raw.value !== 'boolean') throw badRequest('Đáp án Đúng/Sai không hợp lệ');
    return { value: raw.value };
  }

  const value = normalizeFillIn(raw.value);
  if (!value || value.length > 200) {
    throw badRequest('Con hãy nhập câu trả lời (tối đa 200 ký tự)');
  }
  return { value };
}

export function isAnswerCorrect(question, clientAnswer) {
  const expected = parseJson(question.answer);
  if (!expected) return false;

  if (question.type === 'single_choice') {
    return clientAnswer.key === expected.key;
  }
  if (question.type === 'multiple_choice') {
    const expectedKeys = [...new Set((expected.keys ?? []).map(String))].sort();
    const actualKeys = [...new Set((clientAnswer.keys ?? []).map(String))].sort();
    return expectedKeys.length === actualKeys.length
      && expectedKeys.every((key, index) => key === actualKeys[index]);
  }
  if (question.type === 'true_false') {
    return clientAnswer.value === Boolean(expected.value);
  }
  const accepted = (expected.accepted ?? []).map(normalizeFillIn);
  return accepted.includes(normalizeFillIn(clientAnswer.value));
}

export function publicExplanation(question) {
  const expected = parseJson(question.answer) ?? {};
  return {
    correctAnswer: expected,
    explanation: question.explanation ?? '',
  };
}

export function praiseForPercent(percent) {
  if (percent >= 100) {
    return { level: 'perfect', message: 'Con giỏi quá! Đúng hết rồi! 🌟' };
  }
  if (percent >= 70) {
    return { level: 'great', message: 'Con làm rất tốt! Cố gắng thêm chút nữa nhé! 💪' };
  }
  if (percent >= 40) {
    return { level: 'good', message: 'Con đã cố gắng rồi! Luyện thêm sẽ giỏi hơn! 🌱' };
  }
  return { level: 'try-again', message: 'Đừng lo, con luyện thêm nhé! Mỗi lần đều tiến bộ! 🐣' };
}
