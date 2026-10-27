import { getAdminStats } from '../services/stats-service.js';
import { asyncHandler } from '../utils/errors.js';

export const adminStatsHandler = asyncHandler(async (_request, response) => {
  response.json({ data: await getAdminStats() });
});
