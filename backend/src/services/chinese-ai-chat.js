import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {json} from '../repositories/chinese.js';
import {AppError,notFound} from '../utils/errors.js';
import {requireCourse} from './course-service.js';
import {assessSpeakingAudio,validateSpeakingWav,speakingAiAvailability} from './chinese-speaking-provider.js';
import {chatReply} from './chinese-ai-chat-provider.js';
import {chatScenarios,defaultChatSettings} from '../../../frontend/assets/js/chinese-ai-chat-data.js';

export const CHAT_LIMITS={daily:2,preview_daily:5,turns:10,audio_seconds:20,session_minutes:30};
const uuid=z.string().uuid(),runTx=c=>async(sql,p=[]) =>(await c.query(sql,p))[0];
const settingsSchema=z.object({enabled:z.boolean(),scenario_id:z.enum(chatScenarios.map(s=>s.id)),goal:z.string().trim().min(1).max(350),opening:z.string().trim().min(1).max(200).refine(s=>/[\u3400-\u9fff]/u.test(s),'Câu mở đầu cần có tiếng Trung.'),translation:z.string().trim().max(300),required_words:z.array(z.string().trim().min(1).max(40)).max(20),max_turns:z.number().int().min(2).max(CHAT_LIMITS.turns)}).strict();
const today=()=>new Date(Math.floor((Date.now()+7*3600000)/86400000)*86400000-7*3600000);
const unavailable=()=>{if(!speakingAiAvailability().configured)throw new AppError(503,'CHAT_UNAVAILABLE','AI chưa được bật. Cô kiểm tra khóa Groq, nút bật AI và xác nhận ZDR nhé.');};
async function expireSessions(){
 await query("UPDATE chinese_ai_chat_sessions SET status='expired',context=NULL,last_response=NULL,lease_id=NULL,completed_at=CURRENT_TIMESTAMP(3) WHERE status='active' AND expires_at<CURRENT_TIMESTAMP(3)");
}
async function lessonFor(user,id,run=query){
 const [lesson]=await run("SELECT * FROM chinese_lessons WHERE id=? AND status='published'",[uuid.parse(id)]);
 if(!lesson)throw notFound('Bài học chưa được xuất bản hoặc đã được gỡ.');
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+lesson.level_id,run);
 return lesson;
}
async function settingsFor(lesson,run=query){
 const [row]=await run('SELECT data FROM chinese_ai_chat_settings WHERE lesson_id=?',[lesson.id]);
 const data=row?settingsSchema.parse(json(row.data)):defaultChatSettings(lesson);
 const words=await run("SELECT i.data FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id WHERE s.lesson_id=? AND s.status='published' AND i.active=1 AND i.kind='vocabulary' ORDER BY s.position,i.position,i.id LIMIT 20",[lesson.id]);
 return {...data,scenario_title:chatScenarios.find(s=>s.id===data.scenario_id).title,required_words:data.required_words.length?data.required_words:[...new Set(words.map(w=>json(w.data)?.hanzi).filter(Boolean))].slice(0,20)};
}
function view(row){
 const settings=json(row.settings),context=json(row.context)||[],response=json(row.last_response);
 return {id:row.id,lesson_id:row.lesson_id,lesson_title:row.lesson_title,level_id:row.level_id,is_preview:Boolean(row.is_preview),status:row.status,turn_count:Number(row.turn_count),max_turns:settings.max_turns,expires_at:row.expires_at,
  reply:response?.reply||{reply_zh:row.status==='active'?(context.at(-1)?.content||settings.opening):'今天的练习结束了，谢谢你！',translation_vi:row.status==='active'?settings.translation:'Buổi luyện đã kết thúc. Cảm ơn bạn!',hint_zh:''},
  transcript:response?.transcript||'',summary:row.status==='active'?null:json(row.summary),created_at:row.created_at};
}
async function owned(user,id,run=query,lock=false){
 const [row]=await run('SELECT * FROM chinese_ai_chat_sessions WHERE id=?'+(lock?' FOR UPDATE':''),[uuid.parse(id)]);
 if(!row||row.student_id!==user.id)throw notFound();
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+row.level_id,run);
 return row;
}
export async function chatMetadata(user,rawLevel){
 const level=z.coerce.number().int().min(1).max(9).parse(rawLevel);
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+level);
 await expireSessions();
 const lessons=await query("SELECT id,title,position,level_id FROM chinese_lessons WHERE status='published' AND level_id=? ORDER BY position,title",[level]);
 const rows=[];for(const lesson of lessons)rows.push({...lesson,settings:await settingsFor(lesson)});
 const [usage]=await query('SELECT COUNT(*) total FROM chinese_ai_chat_sessions WHERE student_id=? AND created_at>=?',[user.id,today()]);
 const [active]=await query("SELECT * FROM chinese_ai_chat_sessions WHERE student_id=? AND level_id=? AND status='active' ORDER BY created_at DESC LIMIT 1",[user.id,level]);
 const configured=speakingAiAvailability().configured,daily=user.role==='admin'?CHAT_LIMITS.preview_daily:CHAT_LIMITS.daily;
 return {configured,reason:configured?'':'AI chưa được bật. Cô cần kiểm tra cấu hình Groq và xác nhận không lưu nội dung (ZDR).',limits:{...CHAT_LIMITS,daily},remaining:Math.max(0,daily-Number(usage.total)),lessons:rows,active:active?view(active):null};
}
export async function saveChatSettings(user,id,body){
 const lesson=await lessonFor(user,id),data=settingsSchema.parse(body);
 await query(dialectSql('INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES (?,?) ON DUPLICATE KEY UPDATE data=VALUES(data),updated_at=CURRENT_TIMESTAMP(3)',
  'INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES (?,?) ON CONFLICT(lesson_id) DO UPDATE SET data=EXCLUDED.data,updated_at=CURRENT_TIMESTAMP(3)'),[lesson.id,JSON.stringify(data)]);
 return {lesson_id:lesson.id,settings:await settingsFor(lesson)};
}
export async function startChat(user,body){
 unavailable();const input=z.object({lesson_id:uuid,request_id:uuid}).strict().parse(body);
 await expireSessions();
 const lesson=await lessonFor(user,input.lesson_id),settings=await settingsFor(lesson);
 if(!settings.enabled&&user.role!=='admin')throw new AppError(409,'CHAT_LESSON_DISABLED','Cô đang chuẩn bị phần giao tiếp của bài này. Con chọn bài khác nhé.');
 return withTransaction(async c=>{
  const run=runTx(c);await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user.id]);
  const [same]=await run('SELECT * FROM chinese_ai_chat_sessions WHERE id=?',[input.request_id]);
  if(same){if(same.student_id!==user.id||same.lesson_id!==lesson.id)throw new AppError(409,'CHAT_START_CONFLICT','Lượt bắt đầu không hợp lệ.');return view(same);}
  const [active]=await run("SELECT * FROM chinese_ai_chat_sessions WHERE student_id=? AND level_id=? AND status='active' ORDER BY created_at DESC LIMIT 1",[user.id,lesson.level_id]);
  if(active)return view(active);
  const [used]=await run('SELECT COUNT(*) total FROM chinese_ai_chat_sessions WHERE student_id=? AND created_at>=?',[user.id,today()]);
  const limit=user.role==='admin'?CHAT_LIMITS.preview_daily:CHAT_LIMITS.daily;
  if(Number(used.total)>=limit)throw new AppError(429,'CHAT_DAILY_LIMIT',`Hôm nay đã dùng đủ ${limit} buổi. Con quay lại ngày mai nhé!`);
  const expires=new Date(Date.now()+CHAT_LIMITS.session_minutes*60000),context=[{role:'assistant',content:settings.opening}];
  await run('INSERT INTO chinese_ai_chat_sessions(id,student_id,lesson_id,level_id,lesson_title,is_preview,settings,context,expires_at) VALUES (?,?,?,?,?,?,?,?,?)',[input.request_id,user.id,lesson.id,lesson.level_id,lesson.title,user.role==='admin'?1:0,JSON.stringify(settings),JSON.stringify(context),expires]);
  return view((await run('SELECT * FROM chinese_ai_chat_sessions WHERE id=?',[input.request_id]))[0]);
 });
}
export async function getChat(user,id){await expireSessions();return view(await owned(user,id));}
export async function answerChat(user,id,turnIndex,requestId,input){
 unavailable();requestId=uuid.parse(requestId);turnIndex=z.coerce.number().int().min(1).max(CHAT_LIMITS.turns).parse(turnIndex);
 let text,hash;
 if(Buffer.isBuffer(input)){
  if(validateSpeakingWav(input)>CHAT_LIMITS.audio_seconds)throw new AppError(413,'CHAT_AUDIO_LIMIT','Mỗi câu trả lời tối đa 20 giây.');
  hash=createHash('sha256').update(input).digest('hex');
 }else{text=z.object({text:z.string().trim().min(1).max(400)}).strict().parse(input).text;hash=createHash('sha256').update(text).digest('hex');}
 await expireSessions();
 const lease=randomUUID();
 const claimed=await withTransaction(async c=>{
  const run=runTx(c),row=await owned(user,id,run,true);
  if(row.last_request===requestId){
   if(row.last_hash!==hash||Number(row.turn_count)!==turnIndex)throw new AppError(409,'CHAT_TURN_CONFLICT','Mã lượt này đã dùng cho câu trả lời khác.');
   return {cached:true,row};
  }
  if(row.status!=='active')throw new AppError(409,'CHAT_FINISHED','Buổi luyện đã kết thúc. Con xem tổng kết hoặc bắt đầu buổi khác nhé.');
  if(Number(row.turn_count)+1!==turnIndex)throw new AppError(409,'CHAT_STALE_TURN','Buổi luyện đã có câu trả lời mới. Con tải lại trang để tiếp tục nhé.');
  const lesson=await lessonFor(user,row.lesson_id,run),settings=await settingsFor(lesson,run);
  if(!settings.enabled&&user.role!=='admin')throw new AppError(409,'CHAT_LESSON_DISABLED','Cô vừa tạm dừng phần giao tiếp của bài này. Con kết thúc buổi để lưu tổng kết nhé.');
  if(row.lease_id&&Date.now()-new Date(row.lease_at).getTime()<75000)throw new AppError(409,'CHAT_BUSY','AI đang xử lý câu trước. Con chờ một chút nhé.');
  await run('UPDATE chinese_ai_chat_sessions SET lease_id=?,lease_at=CURRENT_TIMESTAMP(3) WHERE id=?',[lease,row.id]);
  return {row};
 });
 if(claimed.cached)return view(claimed.row);
 try{
  if(Buffer.isBuffer(input))text=(await assessSpeakingAudio(input,{timeoutMs:25000})).transcript.slice(0,400);
  if(!text)throw new AppError(422,'CHAT_NO_SPEECH','Chưa nghe rõ câu trả lời. Con ghi lại ở chỗ yên tĩnh hoặc nhập chữ nhé.');
  const row=claimed.row,settings=json(row.settings),context=json(row.context)||[],count=Number(row.turn_count)+1,last=count>=settings.max_turns;
  const result=await chatReply({settings,level:row.level_id,context,summary:json(row.summary),text,lastTurn:last});
  const nextContext=[...context,{role:'user',content:text},{role:'assistant',content:result.reply_zh}].slice(-6);
  const {summary,...reply}=result,response={reply,transcript:text};
  // No raw media, waveform, storage URL or API credentials ever enter the DB.
  // Active context is bounded; completing a session clears it and the retry cache.
  const saved=await query('UPDATE chinese_ai_chat_sessions SET turn_count=?,status=?,context=?,summary=?,last_request=?,last_hash=?,last_response=?,lease_id=NULL,lease_at=NULL,completed_at=? WHERE id=? AND lease_id=? AND status=\'active\' AND expires_at>CURRENT_TIMESTAMP(3)',
   [count,last?'completed':'active',last?null:JSON.stringify(nextContext),JSON.stringify(summary),requestId,hash,last?null:JSON.stringify(response),last?new Date():null,row.id,lease]);
  if(!saved.affectedRows)throw new AppError(409,'CHAT_EXPIRED','Buổi luyện đã hết thời gian. Con xem tổng kết rồi bắt đầu buổi khác nhé.');
  const output=view(await owned(user,id));
  // The final spoken reply is returned once, without keeping a transcript cache.
  if(last){output.reply=reply;output.transcript=text;}
  return output;
 }catch(error){await query('UPDATE chinese_ai_chat_sessions SET lease_id=NULL,lease_at=NULL WHERE id=? AND lease_id=?',[id,lease]);throw error;}
}
export async function finishChat(user,id){
 await expireSessions();
 return withTransaction(async c=>{
  const run=runTx(c),row=await owned(user,id,run,true);
  if(row.status!=='active')return view(row);
  if(row.lease_id&&Date.now()-new Date(row.lease_at).getTime()<75000)throw new AppError(409,'CHAT_BUSY','AI đang xử lý câu trả lời. Con chờ xong rồi kết thúc nhé.');
  await run("UPDATE chinese_ai_chat_sessions SET status='completed',context=NULL,last_response=NULL,lease_id=NULL,lease_at=NULL,completed_at=CURRENT_TIMESTAMP(3) WHERE id=?",[id]);
  return view({...row,status:'completed',context:null,last_response:null});
 });
}
export async function chatResults(level){
 level=z.coerce.number().int().min(1).max(9).parse(level);await expireSessions();
 const rows=await query("SELECT s.id,s.student_id,s.lesson_id,s.lesson_title,s.turn_count,s.status,s.summary,s.created_at,s.completed_at,p.username,p.display_name FROM chinese_ai_chat_sessions s JOIN profiles p ON p.id=s.student_id WHERE s.is_preview=0 AND s.status<>'active' AND s.turn_count>0 AND s.level_id=? ORDER BY s.created_at DESC,s.id DESC LIMIT 100",[level]);
 return rows.map(row=>({...row,summary:json(row.summary)}));
}
