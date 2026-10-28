import { z } from 'zod';

export const optionSchema = z.object({
  key: z.string().regex(/^[a-e]$/),
  text: z.string().trim().min(1).max(500),
});

const questionTypeSchema = z.enum(['single_choice', 'multiple_choice', 'true_false', 'fill_in']);
const questionStatusSchema = z.enum(['draft', 'published', 'hidden']);

const contentFields = {
  options: z.array(optionSchema).max(5),
  answer: z.any(),
  explanation: z.string().trim().min(1).max(4000),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  imageUrl: z.string().trim().max(500).nullable().optional(),
};

const topicFields = {
  topicId: z.string().trim().min(1).max(60),
  subjectId: z.string().trim().min(1).max(20),
  grade: z.coerce.number().int().min(1).max(5),
};

export const createQuestionSchema = z.object({
  ...topicFields,
  type: questionTypeSchema,
  prompt: z.string().trim().min(1).max(1000),
  ...contentFields,
  status: questionStatusSchema.default('draft'),
});

export const updateQuestionSchema = z.object({
  type: questionTypeSchema.optional(),
  prompt: z.string().trim().min(1).max(1000),
  ...contentFields,
  status: questionStatusSchema.optional(),
  topicId: topicFields.topicId.optional(),
  subjectId: topicFields.subjectId.optional(),
  grade: topicFields.grade.optional(),
});

export const importQuestionsSchema = z.object({
  ...topicFields,
  questions: z.array(z.object({
    type: questionTypeSchema,
    prompt: z.string().trim().min(1).max(1000),
    ...contentFields,
  })).min(1).max(100),
});

export const questionListQuerySchema = z.object({
  topicId: z.string().trim().max(60).optional(),
  subjectId: z.string().trim().max(20).optional(),
  grade: z.coerce.number().int().min(1).max(5).optional(),
  status: questionStatusSchema.optional(),
  type: questionTypeSchema.optional(),
  q: z.string().trim().max(100).optional(),
});
