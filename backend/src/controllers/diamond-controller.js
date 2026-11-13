import { z } from 'zod';
import { getDiamondSummary, getLeaderboard } from '../services/ledger-service.js';
import { asyncHandler } from '../utils/errors.js';

const leaderboardQuery = z.object({
  range: z.enum(['week', 'month', 'all']).default('week'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  grade: z.coerce.number().int().min(1).max(9).optional(),
  program: z.enum(['chinese']).optional(),
});

export const summaryHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getDiamondSummary(request.user.id) });
});

export const leaderboardHandler = asyncHandler(async (request, response) => {
  const { range, limit, grade, program } = leaderboardQuery.parse(request.query);
  response.set('Cache-Control','private, no-store').json({
    data: await getLeaderboard(range, limit, grade ?? null, program ?? null),
    meta: { range, grade: grade ?? null, ...(program?{program}:{}) },
  });
});
