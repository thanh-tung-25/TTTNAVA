import { query } from '../config/db.js';
export async function writeAdminAudit(actor, action, resourceType, resourceId, details = {}, run = query) {
  await run('INSERT INTO admin_audit_log(actor_id,actor_username,action,resource_type,resource_id,details_json) VALUES (?,?,?,?,?,?)',
    [actor.id, actor.username, action, resourceType, resourceId || null, JSON.stringify(details)]);
}
