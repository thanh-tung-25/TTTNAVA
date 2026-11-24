import {createHash} from 'node:crypto';
import {z} from 'zod';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {studentVisibleCondition} from '../utils/student-visibility.js';
import {AppError,forbidden,notFound,badRequest} from '../utils/errors.js';
import {appendFeedbackReply,ensureFeedbackRoom} from './chat-support.js';

export const feedbackVersion=row=>createHash('sha256').update(JSON.stringify([row.status,row.reply||'',new Date(row.updated_at).toISOString()])).digest('hex');
export const feedbackReceipt=row=>({id:row.id,status:row.status,reply:row.reply||'',updated_at:row.updated_at,reply_version:feedbackVersion(row)});
const replySchema=z.object({status:z.enum(['open','reviewing','resolved']),reply:z.string().trim().max(2000).default(''),expected_version:z.string().regex(/^[a-f0-9]{64}$/u).optional()});

export function createFeedbackUpdater({withTransaction}){
 return async function updateFeedback(user,id,body){
  const scope=adminScopeOf(user);if(!scope)throw forbidden('Chỉ quản trị viên được xử lý phản ánh.');
  const parsed=replySchema.safeParse(body);if(!z.uuid().safeParse(id).success||!parsed.success)throw badRequest('Nội dung phản hồi chưa hợp lệ.');
  const input=parsed.data;
  return withTransaction(async connection=>{
   const run=async(sql,parameters=[])=>(await connection.query(sql,parameters))[0];
   const [row]=await run(`SELECT f.* FROM learning_feedback f JOIN profiles p ON p.id=f.reporter_id WHERE f.id=? AND ${studentVisibleCondition(user,'p')} FOR UPDATE`,[id]);
   if(!row)throw notFound();if(scope!=='super'&&scope!==row.scope)throw forbidden('Phản ánh thuộc phạm vi quản trị khác.');
   // A retry after a lost network response must confirm the already saved reply.
   if(row.status===input.status&&(row.reply||'')===input.reply)return feedbackReceipt(row);
   if(input.expected_version&&input.expected_version!==feedbackVersion(row))throw new AppError(409,'FEEDBACK_CONFLICT','Phản ánh đã được cập nhật ở nơi khác. Bản bạn đang soạn vẫn được giữ. Bấm Làm mới để xem phản hồi mới nhất.');
   const replyChanged=(row.reply||'')!==input.reply,replyAdminId=replyChanged?(input.reply?user.id:null):(row.reply_admin_id||null);
   await run('UPDATE learning_feedback SET status=?,reply=?,reply_admin_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[input.status,input.reply,replyAdminId,id]);
   if(replyChanged&&input.reply){
    const room=await ensureFeedbackRoom(run,row.reporter_id,user.id);
    await appendFeedbackReply(run,room.id,user.id,input.reply);
   }
   const [saved]=await run('SELECT id,status,reply,reply_admin_id,updated_at FROM learning_feedback WHERE id=?',[id]);return feedbackReceipt(saved);
  });
 };
}
