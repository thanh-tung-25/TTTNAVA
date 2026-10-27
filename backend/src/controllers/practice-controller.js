import { startTopicSchema, submitAnswerSchema } from '../validators/play.js';
import {
  answerPractice,
  finishPractice,
  getPracticeSession,
  listPracticeHistory,
  startPractice,
} from '../services/practice-service.js';
import { parsePagination } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

export const startPracticeHandler = asyncHandler(async (request, response) => {
  const { topicId } = startTopicSchema.parse(request.body);
  response.status(201).json({ data: await startPractice(request.user.id, topicId) });
});

export const getPracticeHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getPracticeSession(request.user.id, request.params.id) });
});

export const answerPracticeHandler = asyncHandler(async (request, response) => {
  const { questionId, answer } = submitAnswerSchema.parse(request.body);
  response.json({ data: await answerPractice(request.user.id, request.params.id, questionId, answer) });
});

export const finishPracticeHandler = asyncHandler(async (request, response) => {
  response.json({ data: await finishPractice(request.user.id, request.params.id) });
});

export const practiceHistoryHandler = asyncHandler(async (request, response) => {
  const { page, limit } = parsePagination(request.query);
  const result = await listPracticeHistory(request.user.id, page, limit);
  response.json({ data: result.items, pagination: { page, limit, total: result.total } });
});
