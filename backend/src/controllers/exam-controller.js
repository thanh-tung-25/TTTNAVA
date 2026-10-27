import { startTopicSchema, submitAnswerSchema } from '../validators/play.js';
import {
  getExam,
  listExamHistory,
  saveExamAnswer,
  startExam,
  submitExam,
} from '../services/exam-service.js';
import { parsePagination } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';

export const startExamHandler = asyncHandler(async (request, response) => {
  const { topicId } = startTopicSchema.parse(request.body);
  response.status(201).json({ data: await startExam(request.user.id, topicId) });
});

export const getExamHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getExam(request.user.id, request.params.id) });
});

export const saveExamAnswerHandler = asyncHandler(async (request, response) => {
  const { questionId, answer } = submitAnswerSchema.parse(request.body);
  response.json({ data: await saveExamAnswer(request.user.id, request.params.id, questionId, answer) });
});

export const submitExamHandler = asyncHandler(async (request, response) => {
  response.json({ data: await submitExam(request.user.id, request.params.id) });
});

export const examHistoryHandler = asyncHandler(async (request, response) => {
  const { page, limit } = parsePagination(request.query);
  const result = await listExamHistory(request.user.id, page, limit);
  response.json({ data: result.items, pagination: { page, limit, total: result.total } });
});
