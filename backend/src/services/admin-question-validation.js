import { AppError } from '../utils/errors.js';

export function normalizeQuestionStatus(row) {
  if (row.status === 'hidden') return 'hidden';
  if (row.status === 'published') return 'published';
  return 'draft';
}

export function validateQuestionPayload(type, payload) {
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt || prompt.length > 1000) {
    throw new AppError(400, 'INVALID_PROMPT', 'Đề bài phải từ 1 đến 1000 ký tự');
  }
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
      if (!/^[a-e]$/.test(option.key)) {
        throw new AppError(400, 'INVALID_OPTION_KEY', 'Khóa phương án phải là a–e');
      }
      if (keys.has(option.key)) {
        throw new AppError(400, 'DUPLICATE_OPTION_KEY', 'Khóa phương án bị trùng');
      }
      keys.add(option.key);
      const text = String(option.text ?? '').trim();
      if (!text || text.length > 500) {
        throw new AppError(400, 'INVALID_OPTION_TEXT', 'Nội dung phương án phải từ 1 đến 500 ký tự');
      }
      const textKey = text.toLocaleLowerCase('vi');
      if (texts.has(textKey)) {
        throw new AppError(400, 'DUPLICATE_OPTION_TEXT', 'Nội dung các phương án không được trùng');
      }
      texts.add(textKey);
    }
    if (type === 'single_choice') {
      if (!keys.has(answer.key)) {
        throw new AppError(400, 'INVALID_ANSWER', 'Đáp án đúng không nằm trong các phương án');
      }
    } else {
      const answerKeys = [...new Set(answer.keys ?? [])];
      if (answerKeys.length < 2 || answerKeys.length >= options.length
        || answerKeys.some((key) => !keys.has(key))) {
        throw new AppError(400, 'INVALID_ANSWER', 'Câu nhiều đáp án cần ít nhất 2 đáp án đúng và không được chọn tất cả');
      }
    }
  } else if (type === 'true_false') {
    if (typeof answer.value !== 'boolean') {
      throw new AppError(400, 'INVALID_ANSWER', 'Đáp án Đúng/Sai không hợp lệ');
    }
  } else if (type === 'fill_in') {
    const accepted = Array.isArray(answer.accepted)
      ? answer.accepted.map((text) => String(text).trim()).filter(Boolean)
      : [];
    if (accepted.length === 0) {
      throw new AppError(400, 'INVALID_ANSWER', 'Cần ít nhất một đáp án điền');
    }
    if (accepted.some((text) => text.length > 200)) {
      throw new AppError(400, 'INVALID_ANSWER', 'Đáp án điền tối đa 200 ký tự');
    }
  } else {
    throw new AppError(400, 'INVALID_TYPE', 'Loại câu hỏi không hợp lệ');
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
