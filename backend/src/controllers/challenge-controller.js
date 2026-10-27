import { z } from 'zod';
import { challengeInviteSchema, robotChallengeSchema } from '../validators/play.js';
import {
  acceptChallenge,
  answerChallenge,
  buildState,
  createInvitation,
  createRobotChallenge,
  declineChallenge,
  forfeitChallenge,
  listLobby,
} from '../services/challenge-service.js';
import { asyncHandler } from '../utils/errors.js';

const answerBodySchema = z.object({
  index: z.coerce.number().int().min(0),
  questionId: z.string().trim().min(3).max(80),
  answer: z.any(),
});

export const lobbyHandler = asyncHandler(async (request, response) => {
  response.json({ data: await listLobby(request.user.id) });
});

export const inviteHandler = asyncHandler(async (request, response) => {
  const payload = challengeInviteSchema.parse(request.body);
  response.status(201).json({ data: await createInvitation(request.user, payload) });
});

export const robotHandler = asyncHandler(async (request, response) => {
  const payload = robotChallengeSchema.parse(request.body);
  response.status(201).json({ data: await createRobotChallenge(request.user, payload) });
});

export const stateHandler = asyncHandler(async (request, response) => {
  response.json({ data: await buildState(request.user.id, request.params.id) });
});

export const acceptHandler = asyncHandler(async (request, response) => {
  response.json({ data: await acceptChallenge(request.user.id, request.params.id) });
});

export const declineHandler = asyncHandler(async (request, response) => {
  response.json({ data: await declineChallenge(request.user.id, request.params.id) });
});

export const forfeitHandler = asyncHandler(async (request, response) => {
  response.json({ data: await forfeitChallenge(request.user.id, request.params.id) });
});

export const answerHandler = asyncHandler(async (request, response) => {
  const payload = answerBodySchema.parse(request.body);
  response.json({ data: await answerChallenge(request.user.id, request.params.id, payload) });
});
