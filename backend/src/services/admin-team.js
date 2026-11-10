import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { hashPassword } from './auth-service.js';
import { publicProfile } from '../utils/serializers.js';
import { AppError } from '../utils/errors.js';
import { adminScopeOf } from '../utils/admin-permissions.js';
import { usernameToEmail } from '../utils/normalize.js';
import { writeAdminAudit } from './admin-audit.js';

const scopeSchema = z.enum(['super','chinese','primary','secondary']);
const passwordSchema = z.string().min(10).max(72).refine(value => Buffer.byteLength(value,'utf8') <= 72, 'Mật khẩu tối đa 72 byte.');
const createSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(20).regex(/^[a-z0-9_]+$/),
  displayName: z.string().trim().min(1).max(60), password: passwordSchema, adminScope: scopeSchema,
}).strict();
const accessSchema = z.object({ adminScope: scopeSchema.optional(), locked: z.boolean().optional() }).strict()
  .refine(value => value.adminScope !== undefined || value.locked !== undefined, 'Chọn thay đổi cần lưu.');
export function listAdmins() {
  return query("SELECT * FROM profiles WHERE role='admin' ORDER BY created_at,id").then(rows => rows.map(publicProfile));
}
async function lockedAdmins(actor, connection) {
  const [rows] = await connection.query("SELECT * FROM profiles WHERE role='admin' ORDER BY id FOR UPDATE");
  const current = rows.find(row => row.id === actor.id);
  if (!current || adminScopeOf(current) !== 'super' || current.banned_until && new Date(current.banned_until) > new Date()) {
    throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Chỉ admin tổng được quản lý quản trị viên.');
  }
  return rows;
}
export async function createAdmin(actor, body) {
  const value = createSchema.parse(body), id = randomUUID();
  const hash = await hashPassword(value.password);
  return withTransaction(async connection => {
    await lockedAdmins(actor, connection);
    await connection.query("INSERT INTO profiles(id,username,email,password_hash,role,display_name,grade,admin_scope) VALUES (?,?,?,?,'admin',?,NULL,?)",
      [id,value.username,usernameToEmail(value.username),hash,value.displayName,value.adminScope]);
    await writeAdminAudit(actor,'admin.create','administrator',id,{ adminScope:value.adminScope },async(sql,p)=>(await connection.query(sql,p))[0]);
    const [rows] = await connection.query('SELECT * FROM profiles WHERE id=?',[id]);
    return publicProfile(rows[0]);
  });
}
export async function updateAdminAccess(actor, id, body) {
  const value = accessSchema.parse(body);
  return withTransaction(async connection => {
    const rows = await lockedAdmins(actor,connection), target = rows.find(row => row.id === id);
    if (!target) throw new AppError(404,'ADMIN_NOT_FOUND','Không tìm thấy quản trị viên.');
    const nextScope = value.adminScope ?? target.admin_scope;
    const locked = value.locked ?? Boolean(target.banned_until && new Date(target.banned_until)>new Date());
    const activeSuper = rows.filter(row => adminScopeOf(row)==='super' && (!row.banned_until || new Date(row.banned_until)<=new Date()));
    if (adminScopeOf(target)==='super' && (!target.banned_until || new Date(target.banned_until)<=new Date()) && (nextScope!=='super'||locked) && activeSuper.length<=1) {
      throw new AppError(409,'LAST_SUPER_ADMIN','Phải giữ ít nhất một admin tổng đang hoạt động.');
    }
    if (actor.id===id) throw new AppError(409,'SELF_ACCESS_CHANGE','Hãy nhờ admin tổng khác đổi quyền hoặc khóa tài khoản của bạn.');
    await connection.query('UPDATE profiles SET admin_scope=?,banned_until=?,admin_auth_version=admin_auth_version+1 WHERE id=?',[nextScope,locked?'2999-01-01 00:00:00':null,id]);
    await writeAdminAudit(actor,'admin.access','administrator',id,{ beforeScope:target.admin_scope,adminScope:nextScope,locked },async(sql,p)=>(await connection.query(sql,p))[0]);
    const [updated] = await connection.query('SELECT * FROM profiles WHERE id=?',[id]);
    return publicProfile(updated[0]);
  });
}
export async function resetAdminPassword(actor,id,body) {
  const { password } = z.object({password:passwordSchema}).strict().parse(body);
  const hash = await hashPassword(password);
  return withTransaction(async connection => {
    const rows = await lockedAdmins(actor,connection);
    if (!rows.some(row=>row.id===id)) throw new AppError(404,'ADMIN_NOT_FOUND','Không tìm thấy quản trị viên.');
    await connection.query('UPDATE profiles SET password_hash=?,admin_auth_version=admin_auth_version+1 WHERE id=?',[hash,id]);
    await writeAdminAudit(actor,'admin.password','administrator',id,{},async(sql,p)=>(await connection.query(sql,p))[0]);
    return { updated:true, reauthenticate:actor.id===id };
  });
}
export async function listAdminAudit(page = 1) {
  return query('SELECT id,actor_username,action,resource_type,resource_id,details_json,created_at FROM admin_audit_log ORDER BY id DESC LIMIT 50 OFFSET ?',[(page-1)*50]);
}
