// Import the generated Word banks into HSK 1 without replacing existing lessons.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {query,closePool} from '../src/config/db.js';
import {saveLesson,importWord,saveSet} from '../src/services/chinese.js';
import {getItems} from '../src/repositories/chinese.js';
import {extractChinese} from '../src/services/chinese-import.js';
import {issues} from '../src/validators/chinese.js';
import {adminActivities,saveActivities} from '../src/services/chinese-activities.js';
import {activityTemplate} from '../../frontend/assets/js/chinese-activity-templates.js';

const titles={3:'很高兴认识你 — Rất vui được làm quen với bạn',4:'你去哪儿 — Bạn đi đâu?',5:'你要吃什么 — Bạn muốn ăn gì?',6:'你在哪儿工作 — Bạn làm việc ở đâu?'};
const prepared=[];
try{
 // Read and validate every source before changing any lesson.
 for(const n of [3,4,5,6]){
  const filename=`cau-hoi-tu-vung-tieng-trung-bai-${n}.docx`;
  const buffer=await readFile(new URL(`../../tai-lieu/tieng-trung-bai-3-6/${filename}`,import.meta.url));
  const questions=(await extractChinese(buffer)).items.map(i=>i.kind==='question'?{...i,data:{...i.data,approved:true}}:i);
  const vocabulary=(await extractChinese(await readFile(new URL(`../../tai-lieu/tieng-trung-bai-3-6/tu-vung-nhap-web-bai-${n}.docx`,import.meta.url)))).items;
  const merged=new Map();
  for(const item of vocabulary){
   const previous=merged.get(item.data.hanzi);
   if(previous){previous.data.pinyin+=' / '+item.data.pinyin;previous.data.meaning+='; '+item.data.meaning;}
   else merged.set(item.data.hanzi,item);
  }
  const words=[...merged.values()],errors=issues([...words,...questions]);
  if(errors.length)throw Error(`Bài ${n}: ${JSON.stringify(errors)}`);
  prepared.push({n,filename,buffer,words,questions});
 }
 for(const p of prepared){
  const title=`Bài ${p.n}. ${titles[p.n]}`;
  const existing=await query('SELECT * FROM chinese_lessons WHERE level_id=1');
  let lesson=existing.find(l=>l.title.includes(titles[p.n].split(' — ')[0])||new RegExp(`^Bài\\s*${p.n}(?:\\s|[.：:–-]|$)`,'iu').test(l.title));
  if(!lesson){const saved=await saveLesson(null,{level_id:1,title,position:p.n,status:'published',description:'Nội dung từ PDF Q1 và các bản Word đã biên soạn.',image_url:''});lesson={id:saved.id,title,level_id:1};}
  const sha=createHash('sha256').update(p.buffer).digest('hex');
  const [found]=await query('SELECT s.id FROM chinese_sets s JOIN chinese_documents d ON d.id=s.document_id WHERE s.lesson_id=? AND d.sha256=?',[lesson.id,sha]);
  if(!found){
   const imported=await importWord({lesson_id:lesson.id,level_id:1,title:`Bài ${p.n} — Từ vựng và câu hỏi`,allow_duplicate:'true'},{buffer:p.buffer,originalname:p.filename});
   const items=(await getItems(imported.id)).map(i=>({id:i.id,kind:i.kind,data:{...i.data,approved:true}}));
   await saveSet(imported.id,{title:`Bài ${p.n} — Từ vựng và câu hỏi`,status:'published',items:[...p.words,...items]});
  }
  const activity=await adminActivities(lesson.id);
  if(activity.revision===0)await saveActivities(lesson.id,{...activityTemplate({level_id:1,title}),revision:0,status:'published'});
  console.log(JSON.stringify({lesson:p.n,level:1,lesson_id:lesson.id,questions:p.questions.length,vocabulary:p.words.length,existing:!!found}));
 }
}finally{await closePool();}
