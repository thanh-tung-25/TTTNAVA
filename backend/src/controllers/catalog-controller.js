import { listSubjects, listTopics, getTopicDetail } from '../services/catalog-service.js';
import { asyncHandler } from '../utils/errors.js';

export const subjectsHandler = asyncHandler(async (_request, response) => {
  response.json({ data: await listSubjects() });
});

export const topicsHandler = asyncHandler(async (request, response) => {
  const grade = Number(request.query.grade);
  const subjectId = String(request.query.subjectId ?? '');
  response.json({ data: await listTopics(subjectId, grade) });
});

export const topicDetailHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getTopicDetail(request.params.id) });
});
