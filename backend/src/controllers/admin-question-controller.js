import { parsePagination } from '../utils/pagination.js';
import { asyncHandler } from '../utils/errors.js';
import {
  createQuestion,
  getQuestionDetail,
  importQuestionDrafts,
  listQuestions,
  listWriteAudit,
  updateQuestion,
} from '../services/admin-service.js';
import { aiQuestionConfig, generateQuestionsWithAi } from '../services/ai-question-service.js';
import { extractDocxQuestions, extractDocxText } from '../services/docx-import-service.js';
import {
  createQuestionSchema,
  importQuestionsSchema,
  questionListQuerySchema,
  updateQuestionSchema,
} from '../validators/admin-question.js';

export const listQuestionsHandler = asyncHandler(async (request, response) => {
  const { page, limit } = parsePagination(request.query);
  const filters = questionListQuerySchema.parse(request.query);
  const result = await listQuestions(filters, page, limit);
  response.json({ data: result.items, pagination: { page, limit, total: result.total } });
});

export const questionDetailHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getQuestionDetail(request.params.id) });
});

export const createQuestionHandler = asyncHandler(async (request, response) => {
  const payload = createQuestionSchema.parse(request.body);
  response.status(201).json({ data: await createQuestion(request.user.id, payload) });
});

export const updateQuestionHandler = asyncHandler(async (request, response) => {
  const payload = updateQuestionSchema.parse(request.body);
  response.json({ data: await updateQuestion(request.params.id, request.user.id, payload) });
});

export const questionAuditHandler = asyncHandler(async (request, response) => {
  response.json({ data: await listWriteAudit(request.params.id) });
});

export const importConfigHandler = asyncHandler(async (_request, response) => {
  response.json({
    data: {
      ai: aiQuestionConfig(),
      maxFileBytes: 5 * 1024 * 1024,
      acceptedExtension: '.docx',
      maxQuestionsPerImport: 100,
    },
  });
});

export const importDocxHandler = asyncHandler(async (request, response) => {
  const result = await extractDocxQuestions(request.file.buffer, request.file.originalname);
  response.json({ data: result });
});

export const importAiHandler = asyncHandler(async (request, response) => {
  const { text } = await extractDocxText(request.file.buffer);
  const result = await generateQuestionsWithAi(text, {
    subjectName: request.body.subjectName ?? '',
    grade: request.body.grade ? Number(request.body.grade) : null,
    topicName: request.body.topicName ?? '',
  });
  response.json({ data: { ...result, fileName: request.file.originalname } });
});

export const importDraftsHandler = asyncHandler(async (request, response) => {
  const payload = importQuestionsSchema.parse(request.body);
  response.status(201).json({ data: await importQuestionDrafts(request.user.id, payload) });
});
