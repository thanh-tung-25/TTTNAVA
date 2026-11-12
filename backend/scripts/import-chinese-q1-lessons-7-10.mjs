// Default: review only. --apply adds four reviewed HSK1 lessons to local MySQL.
// No UPDATE/DELETE is issued; an imported lesson is never overwritten on retry.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import env from '../src/config/env.js';
import {query,withTransaction,closePool} from '../src/config/db.js';
import {buildQ1LessonPack,q1LessonNumbers} from '../src/services/chinese-q1-lesson-pack.js';
import {extractChinese} from '../src/services/chinese-import.js';
import {issues,itemSchema,lessonSchema,speakingSettingsSchema} from '../src/validators/chinese.js';
import {validateActivities} from '../src/services/chinese-activities.js';

const apply=process.argv.includes('--apply');
const stable=value=>Buffer.isBuffer(value)?value.toString('base64'):value instanceof Date?value.toISOString():Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const digest=rows=>hash(rows.map(row=>JSON.stringify(stable(row))).sort());
const prepared=[];
try{
 assert(process.argv.slice(2).every(arg=>arg==='--apply'),'Chỉ hỗ trợ --apply.');
 assert.equal(env.db.driver,'mysql','Script chỉ thêm bài vào MySQL cục bộ.');
 assert(['localhost','127.0.0.1','::1'].includes(env.db.host),'Không ghi vào database từ xa.');
 assert(!env.storage.enabled,'Bản nhập cục bộ không gửi tệp tới Storage bên ngoài.');
 for(const number of q1LessonNumbers){
  const pack=buildQ1LessonPack(number),filename=`cau-hoi-tu-vung-tieng-trung-bai-${number}.docx`;
  const buffer=await readFile(new URL(`../../tai-lieu/tieng-trung-bai-7-10/${filename}`,import.meta.url)),parsed=await extractChinese(buffer);
  assert.equal(parsed.items.length,pack.items.length,`Word bài ${number} chưa được tạo lại.`);
  const parsedQuestions=parsed.items.filter(item=>item.kind==='question');assert.deepEqual(parsedQuestions.map(item=>item.data.prompt),pack.questions.map(question=>question.prompt));
  const questionContent=data=>({prompt:data.prompt,options:data.options,accepted:data.accepted,explanation:data.explanation,difficulty:data.difficulty});
  assert.deepEqual(parsedQuestions.map(item=>questionContent(item.data)),pack.questions.map(questionContent),'Word và ngân hàng đã rà soát phải có cùng nội dung/đáp án.');
  assert.equal(parsed.items.filter(item=>item.kind==='unknown').length,0);
  pack.items.forEach(item=>itemSchema.parse(item));assert.deepEqual(issues(pack.items),[]);validateActivities(pack.activities);speakingSettingsSchema.parse(pack.speaking_settings);
  const stamp='q1-7-10:'+hash({items:pack.items,activities:pack.activities,settings:pack.speaking_settings});
  const description=`Biên soạn từ ${pack.source}; gồm từ vựng, quiz, ngữ pháp, bài đọc, vận dụng và luyện nói. ${stamp}`;
  lessonSchema.parse({level_id:1,title:pack.title,position:number,status:'published',description,image_url:''});
  prepared.push({pack,filename,buffer,raw:parsed.raw,stamp,description});
 }
 const tables=['chinese_lessons','chinese_documents','chinese_sets','chinese_items','chinese_activities','chinese_reviews','chinese_review_events','chinese_progress','chinese_attempts','chinese_tests'];
 for(const name of ['chinese_speaking_submissions','chinese_speaking_clips'])if((await query('SHOW TABLES LIKE ?',[name])).length)tables.push(name);
 let backup;
 const result=await withTransaction(async connection=>{
  const run=async(sql,parameters=[]) => (await connection.query(sql,parameters))[0];
  await run('SELECT id FROM chinese_levels WHERE id=1 FOR UPDATE');
  const existing=await run('SELECT * FROM chinese_lessons WHERE level_id=1 ORDER BY position FOR UPDATE');
  const old={};for(const table of tables){const rows=await run('SELECT * FROM '+table);old[table]={hash:digest(rows),count:rows.length};}
  const ids={lessons:new Set(),sets:new Set(),documents:new Set(),items:new Set()},report=[];
  if(apply){
   const directory=new URL('../backups/chinese-q1-7-10/',import.meta.url);await mkdir(directory,{recursive:true});
   backup='backend/backups/chinese-q1-7-10/'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
   await writeFile(new URL('../../'+backup,import.meta.url),JSON.stringify({created_at:new Date().toISOString(),mode:'add-only-local',before:old,sources:prepared.map(({pack,stamp})=>({lesson:pack.number,pdf:pack.source,sha256:pack.sha256,stamp}))},null,2),'utf8');
  }
  for(const source of prepared){
   const {pack,stamp}=source,matches=existing.filter(lesson=>Number(lesson.position)===pack.number||lesson.title.includes(pack.hanzi));
   assert(matches.length<=1,`Bài ${pack.number}: có nhiều bài trùng vị trí hoặc tên, dừng nhập.`);
   if(matches.length){
    assert(matches[0].description?.includes(stamp),`Bài ${pack.number} đã có nội dung khác; dừng để không ghi đè.`);
    const sets=await run('SELECT id FROM chinese_sets WHERE lesson_id=?',[matches[0].id]);assert.equal(sets.length,1,'Bài đã nhập cần có đúng một bộ gốc.');
    report.push({lesson:pack.number,lesson_id:matches[0].id,set_id:sets[0].id,status:'already-present',vocabulary:pack.vocabulary.length,questions:pack.questions.length,activities:40,speaking:10});continue;
   }
   const lesson=randomUUID(),set=randomUUID(),document=randomUUID();ids.lessons.add(lesson);ids.sets.add(set);ids.documents.add(document);
   if(apply){
    await run('INSERT INTO chinese_lessons(id,level_id,title,position,description,image_url,status) VALUES (?,?,?,?,?,?,?)',[lesson,1,pack.title,pack.number,source.description,'','published']);
    await run('INSERT INTO chinese_documents(id,filename,sha256,original,raw_text) VALUES (?,?,?,?,?)',[document,source.filename,createHash('sha256').update(source.buffer).digest('hex'),source.buffer,source.raw]);
    await run('INSERT INTO chinese_sets(id,lesson_id,document_id,title,position,status,processing_status,speaking_settings) VALUES (?,?,?,?,?,?,?,?)',[set,lesson,document,`Bài ${pack.number} — Từ vựng và câu hỏi`,1,'published','ready',JSON.stringify(pack.speaking_settings)]);
    for(const [position,item]of pack.items.entries()){
     const id=randomUUID();ids.items.add(id);await run('INSERT INTO chinese_items(id,set_id,kind,position,data) VALUES (?,?,?,?,?)',[id,set,item.kind,position+1,JSON.stringify(item.data)]);
    }
    const activities=validateActivities(pack.activities);await run('INSERT INTO chinese_activities(lesson_id,status,data,revision) VALUES (?,?,?,?)',[lesson,'published',JSON.stringify({topic:activities.topic,tasks:activities.tasks}),1]);
   }
   report.push({lesson:pack.number,lesson_id:apply?lesson:undefined,set_id:apply?set:undefined,status:apply?'added':'would-add',vocabulary:pack.vocabulary.length,questions:pack.questions.length,grammar:4,readings:2,activities:40,speaking:10,assigned:3});
  }
  for(const table of tables){
   let rows=await run('SELECT * FROM '+table);
   if(table==='chinese_lessons')rows=rows.filter(row=>!ids.lessons.has(row.id));
   if(table==='chinese_sets')rows=rows.filter(row=>!ids.sets.has(row.id));
   if(table==='chinese_documents')rows=rows.filter(row=>!ids.documents.has(row.id));
   if(table==='chinese_items')rows=rows.filter(row=>!ids.items.has(row.id));
   if(table==='chinese_activities')rows=rows.filter(row=>!ids.lessons.has(row.lesson_id));
   assert.equal(digest(rows),old[table].hash,`${table}: nội dung hoặc lịch sử cũ đã thay đổi.`);
  }
  if(apply&&backup)await writeFile(new URL('../../'+backup,import.meta.url),JSON.stringify({created_at:new Date().toISOString(),mode:'add-only-local',before:old,added:report.filter(row=>row.status==='added'),oldContentAndHistoryPreserved:true},null,2),'utf8');
  return report;
 });
 console.log(JSON.stringify({mode:apply?'applied-local':'read-only-preview',oldContentAndHistoryPreserved:true,backup,lessons:result},null,2));
}finally{await closePool();}
