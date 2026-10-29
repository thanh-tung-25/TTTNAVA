import { z } from 'zod';

export const optionSchema = z.object({
  key: z.string().regex(/^[a-e]$/),
  text: z.string().trim().min(1).max(500),
});

const questionTypeSchema = z.enum(['single_choice', 'multiple_choice', 'true_false', 'fill_in']);
const questionStatusSchema = z.enum(['draft', 'published', 'hidden']);
const scopeFields = {
  yearId: z.string().trim().max(20).optional(),
  grade: z.coerce.number().int().min(1).max(5).optional(),
  semester: z.enum(['hk1', 'hk2']).optional(),
  subjectId: z.string().trim().max(20).optional(),
  chapterId: z.string().trim().max(90).optional(),
  lessonId: z.string().trim().max(90).optional(),
  topicId: z.string().trim().max(60).optional(),
};

const contentFields = {
  options: z.array(optionSchema).max(5),
  answer: z.any(),
  explanation: z.string().trim().min(1).max(4000),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  imageUrl: z.string().trim().max(500).nullable().optional(),
};

function requireScope(value, context) {
  if (!value.lessonId && !value.topicId) {
    context.addIssue({
      code: 'custom',
      path: ['lessonId'],
      message: 'Vui lòng chọn bài học',
    });
  }
}

export const createQuestionSchema = z.object({
  ...scopeFields,
  type: questionTypeSchema,
  prompt: z.string().trim().min(1).max(1000),
  ...contentFields,
  status: questionStatusSchema.default('draft'),
}).superRefine(requireScope);

export const updateQuestionSchema = z.object({
  ...scopeFields,
  type: questionTypeSchema.optional(),
  prompt: z.string().trim().min(1).max(1000),
  ...contentFields,
  status: questionStatusSchema.optional(),
});

export const importQuestionsSchema = z.object({
  ...scopeFields,
  questions: z.array(z.object({
    type: questionTypeSchema,
    prompt: z.string().trim().min(1).max(1000),
    ...contentFields,
  })).min(1).max(100),
}).superRefine(requireScope);

export const questionListQuerySchema = z.object({
  ...scopeFields,
  status: questionStatusSchema.optional(),
  type: questionTypeSchema.optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  q: z.string().trim().max(100).optional(),
}).superRefine((value, context) => {
  if (!value.lessonId && !value.chapterId && !value.topicId) {
    context.addIssue({
      code: 'custom',
      path: ['scope'],
      message: 'Chọn chương hoặc bài học trước khi tải câu hỏi',
    });
  }
});

export const curriculumTreeQuerySchema = z.object({
  yearId: z.string().trim().max(20).optional(),
});
