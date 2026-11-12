import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildQ1LessonPack,q1LessonNumbers} from '../src/services/chinese-q1-lesson-pack.js';
import {extractChinese} from '../src/services/chinese-import.js';
import {issues} from '../src/validators/chinese.js';
import {validateActivities} from '../src/services/chinese-activities.js';
import {publicItem} from '../src/repositories/chinese.js';
import {closePool} from '../src/config/db.js';

try{
 for(const number of q1LessonNumbers){
  const pack=buildQ1LessonPack(number),buffer=await readFile(new URL(`../../tai-lieu/tieng-trung-bai-7-10/cau-hoi-tu-vung-tieng-trung-bai-${number}.docx`,import.meta.url));
  const parsed=await extractChinese(buffer),items=parsed.items.map(item=>item.kind==='question'?{...item,data:{...item.data,approved:true}}:item);
  const questionContent=data=>({prompt:data.prompt,options:data.options,accepted:data.accepted,explanation:data.explanation,difficulty:data.difficulty});
  assert.deepEqual(items.filter(item=>item.kind==='question').map(item=>questionContent(item.data)),pack.questions.map(questionContent));
  assert.deepEqual(issues(items),[]);assert.equal(items.length,pack.items.length);assert.equal(parsed.warnings.length,0);
  for(const kind of ['vocabulary','question','grammar','reading','dialogue'])assert.equal(items.filter(item=>item.kind===kind).length,pack.items.filter(item=>item.kind===kind).length,`Bài ${number}: ${kind} changed in Word`);
  const spoken=items.filter(item=>item.data.practice==='speaking');assert.equal(spoken.length,10);
  for(const item of spoken){const shown=publicItem(item);for(const key of ['meaning','pinyin','answer_reference','assessment_notes'])assert.equal(shown.data[key],undefined,'Teacher fields leaked');assert(item.data.text.endsWith('？'));}
  const activities=validateActivities(pack.activities);for(const type of ['order','fix','fill','dialogue'])assert.equal(activities.tasks.filter(task=>task.type===type).length,10);
  for(const task of activities.tasks.filter(task=>task.type==='dialogue'))assert.equal(task.prompt,'Nghe câu thoại và chọn câu đáp lại phù hợp.');
  assert(pack.questions.every(question=>question.options.length===4&&new Set(question.options).size===4&&question.options.includes(question.accepted[0])));
  assert(pack.questions.filter(question=>question.difficulty==='medium').length>=20);
  const word=pack.vocabulary.find(word=>word.hanzi==='洗手间');if(word)assert.equal(word.meaning,'nhà vệ sinh');
  if(number===10)assert.equal(pack.vocabulary.find(word=>word.hanzi==='儿子').meaning,'con trai');
  const speakingFile=await extractChinese(await readFile(new URL(`../../tai-lieu/tieng-trung-bai-7-10/luyen-noi-bai-${number}.docx`,import.meta.url)),{destination:'speaking'});assert.equal(speakingFile.items.length,10);assert.equal(speakingFile.items.filter(item=>item.kind==='unknown').length,0);
  console.log(JSON.stringify({lesson:number,wordRoundTrip:true,items:items.length,hiddenTeacherFields:true,activities:40,speaking:10}));
 }
}finally{await closePool();}
