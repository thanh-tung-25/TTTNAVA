import {z} from 'zod';
import {query} from '../config/db.js';
import {getSet,getItems,json} from '../repositories/chinese.js';
import {requireCourse} from './course-service.js';
import {badRequest} from '../utils/errors.js';
import {speakingQuestions} from '../../../frontend/assets/js/chinese-speaking-data.js';
import {uniqueStudyWords} from '../../../frontend/assets/js/chinese-study-variety.js';
import {chineseActivityMatches} from '../../../frontend/assets/js/chinese-activity-answer.js';

export const studyStartSchema=z.object({activity:z.enum(['cards','words','listening','application','reading','writing','recording','lab']),source_id:z.string().min(1).max(80),unit:z.string().max(30).default('all')}).strict();
export async function studySnapshot(user,courseId,input){
 const course=await requireCourse(user,courseId);
 if(input.activity==='lab'){
  if(!['toan','tieng-viet','tieng-anh','khoa-hoc','chinese','math','language','english','science'].includes(input.source_id))throw badRequest('Hoạt động không hợp lệ.');
  if(course.kind==='chinese'&&input.source_id!=='chinese'||course.kind!=='chinese'&&input.source_id==='chinese')throw badRequest('Hoạt động không thuộc khóa đang học.');
  return {required:5,items:[],kind:'interaction'};
 }
 z.uuid().parse(input.source_id);const set=await getSet(input.source_id,false);
 if(course.kind!=='chinese'||course.id!=='hsk-'+set.level_id)throw badRequest('Bài học không thuộc khóa đang chọn.');
 const items=await getItems(set.id),words=uniqueStudyWords(items.filter(i=>i.kind==='vocabulary'&&i.data.hanzi&&i.data.meaning));
 if(input.activity==='application'){
  if(!['all','mixed','order','fix','fill','dialogue'].includes(input.unit))throw badRequest('Dạng vận dụng không hợp lệ.');
  const [row]=await query("SELECT data FROM chinese_activities WHERE lesson_id=? AND status='published'",[set.lesson_id]);
  const tasks=json(row?.data)?.tasks||[],allowed=tasks.map((data,index)=>({id:String(index),data})).filter(t=>['all','mixed'].includes(input.unit)||t.data.type===input.unit);
  if(!allowed.length)throw badRequest('Bài chưa có hoạt động phù hợp.');return {required:Math.min(10,allowed.length),items:allowed,kind:'application'};
 }
 if(input.activity==='reading'){
  const texts=items.filter(i=>['grammar','reading','dialogue'].includes(i.kind)&&i.data.practice!=='speaking');if(!texts.length)throw badRequest('Bài chưa có nội dung đọc.');return {required:texts.length,items:texts.map(i=>({id:i.id})),kind:'view'};
 }
 if(input.activity==='recording'&&items.some(i=>i.kind==='vocabulary'||i.kind==='dialogue')){
  const [activity]=await query("SELECT data FROM chinese_activities WHERE lesson_id=? AND status='published'",[set.lesson_id]);
  return {required:5,items:speakingQuestions(json(activity?.data),items).map((q,n)=>({id:String(n+1),text:q.text})),kind:'recording'};
 }
 if(!words.length)throw badRequest('Bài chưa có từ vựng.');
 if(input.activity==='writing')return {required:3,items:[],kind:'strokes'};
 if(input.activity==='listening'){
  if(!/^\d+$/.test(input.unit))throw badRequest('Chọn chặng luyện nghe.');const stage=words.slice(Number(input.unit)*10,Number(input.unit)*10+10);
  if(!stage.length)throw badRequest('Chặng chưa có từ.');return {required:stage.length,kind:'listening',items:stage.map(i=>({id:i.id,answer:i.data.meaning})),options:[...new Set(words.map(i=>i.data.meaning))]};
 }
 return {required:Math.min(5,words.length),items:words.map(i=>({id:i.id})),kind:'view'};
}
export const evidenceSchema=z.object({items:z.array(z.object({id:z.string().max(80),answer:z.string().max(3000).optional()}).strict()).max(100).optional(),strokes:z.array(z.array(z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)])).min(2).max(200)).max(50).optional(),duration:z.number().min(0).max(120).optional(),actions:z.array(z.string().min(1).max(150)).max(100).optional()}).strict();
export function validateStudyProgress(snapshot,evidence,createdAt){
 const rows=evidence.items||[],allowed=new Map((snapshot.items||[]).map(item=>[item.id,item]));
 if(!['view','listening','application','recording'].includes(snapshot.kind)||!rows.length||new Set(rows.map(row=>row.id)).size!==rows.length||rows.some(row=>!allowed.has(row.id)))throw badRequest('Nội dung ghi nhận không thuộc phần học này.');
 if(snapshot.kind==='recording'&&((evidence.duration||0)<5||Date.now()-new Date(createdAt).getTime()<5000))throw badRequest('Bạn cần ghi âm trả lời trước khi lưu tiến độ nói.');
 for(const row of rows){
  const item=allowed.get(row.id);
  if(snapshot.kind==='listening'&&!snapshot.options.includes(row.answer))throw badRequest('Lựa chọn nghe không hợp lệ.');
  if(snapshot.kind==='application'&&(!row.answer?.trim()||['fix','dialogue'].includes(item.data.type)&&!item.data.options.includes(row.answer)))throw badRequest('Câu trả lời vận dụng không hợp lệ.');
 }
 return rows.map(row=>row.id);
}
export function validateStudyEvidence(snapshot,evidence,createdAt){
 const fail=()=>{throw badRequest('Bạn hoàn thành đủ lượt học trước khi nhận kim cương nhé.');};
 if(snapshot.kind==='strokes'){
  const strokes=evidence.strokes||[],valid=strokes.filter(points=>points.reduce((sum,p,i)=>i?sum+Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]):0,0)>=.08);
  if(valid.length<snapshot.required||valid.reduce((n,s)=>n+s.length,0)<15)fail();return {completed:valid.length};
 }
 if(snapshot.kind==='recording'){if((evidence.duration||0)<snapshot.required||Date.now()-new Date(createdAt).getTime()<snapshot.required*1000)fail();return {completed:1,duration:Math.round(evidence.duration)};}
 if(snapshot.kind==='interaction'){const actions=new Set(evidence.actions||[]);if(actions.size<snapshot.required)fail();return {completed:actions.size};}
 const rows=evidence.items||[],ids=new Set(rows.map(r=>r.id)),allowed=new Map(snapshot.items.map(i=>[i.id,i]));
 if(ids.size!==rows.length||rows.length<snapshot.required||rows.some(r=>!allowed.has(r.id)))fail();
 let correct=0;for(const row of rows){const source=allowed.get(row.id);
  if(snapshot.kind==='listening'){if(!snapshot.options.includes(row.answer))fail();if(row.answer===source.answer)correct++;}
  if(snapshot.kind==='application'){if(!row.answer?.trim())fail();if(['fix','dialogue'].includes(source.data.type)&&!source.data.options.includes(row.answer))fail();if(chineseActivityMatches(source.data,row.answer))correct++;}
 }
 return {completed:rows.length,...(['listening','application'].includes(snapshot.kind)?{correct}:{})};
}
