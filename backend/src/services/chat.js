import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {one} from '../repositories/chinese.js';
import {parse} from '../validators/chinese.js';
import {badRequest,forbidden} from '../utils/errors.js';
import {friends,friendship,requireFriend} from './chat-friends.js';
import {assertProfilesCanInteract} from '../utils/student-visibility.js';
import {chatProfile,chatProfileCondition,chatRoomCondition,assertChatParticipants,assertRoomVisibleTo} from './chat-visibility.js';
const uuid=z.string().uuid(),runTx=c=>async(sql,p=[]) => (await c.query(sql,p))[0];
async function student(id,run=query){return one("SELECT id,username,display_name FROM profiles WHERE id=? AND role IN ('student','admin') AND (banned_until IS NULL OR banned_until<CURRENT_TIMESTAMP)",[id],run);}
async function member(user,id,run=query){const viewer=await chatProfile(user,run);return one(`SELECT r.* FROM chat_rooms r JOIN chat_members m ON m.room_id=r.id WHERE r.id=? AND m.student_id=? AND ${chatRoomCondition(viewer)}`,[parse(uuid,id),user],run);}
async function blocked(a,b,run=query){return (await run('SELECT student_id FROM chat_blocks WHERE (student_id=? AND peer_id=?) OR (student_id=? AND peer_id=?)',[a,b,b,a])).length>0;}
export async function search(user,q){
 q=parse(z.string().trim().min(2).max(60),q);
 const pattern='%'+q.toLowerCase().replace(/[!%_]/g,'!$&')+'%';
 const viewer=await chatProfile(user);
 const rows=await query(`SELECT p.id,p.username,p.display_name,p.avatar_key,p.role FROM profiles p WHERE p.role IN ('student','admin') AND p.id<>? AND (p.banned_until IS NULL OR p.banned_until<CURRENT_TIMESTAMP) AND (LOWER(p.username) LIKE ? ESCAPE '!' OR LOWER(p.display_name) LIKE ? ESCAPE '!') AND NOT EXISTS(SELECT 1 FROM chat_blocks b WHERE (b.student_id=? AND b.peer_id=p.id) OR (b.peer_id=? AND b.student_id=p.id)) AND ${chatProfileCondition(viewer)} ORDER BY p.username LIMIT 15`,[user,pattern,pattern,user,user]);
 const states=new Map((await friends(user)).map(p=>[p.id,p.friendship]));return rows.map(p=>({...p,friendship:states.get(p.id)||'none'}));
}
export async function rooms(user){
 const viewer=await chatProfile(user);
 const rows=await query(`SELECT r.* FROM chat_rooms r JOIN chat_members m ON m.room_id=r.id WHERE m.student_id=? AND ${chatRoomCondition(viewer)} ORDER BY r.updated_at DESC,r.id`,[user]);
 if(!rows.length)return rows;
 const members=await query('SELECT m.room_id,p.id,p.username,p.display_name,p.avatar_key FROM chat_members m JOIN profiles p ON p.id=m.student_id JOIN chat_members me ON me.room_id=m.room_id AND me.student_id=? ORDER BY m.joined_at,p.id',[user]);
 const blockedRows=await query('SELECT student_id,peer_id FROM chat_blocks WHERE student_id=? OR peer_id=?',[user,user]);
 const blockedIds=new Set(blockedRows.map(b=>b.student_id===user?b.peer_id:b.student_id));
 const counts=await query('SELECT x.room_id,COUNT(*) total FROM chat_messages x JOIN chat_members me ON me.room_id=x.room_id AND me.student_id=? WHERE x.sender_id<>? AND x.hidden=0 AND (me.last_read_at IS NULL OR x.created_at>me.last_read_at) AND NOT EXISTS(SELECT 1 FROM chat_blocks b WHERE (b.student_id=? AND b.peer_id=x.sender_id) OR (b.peer_id=? AND b.student_id=x.sender_id)) GROUP BY x.room_id',[user,user,user,user]);
 const unread=new Map(counts.map(r=>[r.room_id,Number(r.total)]));
 const states=new Map((await friends(user)).map(p=>[p.id,p.friendship]));
 for(const r of rows){
  r.members=members.filter(m=>m.room_id===r.id).map(({room_id,...m})=>m);
  r.peer=r.kind==='direct'?r.members.find(m=>m.id!==user):null;
  r.blocked=r.peer?blockedIds.has(r.peer.id):false;r.unread=unread.get(r.id)||0;
  r.friendship=r.peer?states.get(r.peer.id)||'none':null;r.can_message=!r.blocked&&(r.kind==='group'||r.friendship==='friend');
 }
 return rows;
}
export async function createRoom(user,body){
 const d=parse(z.object({kind:z.enum(['direct','group']),title:z.string().trim().max(100).default(''),members:z.array(uuid).min(1).max(19)}).strict(),body);
 const ids=[...new Set([user,...d.members])];if(ids.length<2)throw badRequest('Chọn ít nhất một bạn khác.');
 if(d.kind==='direct'&&ids.length!==2)throw badRequest('Nhắn riêng chỉ có hai người.');
 if(d.kind==='group'&&!d.title)throw badRequest('Nhập tên nhóm học.');
 return withTransaction(async c=>{
  const run=runTx(c);
  // A stable lock serializes simultaneous direct-room creation from either side.
  for(const id of [...ids].sort())await one('SELECT id FROM profiles WHERE id=? FOR UPDATE',[id],run);
  await assertChatParticipants(ids,run);
  for(const id of ids){await student(id,run);if(id!==user&&await blocked(user,id,run))throw forbidden('Không thể trò chuyện với người đang chặn hoặc đã bị chặn.');}
  for(const id of ids)if(id!==user)await requireFriend(user,id,run);
  const key=d.kind==='direct'?[...ids].sort().join(':'):null;
  if(key){const [old]=await run('SELECT id FROM chat_rooms WHERE direct_key=?',[key]);if(old){await member(user,old.id,run);return old;}}
  const id=randomUUID();await run('INSERT INTO chat_rooms(id,kind,title,owner_id,direct_key) VALUES (?,?,?,?,?)',[id,d.kind,d.title,user,key]);
  for(const studentId of ids)await run('INSERT INTO chat_members(room_id,student_id) VALUES (?,?)',[id,studentId]);
  return {id};
 });
}
export async function messages(user,roomId,before){
 await member(user,roomId);let cursor=null;
 if(before)cursor=await one('SELECT created_at,id FROM chat_messages WHERE id=? AND room_id=?',[parse(uuid,before),roomId]);
 const rows=await query(`SELECT x.id,x.room_id,x.sender_id,x.client_id,x.body,x.hidden,x.created_at,p.display_name,p.avatar_key FROM chat_messages x JOIN profiles p ON p.id=x.sender_id WHERE x.room_id=? AND NOT EXISTS(SELECT 1 FROM chat_blocks b WHERE (b.student_id=? AND b.peer_id=x.sender_id) OR (b.peer_id=? AND b.student_id=x.sender_id)) ${cursor?'AND (x.created_at<? OR (x.created_at=? AND x.id<?))':''} ORDER BY x.created_at DESC,x.id DESC LIMIT 41`,[roomId,user,user,...(cursor?[cursor.created_at,cursor.created_at,cursor.id]:[])]);
 return {items:rows.slice(0,40).reverse().map(m=>({...m,body:m.hidden?'Tin nhắn đã được gỡ.':m.body})),has_more:rows.length>40};
}
export async function send(user,id,body){
 const d=parse(z.object({text:z.string().trim().min(1).max(2000),client_id:uuid}).strict(),body);
 return withTransaction(async c=>{
  const run=runTx(c);await one('SELECT id FROM chat_rooms WHERE id=? FOR UPDATE',[parse(uuid,id)],run);const r=await member(user,id,run);
  if(r.kind==='direct'){const [peer]=await run('SELECT student_id FROM chat_members WHERE room_id=? AND student_id<>?',[id,user]);if(!peer||await blocked(user,peer.student_id,run))throw forbidden('Không thể gửi tin nhắn khi một người đã chặn người còn lại.');await requireFriend(user,peer.student_id,run);}
  const [old]=await run('SELECT id,room_id FROM chat_messages WHERE sender_id=? AND client_id=?',[user,d.client_id]);if(old){if(old.room_id!==id)throw badRequest('Mã gửi đã dùng ở cuộc trò chuyện khác.');return {id:old.id};}
  const messageId=randomUUID();await run('INSERT INTO chat_messages(id,room_id,sender_id,client_id,body) VALUES (?,?,?,?,?)',[messageId,id,user,d.client_id,d.text]);
  await run('UPDATE chat_rooms SET updated_at=CURRENT_TIMESTAMP WHERE id=?',[id]);return {id:messageId};
 });
}
export async function read(user,id){await member(user,id);await query(dialectSql('UPDATE chat_members SET last_read_at=CURRENT_TIMESTAMP(3) WHERE room_id=? AND student_id=?','UPDATE chat_members SET last_read_at=CURRENT_TIMESTAMP WHERE room_id=? AND student_id=?'),[id,user]);return {ok:true};}
export async function changeMembers(user,id,body){
 const d=parse(z.object({action:z.enum(['add','remove','leave','rename']),student_id:uuid.optional(),title:z.string().trim().min(1).max(100).optional()}).strict(),body);
 return withTransaction(async c=>{
  const run=runTx(c);await one('SELECT id FROM chat_rooms WHERE id=? FOR UPDATE',[parse(uuid,id)],run);const r=await member(user,id,run);
  if(r.kind!=='group')throw badRequest('Đây không phải nhóm học.');
  if(d.action==='leave'){
   if(r.owner_id===user){const others=await run('SELECT student_id FROM chat_members WHERE room_id=? AND student_id<>? ORDER BY joined_at,student_id',[id,user]);if(!others.length){await run('DELETE FROM chat_rooms WHERE id=?',[id]);return {ok:true};}await run('UPDATE chat_rooms SET owner_id=? WHERE id=?',[others[0].student_id,id]);}
   await run('DELETE FROM chat_members WHERE room_id=? AND student_id=?',[id,user]);return {ok:true};
  }
  if(r.owner_id!==user)throw forbidden('Chỉ trưởng nhóm được quản lý nhóm.');
  if(d.action==='rename'){if(!d.title)throw badRequest('Nhập tên nhóm.');await run('UPDATE chat_rooms SET title=? WHERE id=?',[d.title,id]);return {ok:true};}
  const target=parse(uuid,d.student_id);if(target===user)throw badRequest('Dùng nút Rời nhóm nếu muốn rời nhóm.');
  if(d.action==='add'){
   await student(target,run);const members=await run('SELECT student_id FROM chat_members WHERE room_id=?',[id]);
   await assertChatParticipants([...members.map(m=>m.student_id),target],run);await assertRoomVisibleTo(target,id,run);
   await requireFriend(user,target,run);
   if(members.some(m=>m.student_id===target))return {ok:true};if(members.length>=20)throw badRequest('Nhóm tối đa 20 người.');
   for(const m of members)if(await blocked(m.student_id,target,run))throw forbidden('Không thể thêm bạn đang có quan hệ chặn với thành viên nhóm.');
   await run('INSERT INTO chat_members(room_id,student_id) VALUES (?,?)',[id,target]);
  }else await run('DELETE FROM chat_members WHERE room_id=? AND student_id=?',[id,target]);
  return {ok:true};
 });
}
export async function blocks(user){const viewer=await chatProfile(user);return query(`SELECT p.id,p.display_name,p.username FROM chat_blocks b JOIN profiles p ON p.id=b.peer_id WHERE b.student_id=? AND ${chatProfileCondition(viewer)}`,[user]);}
export async function block(user,id,enabled){
 id=parse(uuid,id);if(id===user)throw badRequest('Không thể tự chặn.');await assertProfilesCanInteract(user,id);await student(id);
 return withTransaction(async c=>{const run=runTx(c);for(const who of [user,id].sort())await one('SELECT id FROM profiles WHERE id=? FOR UPDATE',[who],run);
 await assertProfilesCanInteract(user,id,run);
 if(enabled){await run(dialectSql('INSERT IGNORE INTO chat_blocks(student_id,peer_id) VALUES (?,?)','INSERT INTO chat_blocks(student_id,peer_id) VALUES (?,?) ON CONFLICT DO NOTHING'),[user,id]);await run('DELETE FROM chat_friendships WHERE user_a=? AND user_b=?',[...[user,id].sort()]);}
 else await run('DELETE FROM chat_blocks WHERE student_id=? AND peer_id=?',[user,id]);return {ok:true};});
}
export async function report(user,id,body){
 const reason=parse(z.string().trim().min(1).max(500),body.reason),m=await one('SELECT room_id FROM chat_messages WHERE id=?',[parse(uuid,id)]);await member(user,m.room_id);
 await query(dialectSql('INSERT IGNORE INTO chat_reports(id,message_id,reporter_id,reason) VALUES (?,?,?,?)','INSERT INTO chat_reports(id,message_id,reporter_id,reason) VALUES (?,?,?,?) ON CONFLICT(message_id,reporter_id) DO NOTHING'),[randomUUID(),id,user,reason]);return {ok:true};
}
export async function hideOwn(user,id){const m=await one('SELECT room_id,sender_id FROM chat_messages WHERE id=?',[parse(uuid,id)]);await member(user,m.room_id);if(m.sender_id!==user)throw forbidden();await query('UPDATE chat_messages SET hidden=1 WHERE id=?',[id]);return {ok:true};}
export async function reports(){return query("SELECT r.id,r.reason,r.created_at,m.id message_id,m.body,m.hidden,p.display_name sender,q.display_name reporter FROM chat_reports r JOIN chat_messages m ON m.id=r.message_id JOIN profiles p ON p.id=m.sender_id JOIN profiles q ON q.id=r.reporter_id WHERE r.status='open' ORDER BY r.created_at LIMIT 100");}
export async function moderate(id,body){const action=parse(z.enum(['hide','resolve']),body.action);const r=await one('SELECT message_id FROM chat_reports WHERE id=?',[parse(uuid,id)]);return withTransaction(async c=>{const run=runTx(c);if(action==='hide')await run('UPDATE chat_messages SET hidden=1 WHERE id=?',[r.message_id]);await run("UPDATE chat_reports SET status='resolved' WHERE id=?",[id]);return {ok:true};});}
