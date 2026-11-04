import { getAdminStats } from '../services/stats-service.js';
import { asyncHandler } from '../utils/errors.js';
import { adminScopeOf } from '../utils/admin-permissions.js';

export const adminStatsHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getAdminStats(adminScopeOf(request.user)) });
});
