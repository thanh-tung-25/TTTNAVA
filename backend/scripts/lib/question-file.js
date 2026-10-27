import { z } from 'zod';

export const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'true_false', 'fill_in'];

const optionSchema = z.object({
  key: z.string().regex(/^[a-e]$/),
  text: z.string().trim().min(1).max(500),
});

const questionSchema = z.object({
  id: z.string().trim().min(3).max(80),
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().trim().min(1).max(1000),
  options: z.array(optionSchema).max(5).optional(),
  answer: z.any(),
  explanation: z.string().trim().min(1).max(4000),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
}).superRefine((question, context) => {
  const options = question.options ?? [];
  const keys = new Set(options.map((option) => option.key));
  const texts = new Set();

  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    if (options.length < 2 || options.length > 5) {
      context.addIssue({ code: 'custom', message: 'Cần từ 2 đến 5 phương án', path: ['options'] });
    }
    if (keys.size !== options.length) {
      context.addIssue({ code: 'custom', message: 'Khóa phương án bị trùng', path: ['options'] });
    }
    for (const option of options) {
      const key = option.text.normalize('NFC').toLocaleLowerCase('vi');
      if (texts.has(key)) {
        context.addIssue({ code: 'custom', message: `Nội dung phương án trùng: ${option.text}`, path: ['options'] });
      }
      texts.add(key);
    }
    if (question.type === 'single_choice') {
      if (!question.answer || typeof question.answer.key !== 'string' || !keys.has(question.answer.key)) {
        context.addIssue({ code: 'custom', message: 'Đáp án đúng không nằm trong phương án', path: ['answer'] });
      }
    } else {
      const answerKeys = question.answer?.keys;
      if (!Array.isArray(answerKeys) || answerKeys.length < 2) {
        context.addIssue({ code: 'custom', message: 'Cần ít nhất 2 đáp án đúng', path: ['answer'] });
      } else {
        const unique = new Set(answerKeys);
        if (unique.size !== answerKeys.length) {
          context.addIssue({ code: 'custom', message: 'Đáp án đúng bị trùng', path: ['answer'] });
        }
        if (answerKeys.length >= options.length) {
          context.addIssue({ code: 'custom', message: 'Không được đúng tất cả phương án', path: ['answer'] });
        }
        if (answerKeys.some((key) => !keys.has(key))) {
          context.addIssue({ code: 'custom', message: 'Đáp án đúng không nằm trong phương án', path: ['answer'] });
        }
      }
    }
  }

  if (question.type === 'true_false') {
    if (!question.answer || typeof question.answer.value !== 'boolean') {
      context.addIssue({ code: 'custom', message: 'Đáp án Đúng/Sai phải là boolean', path: ['answer'] });
    }
    if (options.length > 0) {
      context.addIssue({ code: 'custom', message: 'Câu Đúng/Sai không có phương án', path: ['options'] });
    }
  }

  if (question.type === 'fill_in') {
    const accepted = question.answer?.accepted;
    if (!Array.isArray(accepted) || accepted.length === 0) {
      context.addIssue({ code: 'custom', message: 'Câu điền cần ít nhất một đáp án', path: ['answer'] });
    } else if (accepted.some((text) => typeof text !== 'string' || !text.trim() || text.length > 200)) {
      context.addIssue({ code: 'custom', message: 'Đáp án điền phải từ 1 đến 200 ký tự', path: ['answer'] });
    }
    if (options.length > 0) {
      context.addIssue({ code: 'custom', message: 'Câu điền không có phương án', path: ['options'] });
    }
  }
});

export const topicFileSchema = z.object({
  topic: z.object({
    id: z.string().trim().min(3).max(60),
    subjectId: z.enum(['toan', 'tieng-viet', 'tieng-anh']),
    grade: z.number().int().min(1).max(5),
    name: z.string().trim().min(1).max(120),
    slug: z.string().trim().min(1).max(80),
    sortOrder: z.number().int().min(1).max(100),
  }),
  questions: z.array(questionSchema).min(1),
});

export function sourcePathForQuestions(backendRoot) {
  return `${backendRoot}/seed-data/questions`;
}
