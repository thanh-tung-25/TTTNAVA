import { writeAdminAudit } from '../services/admin-audit.js';
import { adminScopeOf } from '../utils/admin-permissions.js';
export function adminAudit(req, res, next) {
  const json = res.json;
  res.json = function auditedJson(body) {
    if (req.user?.role !== 'admin' || !['POST','PUT','PATCH','DELETE'].includes(req.method)
      || res.statusCode >= 400 || res.locals.adminAuditWritten) return json.call(this, body);
    res.json = json;
    const route = req.baseUrl + (typeof req.route?.path === 'string' ? req.route.path : '');
    const id = req.params?.id || req.params?.key || body?.data?.id || body?.data?.documentId || null;
    // Record route and identity only, never raw payloads, passwords or Word text.
    writeAdminAudit(req.user, req.method + ' ' + route, req.baseUrl.slice(0,100),
      typeof id === 'string' ? id.slice(0,100) : null,
      { scope: adminScopeOf(req.user), status: res.statusCode })
      .then(() => json.call(res, body)).catch(next);
    return res;
  };
  next();
}
