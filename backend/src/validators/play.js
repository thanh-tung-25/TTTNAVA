import { z } from 'zod';
import { topicIdSchema } from './common.js';

export const startTopicSchema = z.object({
  topicId: topicIdSchema,
});

export const submitAnswerSchema = z.object({
  questionId: z.string().trim().min(3).max(80),
  answer: z.any(),
});

export const answerOnlySchema = z.object({
  answer: z.any(),
});
