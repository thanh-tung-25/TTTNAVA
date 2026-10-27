import { parsePagination } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';
import {
  getQuestionDetail,
  listQuestions,
  listWriteAudit,
  updateQuestion,
} from '../services/admin-service.js';
import { questionListQuerySchema, updateQuestionSchema } from '../validators/admin-question.js';

export const listQuestionsHandler = asyncHandler(async (request, response) => {
  const { page, limit } = parsePagination(request.query);
  const filters = questionListQuerySchema.parse(request.query);
  const result = await listQuestions(filters, page, limit);
  response.json({ data: result.items, pagination: { page, limit, total: result.total } });
});

export const questionDetailHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getQuestionDetail(request.params.id) });
});

export const updateQuestionHandler = asyncHandler(async (request, response) => {
  const payload = updateQuestionSchema.parse(request.body);
  response.json({ data: await updateQuestion(request.params.id, request.user.id, payload) });
});

export const questionAuditHandler = asyncHandler(async (request, response) => {
  response.json({ data: await listWriteAudit(request.params.id) });
});
