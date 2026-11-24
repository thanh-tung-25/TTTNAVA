import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {withTransaction} from '../config/db.js';
import {forbidden,notFound} from '../utils/errors.js';
import {ensureAcceptedFriendship} from './chat-friends.js';
import {assertChatParticipants} from './chat-visibility.js';

const pair=(a,b)=>[a,b].sort();

export async function ensureFeedbackRoom(run,studentId,adminId){
 const ids=pair(studentId,adminId),directKey=ids.join(':');
 await assertChatParticipants(ids,run);
 await run('SELECT id FROM profiles WHERE id IN (?,?) ORDER BY id FOR UPDATE',ids);
 await ensureAcceptedFriendship(studentId,adminId,run);
 let [room]=await run('SELECT id FROM chat_rooms WHERE direct_key=?',[directKey]);
 if(!room){
  const id=randomUUID();
  await run("INSERT INTO chat_rooms(id,kind,title,owner_id,direct_key) VALUES (?,'direct','',?,?)",[id,adminId,directKey]);
  for(const memberId of ids)await run('INSERT INTO chat_members(room_id,student_id) VALUES (?,?)',[id,memberId]);
  room={id};
 }
 return room;
}

export async function appendFeedbackReply(run,roomId,adminId,reply){
 await run('INSERT INTO chat_messages(id,room_id,sender_id,client_id,body) VALUES (?,?,?,?,?)',[randomUUID(),roomId,adminId,randomUUID(),reply]);
 await run('UPDATE chat_rooms SET updated_at=CURRENT_TIMESTAMP WHERE id=?',[roomId]);
}

export async function openFeedbackRoom(user,feedbackId){
 if(user.role!=='student')throw forbidden();
 if(!z.uuid().safeParse(feedbackId).success)throw notFound();
 return withTransaction(async connection=>{
  const run=async(sql,parameters=[]) => (await connection.query(sql,parameters))[0];
  const [feedback]=await run('SELECT id,reporter_id,scope,reply,reply_admin_id FROM learning_feedback WHERE id=? AND reporter_id=? FOR UPDATE',[feedbackId,user.id]);
  if(!feedback||!feedback.reply?.trim())throw notFound();

  let adminId=feedback.reply_admin_id;
  if(!adminId){
   const requestedScope=['primary','secondary','highschool','chinese'].includes(feedback.scope)?feedback.scope:'super';
   const admins=await run("SELECT id FROM profiles WHERE role='admin' AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) AND COALESCE(admin_scope,'super') IN (?, 'super') ORDER BY CASE WHEN COALESCE(admin_scope,'super')=? THEN 0 ELSE 1 END,id LIMIT 1",[requestedScope,requestedScope]);
   adminId=admins[0]?.id;
   if(!adminId)throw notFound('Chưa tìm thấy quản trị viên đang hoạt động để tiếp tục cuộc trò chuyện.');
  }

  const room=await ensureFeedbackRoom(run,user.id,adminId);
  if(!feedback.reply_admin_id){
   await appendFeedbackReply(run,room.id,adminId,feedback.reply);
   await run('UPDATE learning_feedback SET reply_admin_id=? WHERE id=?',[adminId,feedback.id]);
  }
  return {room_id:room.id};
 });
}
