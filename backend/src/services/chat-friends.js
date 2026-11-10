import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {one} from '../repositories/chinese.js';
import {parse} from '../validators/chinese.js';
import {badRequest,forbidden,notFound} from '../utils/errors.js';
import {assertProfilesCanInteract} from '../utils/student-visibility.js';
import {chatProfile,chatProfileCondition} from './chat-visibility.js';
const pair=(a,b)=>[a,b].sort();
export async function friendship(a,b,run=query){
 await assertProfilesCanInteract(a,b,run);
 const [row]=await run('SELECT status,requester_id FROM chat_friendships WHERE user_a=? AND user_b=?',pair(a,b));
 return !row?'none':row.status==='accepted'?'friend':row.requester_id===a?'outgoing':'incoming';
}
export async function requireFriend(a,b,run=query){if(await friendship(a,b,run)!=='friend')throw forbidden('Cần được chấp nhận kết bạn trước khi nhắn tin hoặc mời vào nhóm.');}
export async function friends(user){
 const viewer=await chatProfile(user);
 if(viewer.deleted_at)throw notFound();
 const rows=await query(`SELECT p.id,p.username,p.display_name,p.avatar_key,p.role,f.status,f.requester_id FROM chat_friendships f JOIN profiles p ON p.id=CASE WHEN f.user_a=? THEN f.user_b ELSE f.user_a END WHERE (f.user_a=? OR f.user_b=?) AND p.deleted_at IS NULL AND (p.banned_until IS NULL OR p.banned_until<CURRENT_TIMESTAMP) AND ${chatProfileCondition(viewer)} ORDER BY p.display_name`,[user,user,user]);
 return rows.map(({status,requester_id,...p})=>({...p,friendship:status==='accepted'?'friend':requester_id===user?'outgoing':'incoming'}));
}
export async function changeFriend(user,id,body){
 id=parse(z.string().uuid(),id);if(id===user)throw badRequest('Không thể tự kết bạn.');
 const action=parse(z.enum(['request','accept','reject','cancel','remove']),body.action);
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  for(const who of pair(user,id))await one("SELECT id FROM profiles WHERE id=? AND role IN ('student','admin') AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<CURRENT_TIMESTAMP) FOR UPDATE",[who],run);
  await assertProfilesCanInteract(user,id,run);
  const blocked=await run('SELECT student_id FROM chat_blocks WHERE (student_id=? AND peer_id=?) OR (student_id=? AND peer_id=?)',[user,id,id,user]);
  if(blocked.length)throw forbidden('Không thể kết bạn khi một người đã chặn người còn lại.');
  const current=await friendship(user,id,run),params=pair(user,id);
  if(action==='request'){
   if(current==='none')await run("INSERT INTO chat_friendships(user_a,user_b,requester_id,status) VALUES (?,?,?,'pending')",[...params,user]);
   return {friendship:current==='none'?'outgoing':current};
  }
  if(action==='accept'){
   if(current!=='incoming')throw forbidden('Chỉ người nhận mới có thể chấp nhận lời mời đang chờ.');
   await run("UPDATE chat_friendships SET status='accepted' WHERE user_a=? AND user_b=?",params);return {friendship:'friend'};
  }
  const expected={reject:'incoming',cancel:'outgoing',remove:'friend'}[action];
  if(current!==expected)throw forbidden('Thao tác không phù hợp trạng thái kết bạn hiện tại.');
  await run('DELETE FROM chat_friendships WHERE user_a=? AND user_b=?',params);return {friendship:'none'};
 });
}
