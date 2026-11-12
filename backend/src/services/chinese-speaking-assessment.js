import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {getSet,getItems,json} from '../repositories/chinese.js';
import {requireCourse} from './course-service.js';
import {publishedActivitiesForSet} from './chinese-activities.js';
import {speakingQuestions,speakingSettings} from '../../../frontend/assets/js/chinese-speaking-data.js';
import {AppError,notFound} from '../utils/errors.js';
import {assessSpeakingAudio,judgeSpeakingAnswers,speakingAiAvailability,validateSpeakingWav} from './chinese-speaking-provider.js';

const runTx=c=>async(sql,params=[]) => (await c.query(sql,params))[0];
const unavailable=()=>{const availability=speakingAiAvailability();if(!availability.configured)throw new AppError(503,'SPEAKING_AI_UNAVAILABLE',availability.reason);return availability;};
const createSchema=z.object({recording_id:z.string().uuid(),recorded_at:z.string().datetime(),questions:z.array(z.string().min(1).max(180)).min(1).max(20)}).strict();
const indexSchema=z.coerce.number().int().min(1).max(40);
const stale=row=>Date.now()-new Date(row.updated_at).getTime()>120000;
async function owned(id,user,run=query,lock=false){
 id=z.string().uuid().parse(id);
 const [row]=await run('SELECT * FROM chinese_speaking_submissions WHERE id=?'+(lock?' FOR UPDATE':''),[id]);
 if(!row||user.role!=='admin'&&row.student_id!==user.id)throw notFound();
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+row.level_id,run);
 return {...row,snapshot:json(row.snapshot),result:json(row.result)};
}
export async function createSpeakingSubmission(user,setId,body){
 setId=z.string().uuid().parse(setId);
 const availability=unavailable(),input=createSchema.parse(body),set=await getSet(setId);
 await requireCourse(user.id,'hsk-'+set.level_id);
 if(json(set.speaking_settings)?.ai_assessment!==true)throw new AppError(409,'SPEAKING_AI_DISABLED','Cô giáo chưa bật chấm AI cho bài này.');
 const items=await getItems(setId),activities=await publishedActivitiesForSet(setId),questions=speakingQuestions(activities,items);
 if(JSON.stringify(input.questions)!==JSON.stringify(questions.map(q=>q.text)))throw new AppError(409,'SPEAKING_ASSIGNMENT_CHANGED','Câu hỏi cô giao đã thay đổi. Hãy mở lại bài trước khi ghi âm.');
 const snapshot={duration_seconds:speakingSettings(set).duration_seconds,questions:questions.map(q=>{
  const item=items.find(i=>i.data.practice==='speaking'&&i.data.text===q.text),activity=activities?.tasks?.find(t=>t.type==='dialogue'&&t.speech===q.text);
  return {question:q.text,answer_reference:item?.data.answer_reference||activity?.answer||'',assessment_notes:item?.data.assessment_notes||''};
 })};
 const now=new Date(),recorded=new Date(input.recorded_at);
 if(recorded>new Date(now.getTime()+60000)||recorded<new Date(now.getTime()-86400000))throw new AppError(400,'SPEAKING_RECORDING_TIME','Bản ghi cần được chấm trong vòng 24 giờ sau khi ghi âm.');
 return withTransaction(async c=>{
  const run=runTx(c);await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user.id]);
  const [existing]=await run('SELECT id,set_id FROM chinese_speaking_submissions WHERE student_id=? AND recording_id=?',[user.id,input.recording_id]);
  if(existing){if(existing.set_id!==setId)throw new AppError(409,'SPEAKING_RECORDING_CONFLICT','Mã lượt ghi âm đã thuộc bài khác.');return {id:existing.id};}
  const midnight=new Date(now);midnight.setUTCHours(0,0,0,0);
  const [count]=await run('SELECT COUNT(*) total FROM chinese_speaking_submissions WHERE student_id=? AND created_at>=?',[user.id,midnight]);
  if(Number(count.total)>=availability.daily_limit)throw new AppError(429,'SPEAKING_DAILY_LIMIT',`Con đã dùng ${availability.daily_limit} lượt chấm AI hôm nay. Bản ghi vẫn nghe và tải được.`);
  const id=randomUUID();
  await run('INSERT INTO chinese_speaking_submissions(id,student_id,set_id,recording_id,recording_code,level_id,lesson_title,set_title,snapshot,recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[id,user.id,setId,input.recording_id,input.recording_id.slice(0,8).toUpperCase(),set.level_id,set.lesson_title,set.title,JSON.stringify(snapshot),recorded]);
  return {id};
 });
}
export async function assessSpeakingClip(user,id,questionIndex,chunkIndex,buffer){
 unavailable();const duration=validateSpeakingWav(buffer),question=indexSchema.parse(questionIndex),chunk=indexSchema.parse(chunkIndex),hash=createHash('sha256').update(buffer).digest('hex'),lease=randomUUID();
 const cached=await withTransaction(async c=>{
  const run=runTx(c),submission=await owned(id,user,run,true);
  if(['completed','needs_review','grading'].includes(submission.status))throw new AppError(409,'SPEAKING_ALREADY_SUBMITTED','Lượt này đã gửi chấm.');
  if(question>submission.snapshot.questions.length)throw new AppError(400,'SPEAKING_QUESTION_INVALID','Câu trả lời không thuộc bài được giao.');
  const clips=await run('SELECT * FROM chinese_speaking_clips WHERE submission_id=? FOR UPDATE',[id]),old=clips.find(row=>row.question_index===question&&row.chunk_index===chunk);
  if(old&&old.audio_hash!==hash)throw new AppError(409,'SPEAKING_CLIP_CONFLICT','Đoạn trả lời đã gửi không khớp bản ghi hiện tại.');
  if(old?.status==='completed')return json(old.result);
  if(old?.status==='processing'&&!stale(old))throw new AppError(409,'SPEAKING_AI_PROCESSING','Đoạn này đang được chấm. Hãy chờ rồi thử lại.');
  const total=clips.filter(row=>row!==old&&row.status!=='failed').reduce((sum,row)=>sum+Number(json(row.result)?.duration||0),0);
  if(total+duration>submission.snapshot.duration_seconds+1||!old&&clips.length>=40)throw new AppError(400,'SPEAKING_AUDIO_LIMIT','Âm thanh vượt thời lượng của bài được giao.');
  await run(dialectSql('INSERT INTO chinese_speaking_clips(submission_id,question_index,chunk_index,audio_hash,status,lease_id,result) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),lease_id=VALUES(lease_id),result=VALUES(result),updated_at=CURRENT_TIMESTAMP(3)',
   'INSERT INTO chinese_speaking_clips(submission_id,question_index,chunk_index,audio_hash,status,lease_id,result) VALUES (?,?,?,?,?,?,?) ON CONFLICT(submission_id,question_index,chunk_index) DO UPDATE SET status=EXCLUDED.status,lease_id=EXCLUDED.lease_id,result=EXCLUDED.result,updated_at=CURRENT_TIMESTAMP(3)'),[id,question,chunk,hash,'processing',lease,JSON.stringify({duration})]);
  return null;
 });
 if(cached)return {processed:true};
 try{
  const result=await assessSpeakingAudio(buffer);
  await query("UPDATE chinese_speaking_clips SET status='completed',result=?,updated_at=CURRENT_TIMESTAMP(3) WHERE submission_id=? AND question_index=? AND chunk_index=? AND lease_id=?",[JSON.stringify(result),id,question,chunk,lease]);
  return {processed:true};
 }catch(error){await query("UPDATE chinese_speaking_clips SET status='failed',result=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE submission_id=? AND question_index=? AND chunk_index=? AND lease_id=?",[id,question,chunk,lease]);throw error;}
}
export async function finishSpeakingSubmission(user,id){
 unavailable();const lease=randomUUID();
 const claimed=await withTransaction(async c=>{
  const run=runTx(c),submission=await owned(id,user,run,true);
  if(['completed','needs_review'].includes(submission.status))return {cached:true,submission};
  if(submission.status==='grading'&&!stale(submission))throw new AppError(409,'SPEAKING_AI_PROCESSING','Bài đang được chấm. Hãy chờ rồi cập nhật kết quả.');
  const clips=await run('SELECT * FROM chinese_speaking_clips WHERE submission_id=? ORDER BY question_index,chunk_index',[id]);
  if(clips.some(clip=>clip.status!=='completed'))throw new AppError(409,'SPEAKING_CLIPS_INCOMPLETE','Có đoạn âm thanh chưa xử lý xong. Hãy gửi chấm lại.');
  if(!clips.length)throw new AppError(400,'SPEAKING_NO_ANSWERS','Chưa có phần trả lời sau khi nghe câu hỏi. Hãy ghi âm lại bài.');
  await run("UPDATE chinese_speaking_submissions SET status='grading',lease_id=?,error_code=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?",[lease,id]);
  return {submission,clips};
 });
 if(claimed.cached)return speakingSubmission(user,id);
 try{
  const {submission,clips}=claimed;
  const answers=submission.snapshot.questions.map((source,n)=>{
   const parts=clips.filter(clip=>clip.question_index===n+1).map(clip=>json(clip.result));
   return {index:n+1,...source,transcript:parts.map(p=>p.transcript).filter(Boolean).join(' ').slice(0,4000)};
  });
  const inputs=answers.filter(a=>a.transcript),fingerprint=answer=>createHash('sha256').update(JSON.stringify({level:submission.level_id,answer})).digest('hex');
  // Internal text-only progress, never exposed to students. Fingerprints prevent
  // reusing a grade if extra answer chunks were added after a failed attempt.
  const cache=submission.snapshot.grade_cache||{},judged=[];
  for(const answer of inputs)if(cache[answer.index]?.hash===fingerprint(answer))judged.push(cache[answer.index].grade);
  const missing=inputs.filter(answer=>!judged.some(grade=>grade.index===answer.index));
  judged.push(...await judgeSpeakingAnswers(missing,submission.level_id,async batch=>{
   for(const grade of batch)cache[grade.index]={hash:fingerprint(inputs.find(answer=>answer.index===grade.index)),grade};
   submission.snapshot.grade_cache=cache;
   await query('UPDATE chinese_speaking_submissions SET snapshot=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND lease_id=?',[JSON.stringify(submission.snapshot),id,lease]);
  }));
  const questions=answers.map(answer=>{
   const grade=judged.find(g=>g.index===answer.index),assessable=Boolean(grade);
   return {index:answer.index,question:answer.question,transcript:answer.transcript,status:assessable?'scored':'needs_review',score:assessable?Math.round(grade.content*.6+grade.grammar*.4):null,content_score:grade?.content??null,grammar_score:grade?.grammar??null,pronunciation_score:null,fluency_score:null,feedback:grade?.feedback||'Chưa nghe rõ hoặc chưa có câu trả lời. Cô giáo cần xem lại.',correction:grade?.correction||'',correction_pinyin:grade?.correction_pinyin||'',errors:grade?.errors||[],practice_words:[]};
  });
  const scored=questions.filter(q=>q.status==='scored'),status=scored.length===questions.length?'completed':'needs_review';
  const score=status==='completed'?Math.round(scored.reduce((sum,q)=>sum+q.score,0)/questions.length):null;
  const result={questions,scored_count:scored.length,question_count:questions.length,overall_score:score,assessment_mode:'content_grammar',weights:{content:60,grammar:40,pronunciation:0,fluency:0},notice:'Điểm dựa trên bản nhận diện: đúng ý 60%, từ và ngữ pháp 40%; chưa chấm phát âm, thanh điệu hoặc độ trôi chảy. Nhận diện có thể sai; giáo viên đánh giá cuối cùng. Server chỉ lưu kết quả chữ và điểm, không lưu bản ghi âm.'};
  await query('UPDATE chinese_speaking_submissions SET status=?,result=?,score=?,completed_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND lease_id=?',[status,JSON.stringify(result),score,id,lease]);
  return speakingSubmission(user,id);
 }catch(error){await query("UPDATE chinese_speaking_submissions SET status='failed',error_code=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND lease_id=?",[error instanceof AppError?error.code:'SPEAKING_GRADING_FAILED',id,lease]);throw error;}
}
export async function speakingSubmission(user,id){
 const row=await owned(id,user);
 return {id:row.id,student_id:row.student_id,recording_code:row.recording_code,level_id:row.level_id,lesson_title:row.lesson_title,set_title:row.set_title,status:row.status,score:row.score,recorded_at:row.recorded_at,created_at:row.created_at,completed_at:row.completed_at,result:row.result};
}
export async function speakingResults(){
 return query(`SELECT s.id,s.student_id,s.recording_code,s.level_id,s.lesson_title,s.set_title,s.status,s.score,s.recorded_at,s.created_at,s.completed_at,p.username,p.display_name FROM chinese_speaking_submissions s JOIN profiles p ON p.id=s.student_id ORDER BY s.created_at DESC,s.id DESC LIMIT 100`);
}
