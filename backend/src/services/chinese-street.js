import {createHash} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {json} from '../repositories/chinese.js';
import {AppError,notFound} from '../utils/errors.js';
import {requireCourse} from './course-service.js';
import {defaultStreetLesson,streetLessonNumber} from '../data/chinese-street-missions.js';
import {streetPlaces} from '../../../frontend/assets/js/chinese-street-places.js';
const uuid=z.string().uuid(),key=z.string().regex(/^[a-z0-9-]{1,50}$/),placeIds=streetPlaces.map(p=>p.id),runTx=c=>async(sql,p=[]) =>(await c.query(sql,p))[0];
const option=z.object({id:key,label:z.string().trim().min(1).max(100)}).strict();
const missionSchema=z.object({id:key,title:z.string().trim().min(1).max(80),instruction:z.string().trim().min(1).max(200),speech:z.string().trim().min(1).max(240).refine(s=>/\p{Script=Han}/u.test(s),'Câu nghe cần có chữ Trung.'),type:z.enum(['choice','map']),options:z.array(option).max(4),answer:key,feedback:z.string().trim().min(1).max(600)}).strict().superRefine((m,c)=>{
 const issue=message=>c.addIssue({code:'custom',message});
 if(m.type==='map'){if(m.options.length||!placeIds.includes(m.answer))issue('Nhiệm vụ bản đồ cần đáp án là một địa điểm trên phố.');}
 else if(m.options.length<2||new Set(m.options.map(o=>o.id)).size!==m.options.length||new Set(m.options.map(o=>o.label.normalize('NFKC').trim().toLowerCase())).size!==m.options.length||!m.options.some(o=>o.id===m.answer))issue('Cần 2–4 lựa chọn khác nhau, có đáp án đúng trong đó.');
});
export const streetSettingsSchema=z.object({revision:z.number().int().min(0),enabled:z.boolean(),place_id:z.enum(placeIds),missions:z.array(missionSchema).min(1).max(6)}).strict().refine(v=>new Set(v.missions.map(m=>m.id)).size===v.missions.length,'Mã nhiệm vụ không được trùng.');
export const streetContentHash=m=>createHash('sha256').update(JSON.stringify(m)).digest('hex');
async function lessonFor(user,id,run=query){
 const [lesson]=await run('SELECT * FROM chinese_lessons WHERE id=?'+(user.role==='admin'?'':" AND status='published'"),[uuid.parse(id)]);
 if(!lesson)throw notFound('Bài học chưa được xuất bản hoặc không còn tồn tại.');
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+lesson.level_id,run);
 return lesson;
}
async function configFor(lesson,run=query){
 const [row]=await run('SELECT data,revision FROM chinese_street_lessons WHERE lesson_id=?',[lesson.id]);
 const config=row?json(row.data):defaultStreetLesson(lesson);
 return config?{...config,revision:Number(row?.revision)||0}:null;
}
const progressFor=(rows,lessonId,m)=>rows.find(r=>r.lesson_id===lessonId&&r.mission_id===m.id&&r.content_hash===streetContentHash(m));
export async function streetCatalog(user,rawLevel){
 const level=z.coerce.number().int().min(1).max(9).parse(rawLevel);
 if(user.role!=='admin')await requireCourse(user.id,'hsk-'+level);
 const lessons=await query('SELECT * FROM chinese_lessons WHERE level_id=?'+(user.role==='admin'?" AND status<>'archived'":" AND status='published'")+' ORDER BY position,title',[level]);
 const progress=user.role==='admin'?[]:await query('SELECT * FROM chinese_street_progress WHERE student_id=?',[user.id]),out=[];
 for(const lesson of lessons){const config=await configFor(lesson);if(!config)continue;
  const completed=config.missions.filter(m=>progressFor(progress,lesson.id,m)?.completed_at).length;
  out.push({id:lesson.id,title:lesson.title,position:lesson.position,level_id:lesson.level_id,number:streetLessonNumber(lesson),status:lesson.status,enabled:config.enabled,place_id:config.place_id,total:config.missions.length,completed,stars:config.missions.reduce((sum,m)=>sum+Number(progressFor(progress,lesson.id,m)?.best_stars||0),0)});
 }
 return {level,lessons:out};
}
export async function streetLesson(user,id){
 const lesson=await lessonFor(user,id),config=await configFor(lesson);
 if(!config||!config.enabled&&user.role!=='admin')throw notFound('Cô đang chuẩn bị nhiệm vụ cho bài này.');
 const rows=user.role==='admin'?[]:await query('SELECT * FROM chinese_street_progress WHERE student_id=? AND lesson_id=?',[user.id,lesson.id]);
 return {lesson:{id:lesson.id,title:lesson.title,status:lesson.status},...config,missions:config.missions.map(m=>{
  const p=progressFor(rows,lesson.id,m),{answer,feedback,...publicMission}=m;
  return {...(user.role==='admin'?m:publicMission),content_hash:streetContentHash(m),progress:{completed:Boolean(p?.completed_at),stars:Number(p?.best_stars)||0,wrong_count:Number(p?.wrong_count)||0}};
 })};
}
export async function saveStreetLesson(user,id,body){
 const input=streetSettingsSchema.parse(body);
 await withTransaction(async c=>{
  const run=runTx(c);await lessonFor(user,id,run);await run('SELECT id FROM chinese_lessons WHERE id=? FOR UPDATE',[id]);
  const [old]=await run('SELECT revision FROM chinese_street_lessons WHERE lesson_id=? FOR UPDATE',[id]);
  if(Number(old?.revision||0)!==input.revision)throw new AppError(409,'STREET_EDIT_CONFLICT','Bài đã được sửa ở cửa sổ khác. Hãy tải lại để xem nội dung mới trước khi lưu.');
  const {revision,...data}=input;
  if(old)await run('UPDATE chinese_street_lessons SET data=?,revision=?,updated_at=CURRENT_TIMESTAMP(3) WHERE lesson_id=?',[JSON.stringify(data),revision+1,id]);
  else await run('INSERT INTO chinese_street_lessons(lesson_id,data,revision) VALUES (?,?,?)',[id,JSON.stringify(data),1]);
 });
 return streetLesson(user,id);
}
export async function answerStreet(user,id,missionId,body){
 missionId=key.parse(missionId);
 const input=z.object({choice_id:key,request_id:uuid,content_hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(body);
 return withTransaction(async c=>{
  const run=runTx(c);await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user.id]);
  const lesson=await lessonFor(user,id,run),config=await configFor(lesson,run),m=config?.missions.find(m=>m.id===missionId);
  if(!m||!config.enabled)throw notFound('Nhiệm vụ đã được cô thay đổi hoặc tạm dừng.');
  const hash=streetContentHash(m);
  if(hash!==input.content_hash)throw new AppError(409,'STREET_CONTENT_CHANGED','Cô vừa cập nhật nhiệm vụ. Con mở lại bài để nghe nội dung mới nhé.');
  const allowed=m.type==='map'?placeIds:m.options.map(o=>o.id);
  if(!allowed.includes(input.choice_id))throw new AppError(400,'STREET_CHOICE_INVALID','Lựa chọn không thuộc nhiệm vụ này.');
  const params=[user.id,id,m.id,hash],where='student_id=? AND lesson_id=? AND mission_id=? AND content_hash=?';
  const [old]=await run('SELECT * FROM chinese_street_progress WHERE '+where+' FOR UPDATE',params);
  if(old?.last_request===input.request_id){if(old.last_choice!==input.choice_id)throw new AppError(409,'STREET_ANSWER_CONFLICT','Mã lượt này đã dùng cho lựa chọn khác.');return json(old.last_response);}
  const correct=input.choice_id===m.answer,wrong=Number(old?.wrong_count||0)+(!correct&&!old?.completed_at?1:0),stars=Number(old?.best_stars)|| (correct?Math.max(1,3-wrong):0);
  const response={correct,stars,completed:Boolean(old?.completed_at)||correct,feedback:correct?m.feedback:'Chưa đúng rồi. Con nghe lại hoặc mở chữ để thử thêm một lần nhé.',...(correct?{answer_id:m.answer}:{}),wrong_count:wrong};
  if(old)await run('UPDATE chinese_street_progress SET wrong_count=?,best_stars=?,last_request=?,last_choice=?,last_response=?,completed_at=?,updated_at=CURRENT_TIMESTAMP(3) WHERE '+where,[wrong,stars,input.request_id,input.choice_id,JSON.stringify(response),old.completed_at||(correct?new Date():null),...params]);
  else await run('INSERT INTO chinese_street_progress(student_id,lesson_id,mission_id,content_hash,wrong_count,best_stars,last_request,last_choice,last_response,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[...params,wrong,stars,input.request_id,input.choice_id,JSON.stringify(response),correct?new Date():null]);
  return response;
 });
}
export async function streetResults(user,rawLevel){
 const catalog=await streetCatalog(user,rawLevel),configs=new Map();
 for(const lesson of catalog.lessons)configs.set(lesson.id,await configFor(lesson));
 const rows=await query('SELECT p.*,s.display_name,s.username,l.title lesson_title FROM chinese_street_progress p JOIN profiles s ON s.id=p.student_id JOIN chinese_lessons l ON l.id=p.lesson_id WHERE l.level_id=? ORDER BY p.updated_at DESC LIMIT 3000',[catalog.level]);
 const reports=new Map();
 for(const row of rows){const config=configs.get(row.lesson_id),mission=config?.missions.find(m=>m.id===row.mission_id);if(!mission||streetContentHash(mission)!==row.content_hash)continue;
  const key=row.student_id+':'+row.lesson_id;
  if(!reports.has(key))reports.set(key,{student_id:row.student_id,display_name:row.display_name,username:row.username,lesson_id:row.lesson_id,lesson_title:row.lesson_title,total:config.missions.length,completed:0,stars:0,wrong_count:0,updated_at:row.updated_at});
  const report=reports.get(key);report.completed+=row.completed_at?1:0;report.stars+=Number(row.best_stars);report.wrong_count+=Number(row.wrong_count);
 }
 return [...reports.values()].slice(0,100);
}
