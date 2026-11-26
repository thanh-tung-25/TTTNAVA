import { getAdminStats,getAdminDiamondLeaders } from '../services/stats-service.js';
import { asyncHandler } from '../utils/errors.js';
import { adminScopeOf } from '../utils/admin-permissions.js';

export const adminStatsHandler = asyncHandler(async (request, response) => {
  response.json({ data: await getAdminStats(request.schoolProgram || adminScopeOf(request.user)) });
});
export const adminDiamondLeadersHandler = asyncHandler(async(request,response)=>{
 response.set('Cache-Control','private, no-store').json({data:await getAdminDiamondLeaders(request.user)});
});
