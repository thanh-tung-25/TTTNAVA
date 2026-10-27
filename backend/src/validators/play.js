import { z } from 'zod';
import { durationSchema, topicIdSchema } from './common.js';

export const startTopicSchema = z.object({
  topicId: topicIdSchema,
});

export const submitAnswerSchema = z.object({
  questionId: z.string().trim().min(3).max(80),
  answer: z.any(),
});

export const challengeInviteSchema = z.object({
  opponentUsername: z.string().trim().min(3).max(20),
  topicId: topicIdSchema,
  durationSeconds: durationSchema.default(600),
  grade: z.coerce.number().int().min(1).max(5).optional(),
});

export const robotChallengeSchema = z.object({
  topicId: topicIdSchema,
  durationSeconds: durationSchema.default(600),
  botLevel: z.enum(['easy', 'medium', 'hard']),
});

export const answerOnlySchema = z.object({
  answer: z.any(),
});
