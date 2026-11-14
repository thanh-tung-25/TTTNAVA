import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {one} from '../repositories/chinese.js';
import {parse} from '../validators/chinese.js';
import {AppError,forbidden,notFound} from '../utils/errors.js';
import {assertChatParticipants,assertRoomVisibleTo} from './chat-visibility.js';
import {requireFriend} from './chat-friends.js';
import {callConfig,requireCalls,turnCredentials} from './chat-call-config.js';
import {notifyIncomingCall} from './chat-push.js';

const uuid=z.string().uuid(),clientBody=z.object({client_id:uuid}).strict();
const tx=fn=>withTransaction(c=>fn(async(sql,p=[])=>(await c.query(sql,p))[0]));
const conflict=message=>new AppError(409,'CALL_CONFLICT',message);
const live=row=>row.state==='ringing'||row.state==='accepted';
const stamp=value=>new Date(value).getTime();

async function participants(row,run=query){
 const rows=await run("SELECT id FROM profiles WHERE id IN (?,?) AND role IN ('student','admin') AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<CURRENT_TIMESTAMP)",[row.caller_id,row.callee_id]);
 if(rows.length!==2)throw forbidden('Tài khoản không còn được phép gọi.');
 await assertChatParticipants([row.caller_id,row.callee_id],run);
 await assertRoomVisibleTo(row.caller_id,row.room_id,run);
 await assertRoomVisibleTo(row.callee_id,row.room_id,run);
 const members=await run('SELECT student_id FROM chat_members WHERE room_id=?',[row.room_id]);
 if(members.length!==2||!members.some(m=>m.student_id===row.caller_id)||!members.some(m=>m.student_id===row.callee_id))throw forbidden('Cuộc trò chuyện đã thay đổi.');
 await requireFriend(row.caller_id,row.callee_id,run);
 if((await run('SELECT student_id FROM chat_blocks WHERE (student_id=? AND peer_id=?) OR (student_id=? AND peer_id=?)',[row.caller_id,row.callee_id,row.callee_id,row.caller_id])).length)throw forbidden('Không thể gọi khi đã chặn nhau.');
 const prefs=await run('SELECT student_id FROM chat_call_preferences WHERE student_id=? AND enabled=0',[row.callee_id]);
 if(prefs.length)throw forbidden('Bạn học đang tắt nhận cuộc gọi.');
}
async function finish(row,reason,run=query){
 const now=new Date();
 await run("UPDATE chat_calls SET state='ended',outcome=?,ended_at=?,offer_sdp=NULL,answer_sdp=NULL,budget_seconds=? WHERE id=? AND state<>'ended'",[reason,now,Math.min(Number(row.budget_seconds),Math.max(1,Math.ceil((now-stamp(row.created_at))/1000))),row.id]);
 return {...row,state:'ended',outcome:reason,ended_at:now,offer_sdp:null,answer_sdp:null};
}
async function expire(row,run=query){
 if(!live(row))return row;
 const now=Date.now();
 const reason=now>=stamp(row.deadline_at)?'limit':row.state==='ringing'&&now>=stamp(row.ring_until)?'missed'
  :now-stamp(row.caller_seen_at)>45000?'disconnected'
   :row.state==='accepted'&&now-stamp(row.callee_seen_at||row.accepted_at)>45000?'disconnected':null;
 return reason?finish(row,reason,run):row;
}
async function sweep(run){
 const rows=await run("SELECT * FROM chat_calls WHERE state IN ('ringing','accepted')");
 for(const row of rows)await expire(row,run);
 // Signaling is temporary connection data, never retained as call history.
 await run("UPDATE chat_calls SET offer_sdp=NULL,answer_sdp=NULL WHERE state='ended' AND (offer_sdp IS NOT NULL OR answer_sdp IS NOT NULL)");
}
async function own(user,id,run=query,lock=false){
 return one(`SELECT * FROM chat_calls WHERE id=? AND (caller_id=? OR callee_id=?)${lock?' FOR UPDATE':''}`,[parse(uuid,id),user,user],run);
}
function claim(row,user,client){
 const owner=user===row.caller_id?row.caller_client:row.callee_client;
 if(!owner||owner!==client)throw conflict('Cuộc gọi đang được xử lý ở tab hoặc thiết bị khác.');
}
async function authorized(row,run=query){
 row=await expire(row,run);
 if(live(row)){
  try{await participants(row,run);}catch(e){if(![403,404].includes(e.status))throw e;row=await finish(row,'unavailable',run);}
 }
 return row;
}
async function present(row,user,client,run=query){
 const caller=user===row.caller_id,claimed=Boolean(client)&&(caller?row.caller_client:row.callee_client)===client;
 const peer=await one('SELECT id,display_name,avatar_key FROM profiles WHERE id=?',[caller?row.callee_id:row.caller_id],run);
 return {id:row.id,room_id:row.room_id,media:row.media,state:row.state,outcome:row.outcome,
  caller,claimed,peer,created_at:row.created_at,accepted_at:row.accepted_at,ring_until:row.ring_until,deadline_at:row.deadline_at,
  ...(claimed&&live(row)?{offer_sdp:caller?null:row.offer_sdp,answer_sdp:caller?row.answer_sdp:null}:{}),
 };
}
export async function config(user){
 const cfg=callConfig();
 if(!cfg.enabled)return {enabled:false,push_enabled:false};
 const [pref]=await query('SELECT enabled FROM chat_call_preferences WHERE student_id=?',[user]);
 return {enabled:true,receiving:pref?Boolean(Number(pref.enabled)):true,max_seconds:cfg.maxSeconds,push_enabled:cfg.pushEnabled,
  ...(cfg.pushEnabled?{push_public_key:process.env.WEB_PUSH_PUBLIC_KEY}:{}),
 };
}
export async function preferences(user,body){
 requireCalls();const {enabled}=parse(z.object({enabled:z.boolean()}).strict(),body);
 await tx(async run=>{
  await one('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user],run);
  await run('DELETE FROM chat_call_preferences WHERE student_id=?',[user]);
  await run('INSERT INTO chat_call_preferences(student_id,enabled) VALUES (?,?)',[user,enabled?1:0]);
  if(!enabled)for(const row of await run("SELECT * FROM chat_calls WHERE callee_id=? AND state IN ('ringing','accepted')",[user]))await finish(row,'unavailable',run);
 });return {receiving:enabled};
}
export async function incoming(user){
 requireCalls();
 return tx(async run=>{
  const rows=await run("SELECT * FROM chat_calls WHERE callee_id=? AND state='ringing' AND offer_sdp IS NOT NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[user]);
  if(!rows.length)return null;
  const row=await authorized(rows[0],run);return live(row)?present(row,user,null,run):null;
 });
}
export async function create(user,body){
 requireCalls();
 const d=parse(z.object({room_id:uuid,client_id:uuid,media:z.enum(['audio','video'])}).strict(),body),cfg=callConfig();
 return tx(async run=>{
  // Shared SQL lock makes site-wide capacity and budget checks atomic on Vercel.
  await one('SELECT id FROM chat_call_control WHERE id=1 FOR UPDATE',[],run);
  await sweep(run);
  const room=await one("SELECT r.id FROM chat_rooms r JOIN chat_members m ON m.room_id=r.id WHERE r.id=? AND r.kind='direct' AND m.student_id=?",[d.room_id,user],run);
  const members=await run('SELECT student_id FROM chat_members WHERE room_id=? ORDER BY student_id',[room.id]);
  if(members.length!==2)throw forbidden('Chỉ gọi riêng giữa hai người.');
  const peer=members.find(m=>m.student_id!==user)?.student_id;if(!peer)throw notFound();
  for(const id of [user,peer].sort())await one('SELECT id FROM profiles WHERE id=? FOR UPDATE',[id],run);
  await participants({caller_id:user,callee_id:peer,room_id:room.id},run);
  const active=await run("SELECT * FROM chat_calls WHERE state IN ('ringing','accepted') AND (caller_id IN (?,?) OR callee_id IN (?,?))",[user,peer,user,peer]);
  const retry=active.find(r=>r.caller_id===user&&r.caller_client===d.client_id&&r.room_id===room.id&&r.media===d.media);
  if(retry)return present(retry,user,d.client_id,run);
  if(active.length)throw conflict('Con hoặc bạn đang có một cuộc gọi khác.');
  const since=new Date(Date.now()-60000),recent=await run('SELECT id FROM chat_calls WHERE caller_id=? AND created_at>?',[user,since]);
  if(recent.length>=3)throw new AppError(429,'CALL_COOLDOWN','Con chờ một phút rồi gọi lại nhé.');
  const all=await run("SELECT COUNT(*) AS total FROM chat_calls WHERE state IN ('ringing','accepted')");
  if(Number(all[0].total)>=cfg.maxConcurrent)throw conflict('Đang có nhiều bạn gọi. Con thử lại sau nhé.');
  const now=new Date(),month=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)),reserve=cfg.maxSeconds+cfg.ringSeconds;
  const [budget]=await run('SELECT COALESCE(SUM(budget_seconds),0) AS total FROM chat_calls WHERE created_at>=?',[month]);
  if(Number(budget.total)+reserve>cfg.monthlySeconds)throw new AppError(429,'CALL_MONTHLY_LIMIT','Tính năng gọi đã đạt giới hạn tháng này. Con hãy nhắn tin nhé.');
  const row={id:randomUUID(),room_id:room.id,caller_id:user,callee_id:peer,caller_client:d.client_id,media:d.media,state:'ringing',created_at:now,ring_until:new Date(now.getTime()+cfg.ringSeconds*1000),deadline_at:new Date(now.getTime()+reserve*1000),caller_seen_at:now,budget_seconds:reserve};
  await run('INSERT INTO chat_calls(id,room_id,caller_id,callee_id,caller_client,media,created_at,ring_until,deadline_at,caller_seen_at,budget_seconds) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[row.id,row.room_id,user,peer,d.client_id,d.media,now,row.ring_until,row.deadline_at,now,reserve]);
  return present(row,user,d.client_id,run);
 });
}
export async function poll(user,id,body){
 requireCalls();const d=parse(clientBody,body);
 return tx(async run=>{
  const row=await authorized(await own(user,id,run,true),run);
  if(live(row)){
   const field=user===row.caller_id?'caller_seen_at':'callee_seen_at',owner=user===row.caller_id?row.caller_client:row.callee_client;
   if(owner===d.client_id)await run(`UPDATE chat_calls SET ${field}=? WHERE id=? AND state<>'ended'`,[new Date(),row.id]);
  }
  return present(row,user,d.client_id,run);
 });
}
export async function accept(user,id,body){
 requireCalls();const d=parse(clientBody,body);
 return tx(async run=>{
  let row=await own(user,id,run,true);if(row.callee_id!==user)throw forbidden();
  row=await expire(row,run);if(!live(row))throw conflict('Cuộc gọi đã kết thúc.');
  await participants(row,run);
  if(row.state==='accepted'){claim(row,user,d.client_id);return present(row,user,d.client_id,run);}
  if(!row.offer_sdp)throw conflict('Cuộc gọi chưa sẵn sàng.');
  const now=new Date(),deadline=new Date(Math.min(stamp(row.deadline_at),now.getTime()+callConfig().maxSeconds*1000));
  await run("UPDATE chat_calls SET state='accepted',callee_client=?,accepted_at=?,callee_seen_at=?,deadline_at=? WHERE id=?",[d.client_id,now,now,deadline,row.id]);
  return present({...row,state:'accepted',callee_client:d.client_id,accepted_at:now,deadline_at:deadline},user,d.client_id,run);
 });
}
export async function credentials(user,id,body){
 requireCalls();const d=parse(clientBody,body),row=await tx(async run=>authorized(await own(user,id,run,true),run));claim(row,user,d.client_id);
 if(!live(row))throw conflict('Cuộc gọi đã kết thúc.');
 return turnCredentials((stamp(row.deadline_at)-Date.now())/1000+30);
}
export async function signal(user,id,body){
 requireCalls();
 const d=parse(z.object({client_id:uuid,type:z.enum(['offer','answer']),sdp:z.string().min(20).max(60000).startsWith('v=0')}).strict(),body);
 const result=await tx(async run=>{
  let row=await own(user,id,run,true);row=await expire(row,run);claim(row,user,d.client_id);
  if(!live(row))throw conflict('Cuộc gọi đã kết thúc.');await participants(row,run);
  const offer=d.type==='offer';
  if(offer?row.caller_id!==user||row.state!=='ringing':row.callee_id!==user||row.state!=='accepted')throw forbidden('Không thể gửi tín hiệu này.');
  const field=offer?'offer_sdp':'answer_sdp';
  if(row[field]&&row[field]!==d.sdp)throw conflict('Cuộc gọi đã có thông tin kết nối.');
  const fresh=!row[field];
  if(fresh)await run(`UPDATE chat_calls SET ${field}=? WHERE id=?`,[d.sdp,row.id]);
  return {row,fresh,offer};
 });
 if(result.offer&&result.fresh)await notifyIncomingCall(result.row.callee_id,result.row.id);
 return {sent:true};
}
export async function end(user,id,body){
 requireCalls();
 const d=parse(z.object({client_id:uuid,reason:z.enum(['hangup','declined','failed']).default('hangup')}).strict(),body);
 return tx(async run=>{
  const row=await own(user,id,run,true);
  if(!(row.callee_id===user&&row.state==='ringing'&&d.reason==='declined'))claim(row,user,d.client_id);
  if(d.reason==='declined'&&row.callee_id!==user)throw forbidden();
  const done=live(row)?await finish(row,d.reason,run):row;
  return present(done,user,d.client_id,run);
 });
}
export async function history(user,roomId){
 requireCalls();roomId=parse(uuid,roomId);await assertRoomVisibleTo(user,roomId);
 await one('SELECT student_id FROM chat_members WHERE room_id=? AND student_id=?',[roomId,user]);
 const rows=await query("SELECT * FROM chat_calls WHERE room_id=? AND (caller_id=? OR callee_id=?) AND state='ended' ORDER BY created_at DESC LIMIT 20",[roomId,user,user]);
 return Promise.all(rows.map(r=>present(r,user,null)));
}
export async function report(user,id,body){
 requireCalls();const {reason}=parse(z.object({reason:z.string().trim().min(3).max(500)}).strict(),body);
 return tx(async run=>{
  const row=await own(user,id,run,true);await assertRoomVisibleTo(user,row.room_id,run);
  const [old]=await run('SELECT id FROM chat_call_reports WHERE call_id=? AND reporter_id=?',[row.id,user]);
  if(!old)await run('INSERT INTO chat_call_reports(id,call_id,reporter_id,reason) VALUES (?,?,?,?)',[randomUUID(),row.id,user,reason]);
  return {reported:true};
 });
}
export async function reports(){
 requireCalls();
 return query("SELECT r.id,r.reason,r.created_at,c.media,c.created_at AS call_started,a.display_name AS caller,b.display_name AS callee,p.display_name AS reporter FROM chat_call_reports r JOIN chat_calls c ON c.id=r.call_id JOIN profiles a ON a.id=c.caller_id JOIN profiles b ON b.id=c.callee_id JOIN profiles p ON p.id=r.reporter_id WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 100");
}
export async function resolveReport(id){requireCalls();await query("UPDATE chat_call_reports SET status='resolved' WHERE id=?",[parse(uuid,id)]);return {resolved:true};}
