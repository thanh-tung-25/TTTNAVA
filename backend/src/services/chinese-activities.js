import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {one,json,getSet} from '../repositories/chinese.js';
import {parse,normalizeAnswer} from '../validators/chinese.js';
import {badRequest,AppError} from '../utils/errors.js';

const text=z.string().trim().max(3000).default('');
const task=z.object({type:z.enum(['order','fix','fill','dialogue']),prompt:text,answer:text,explanation:text,hint:text,pinyin:text,speech:text,meaning:text,
 tokens:z.array(z.string().trim().min(1).max(200)).max(40).default([]),options:z.array(z.string().trim().min(1).max(1000)).max(8).default([])}).strict();
const schema=z.object({revision:z.number().int().min(0),status:z.enum(['draft','published']),topic:z.string().trim().max(150).default(''),tasks:z.array(task).max(100)}).strict();
export function validateActivities(body){
 const d=parse(schema,body);
 if(d.status==='published'){
  if(!d.topic||!d.tasks.length)throw badRequest('Cần chủ đề và ít nhất một hoạt động trước khi cho học sinh xem.');
  d.tasks.forEach((t,i)=>{
   const fail=message=>{throw badRequest(`Hoạt động ${i+1}: ${message}`);};
   if(!t.prompt||!t.answer||!t.explanation)fail('cần nội dung, đáp án và lời giải.');
   if(t.type==='order'&&(!t.tokens.length||normalizeAnswer(t.tokens.join(''))!==normalizeAnswer(t.answer)))fail('các từ phải được nhập theo thứ tự đáp án và ghép lại đúng câu đáp án, kể cả dấu câu.');
   if(['fix','dialogue'].includes(t.type)){
    const options=t.options.map(normalizeAnswer);
    if(options.length<2||new Set(options).size!==options.length||!options.includes(normalizeAnswer(t.answer)))fail('cần 2–8 lựa chọn khác nhau và đáp án phải thuộc lựa chọn.');
   }
   if(t.type==='dialogue'&&!t.speech)fail('cần câu nói của người đối thoại.');
  });
 }
 return d;
}
export async function adminActivities(id){
 id=parse(z.string().uuid(),id);await one('SELECT id FROM chinese_lessons WHERE id=?',[id]);
 const [row]=await query('SELECT * FROM chinese_activities WHERE lesson_id=?',[id]);
 return row?{...json(row.data),status:row.status,revision:row.revision}:{topic:'',tasks:[],status:'draft',revision:0};
}
export async function saveActivities(id,body){
 id=parse(z.string().uuid(),id);const d=validateActivities(body);
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  // Lock the parent as well: two first-time saves must not overwrite one another.
  await one('SELECT id FROM chinese_lessons WHERE id=? FOR UPDATE',[id],run);
  const [old]=await run('SELECT revision FROM chinese_activities WHERE lesson_id=? FOR UPDATE',[id]);
  if((old?.revision||0)!==d.revision)throw new AppError(409,'ACTIVITY_CONFLICT','Nội dung đã được lưu ở cửa sổ khác. Hãy tải lại trang trước khi sửa tiếp.');
  const revision=d.revision+1,data=JSON.stringify({topic:d.topic,tasks:d.tasks});
  if(old)await run('UPDATE chinese_activities SET status=?,data=?,revision=?,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=?',[d.status,data,revision,id]);
  else await run('INSERT INTO chinese_activities (lesson_id,status,data,revision) VALUES (?,?,?,?)',[id,d.status,data,revision]);
  return {...d,revision};
 });
}
export async function publishedActivitiesForSet(id){
 const set=await getSet(id);const [row]=await query("SELECT data FROM chinese_activities WHERE lesson_id=? AND status='published'",[set.lesson_id]);
 return row?json(row.data):null;
}
