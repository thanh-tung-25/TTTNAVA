import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {json} from '../repositories/chinese.js';
import {AppError,notFound,badRequest} from '../utils/errors.js';
import {requireCourse} from './course-service.js';
import {assessSpeakingAudio,validateSpeakingWav,speakingAiAvailability} from './chinese-speaking-provider.js';
import {chatReply} from './chinese-ai-chat-provider.js';
import {sealChatState,openChatState} from './chinese-chat-state.js';
import {chatScenarios,defaultChatSettings} from '../../../frontend/assets/js/chinese-ai-chat-data.js';
import {boundChatSettings,boundedClosing,boundedFallback,vocabularyLesson} from './chinese-curriculum-scope.js';
import {segmentLearnedChinese} from './chinese-quiz-language.js';
export const CHAT_LIMITS={daily:2,preview_daily:5,turns:20,audio_seconds:20,session_minutes:5};
const uuid=z.string().uuid(),runTx=c=>async(sql,p=[]) =>(await c.query(sql,p))[0];
const settingsSchema=z.object({enabled:z.boolean(),scenario_id:z.enum(chatScenarios.map(s=>s.id)),goal:z.string().trim().min(1).max(350),opening:z.string().trim().min(1).max(200).refine(s=>/[\u3400-\u9fff]/u.test(s),'Câu mở đầu cần có tiếng Trung.'),translation:z.string().trim().max(300),required_words:z.array(z.string().trim().min(1).max(40)).max(20),max_turns:z.number().int().min(2).max(10)}).strict();
const today=()=>new Date(Math.floor((Date.now()+7*3600000)/86400000)*86400000-7*3600000);
const unavailable=()=>{if(!speakingAiAvailability().configured)throw new AppError(503,'CHAT_UNAVAILABLE','AI chưa được bật. Cô kiểm tra cấu hình Groq và xác nhận ZDR nhé.');};
// No server-side conversation cache. Lost responses recover with a re-prompt.
async function expireSessions(){await query("UPDATE chinese_ai_chat_sessions SET status='expired',context=NULL,last_response=NULL,lease_id=NULL,completed_at=CURRENT_TIMESTAMP(3) WHERE status='active' AND expires_at<CURRENT_TIMESTAMP(3)");}
async function lessonFor(user,id,run=query){
 const [lesson]=await run("SELECT * FROM chinese_lessons WHERE id=? AND status='published'",[uuid.parse(id)]);
 if(!lesson)throw notFound('Bài học chưa được xuất bản hoặc đã được gỡ.');
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+lesson.level_id,run);return lesson;
}
async function settingsFor(lesson,run=query){
 const [row]=await run('SELECT data FROM chinese_ai_chat_settings WHERE lesson_id=?',[lesson.id]),data=row?settingsSchema.parse(json(row.data)):defaultChatSettings(lesson);
 const words=await run("SELECT i.data FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id WHERE s.lesson_id=? AND s.status='published' AND i.active=1 AND i.kind='vocabulary' ORDER BY s.position,i.position,i.id LIMIT 20",[lesson.id]);
 return boundChatSettings(lesson,{...data,scenario_title:chatScenarios.find(s=>s.id===data.scenario_id).title,required_words:data.required_words.length?data.required_words:[...new Set(words.map(w=>json(w.data)?.hanzi).filter(Boolean))].slice(0,20)});
}
function view(row){return {id:row.id,lesson_id:row.lesson_id,lesson_title:row.lesson_title,level_id:row.level_id,is_preview:Boolean(row.is_preview),status:row.status,turn_count:Number(row.turn_count),max_turns:CHAT_LIMITS.turns,expires_at:row.expires_at,created_at:row.created_at};}
function stateView(user,row,context,reply){
 const output={...view(row),reply};
 if(row.status==='active')output.state=sealChatState({v:2,owner:user.id,session:row.id,turn:Number(row.turn_count),until:new Date(row.expires_at).getTime(),context:context.slice(-6)});
 return output;
}
async function owned(user,id,run=query,lock=false){
 const [row]=await run('SELECT * FROM chinese_ai_chat_sessions WHERE id=?'+(lock?' FOR UPDATE':''),[uuid.parse(id)]);
 if(!row||row.student_id!==user.id)throw notFound();
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+row.level_id,run);return row;
}
export async function chatMetadata(user,rawLevel){
 const level=z.coerce.number().int().min(1).max(9).parse(rawLevel);if(user.role!=='admin')await requireCourse(user.id,'hsk-'+level);
 await expireSessions();const lessons=await query("SELECT id,title,position,level_id FROM chinese_lessons WHERE status='published' AND level_id=? ORDER BY position,title",[level]),rows=[];
 for(const lesson of lessons)rows.push({...lesson,settings:await settingsFor(lesson)});
 const [usage]=await query('SELECT COUNT(*) total FROM chinese_ai_chat_sessions WHERE student_id=? AND created_at>=?',[user.id,today()]);
 const [active]=await query("SELECT * FROM chinese_ai_chat_sessions WHERE student_id=? AND level_id=? AND status='active' ORDER BY created_at DESC LIMIT 1",[user.id,level]);
 const configured=speakingAiAvailability().configured,daily=user.role==='admin'?CHAT_LIMITS.preview_daily:CHAT_LIMITS.daily;
 return {configured,reason:configured?'':'AI chưa được bật. Cô kiểm tra cấu hình Groq và xác nhận ZDR nhé.',limits:{...CHAT_LIMITS,daily},remaining:Math.max(0,daily-Number(usage.total)),lessons:rows,active:active&&json(active.settings)?._voice_version===2?view(active):null};
}
export async function saveChatSettings(user,id,body){
 const lesson=await lessonFor(user,id),data=settingsSchema.parse(body);
 const n=vocabularyLesson(lesson);if(n)try{segmentLearnedChinese(data.opening,n);segmentLearnedChinese(data.translation,n);for(const word of data.required_words)segmentLearnedChinese(word,n);}catch{throw badRequest('Câu mở đầu và từ trọng tâm chỉ được dùng từ trong bài 1 đến bài '+n+'.');}
 await query(dialectSql('INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES (?,?) ON DUPLICATE KEY UPDATE data=VALUES(data),updated_at=CURRENT_TIMESTAMP(3)','INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES (?,?) ON CONFLICT(lesson_id) DO UPDATE SET data=EXCLUDED.data,updated_at=CURRENT_TIMESTAMP(3)'),[lesson.id,JSON.stringify(data)]);
 return {lesson_id:lesson.id,settings:await settingsFor(lesson)};
}
export async function startChat(user,body){
 unavailable();const input=z.object({lesson_id:uuid,request_id:uuid}).strict().parse(body);await expireSessions();
 const lesson=await lessonFor(user,input.lesson_id),settings=await settingsFor(lesson);
 if(!settings.enabled&&user.role!=='admin')throw new AppError(409,'CHAT_LESSON_DISABLED','Chủ đề này đang được chuẩn bị. Con chọn bài khác nhé.');
 const row=await withTransaction(async c=>{
  const run=runTx(c);await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user.id]);
  const [same]=await run('SELECT * FROM chinese_ai_chat_sessions WHERE id=?',[input.request_id]);
  if(same){if(same.student_id!==user.id||same.lesson_id!==lesson.id)throw new AppError(409,'CHAT_START_CONFLICT','Lượt bắt đầu không hợp lệ.');return same;}
  const [active]=await run("SELECT * FROM chinese_ai_chat_sessions WHERE student_id=? AND level_id=? AND status='active' ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[user.id,lesson.level_id]);
  if(active&&active.lesson_id===lesson.id&&json(active.settings)?._voice_version===2&&Number(active.turn_count)<CHAT_LIMITS.turns)return active;
  if(active)await run("UPDATE chinese_ai_chat_sessions SET status='completed',context=NULL,summary=NULL,last_response=NULL,lease_id=NULL,completed_at=CURRENT_TIMESTAMP(3) WHERE id=?",[active.id]);
  const [used]=await run('SELECT COUNT(*) total FROM chinese_ai_chat_sessions WHERE student_id=? AND created_at>=?',[user.id,today()]),limit=user.role==='admin'?CHAT_LIMITS.preview_daily:CHAT_LIMITS.daily;
  if(Number(used.total)>=limit)throw new AppError(429,'CHAT_DAILY_LIMIT','Hôm nay đã dùng đủ '+limit+' buổi. Con quay lại ngày mai nhé!');
  const expires=new Date(Date.now()+CHAT_LIMITS.session_minutes*60000);
  await run('INSERT INTO chinese_ai_chat_sessions(id,student_id,lesson_id,level_id,lesson_title,is_preview,settings,expires_at) VALUES (?,?,?,?,?,?,?,?)',[input.request_id,user.id,lesson.id,lesson.level_id,lesson.title,user.role==='admin'?1:0,JSON.stringify({...settings,_voice_version:2}),expires]);
  return (await run('SELECT * FROM chinese_ai_chat_sessions WHERE id=?',[input.request_id]))[0];
 });
 const config=boundChatSettings(lesson,json(row.settings));return stateView(user,row,[{role:'assistant',content:config.opening}],row.status==='active'?{reply_zh:config.opening,translation_vi:config.translation}:boundedClosing(config));
}
export async function getChat(user,id){await expireSessions();return view(await owned(user,id));}
export async function answerChat(user,id,turnIndex,requestId,input,stateToken){
 unavailable();requestId=uuid.parse(requestId);turnIndex=z.coerce.number().int().min(1).max(CHAT_LIMITS.turns).parse(turnIndex);
 let text;
 if(Buffer.isBuffer(input)){if(validateSpeakingWav(input)>CHAT_LIMITS.audio_seconds)throw new AppError(413,'CHAT_AUDIO_LIMIT','Mỗi lượt nói tối đa 20 giây.');}
 else{const body=z.object({text:z.string().trim().min(1).max(400),state:z.string().max(40000)}).strict().parse(input);text=body.text;stateToken=body.state;}
 const state=openChatState(stateToken,user,id),hash=createHash('sha256').update(Buffer.isBuffer(input)?input:text).update(stateToken).digest('hex'),lease=randomUUID();
 await expireSessions();
 const claimed=await withTransaction(async c=>{
  const run=runTx(c),row=await owned(user,id,run,true);
  if(json(row.settings)?._voice_version!==2)throw new AppError(409,'CHAT_STATE_INVALID','Phiên trò chuyện đã đổi. Con bắt đầu lại nhé.');
  if(row.last_request===requestId){if(row.last_hash!==hash||Number(row.turn_count)!==turnIndex)throw new AppError(409,'CHAT_TURN_CONFLICT','Mã lượt này đã dùng cho câu nói khác.');return {cached:true,row};}
  if(row.status!=='active')throw new AppError(409,'CHAT_FINISHED','Cuộc trò chuyện đã kết thúc. Con bắt đầu buổi mới nhé.');
  if(Number(row.turn_count)!==state.turn||state.turn+1!==turnIndex)throw new AppError(409,'CHAT_STALE_TURN','Phiên trò chuyện đã đổi. Con bắt đầu lại nhé.');
  if(new Date(row.expires_at).getTime()!==state.until)throw new AppError(409,'CHAT_STATE_INVALID','Phiên trò chuyện đã đổi.');
  const current=await settingsFor(await lessonFor(user,row.lesson_id,run),run);
  if(!current.enabled&&user.role!=='admin')throw new AppError(409,'CHAT_LESSON_DISABLED','Chủ đề này vừa tạm dừng. Con chọn chủ đề khác nhé.');
  if(row.lease_id&&Date.now()-new Date(row.lease_at).getTime()<75000)throw new AppError(409,'CHAT_BUSY','AI đang nghe câu trước. Con chờ một chút nhé.');
  await run('UPDATE chinese_ai_chat_sessions SET lease_id=?,lease_at=CURRENT_TIMESTAMP(3) WHERE id=?',[lease,row.id]);return {row,settings:current};
 });
 if(claimed.cached){
  const current=await settingsFor(await lessonFor(user,claimed.row.lesson_id));
  const reply=claimed.row.status==='active'?boundedFallback(current):boundedClosing(current);
  return {...stateView(user,claimed.row,[...state.context,{role:'assistant',content:reply.reply_zh}],reply),recovered:true};
 }
 try{
  if(Buffer.isBuffer(input))text=(await assessSpeakingAudio(input,{timeoutMs:25000})).transcript.slice(0,400);
  if(!text)throw new AppError(422,'CHAT_NO_SPEECH','Chưa nghe rõ. Con nói lại hoặc nhập chữ nhé.');
  const row=claimed.row,count=Number(row.turn_count)+1,last=count>=CHAT_LIMITS.turns;
  const reply=await chatReply({settings:claimed.settings,level:row.level_id,context:state.context,text,lastTurn:last});
  const saved=await query("UPDATE chinese_ai_chat_sessions SET turn_count=?,status=?,context=NULL,summary=NULL,last_response=NULL,last_request=?,last_hash=?,lease_id=NULL,lease_at=NULL,completed_at=? WHERE id=? AND lease_id=? AND status='active' AND expires_at>CURRENT_TIMESTAMP(3)",[count,last?'completed':'active',requestId,hash,last?new Date():null,id,lease]);
  if(!saved.affectedRows)throw new AppError(409,'CHAT_FINISHED','Cuộc trò chuyện đã kết thúc.');
  const current={...row,turn_count:count,status:last?'completed':'active'},context=[...state.context,{role:'user',content:text},{role:'assistant',content:reply.reply_zh}].slice(-6),output=stateView(user,current,context,reply);
  return output;
 }catch(error){await query('UPDATE chinese_ai_chat_sessions SET lease_id=NULL,lease_at=NULL WHERE id=? AND lease_id=?',[id,lease]);throw error;}
}
export async function finishChat(user,id){
 const row=await owned(user,id);
 await query("UPDATE chinese_ai_chat_sessions SET status='completed',context=NULL,summary=NULL,last_response=NULL,lease_id=NULL,lease_at=NULL,completed_at=CURRENT_TIMESTAMP(3) WHERE id=? AND student_id=? AND status='active'",[id,user.id]);
 return {...view(row),status:row.status==='expired'?'expired':'completed',reply:boundedClosing(await settingsFor(await lessonFor(user,row.lesson_id)))};
}
export async function chatResults(){throw new AppError(410,'CHAT_REPORTS_REMOVED','Trò chuyện riêng tư không tạo báo cáo giáo viên.');}
