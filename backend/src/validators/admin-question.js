import { z } from 'zod';

export const optionSchema = z.object({
  key: z.string().regex(/^[a-e]$/),
  text: z.string().trim().min(1).max(500),
});

export const updateQuestionSchema = z.object({
  prompt: z.string().trim().min(1).max(1000),
  options: z.array(optionSchema).max(5),
  answer: z.any(),
  explanation: z.string().trim().min(1).max(4000),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['visible', 'hidden']).optional(),
});

export const questionListQuerySchema = z.object({
  topicId: z.string().trim().max(60).optional(),
  subjectId: z.string().trim().max(20).optional(),
  grade: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['visible', 'hidden']).optional(),
  type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'fill_in']).optional(),
  q: z.string().trim().max(100).optional(),
});
