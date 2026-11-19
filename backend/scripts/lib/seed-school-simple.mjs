import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {schoolGuideSchema} from '../../src/services/school-study-schema.js';
import {insertSchoolRows} from './insert-school-rows.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function loadSchoolSimple(){
 const manifest=JSON.parse(await fs.readFile(new URL('../../seed-data/school-simple-manifest.json',import.meta.url),'utf8'));
 const catalog=JSON.parse(await fs.readFile(new URL('../../seed-data/school-simple-catalog.json',import.meta.url),'utf8'));
 const expected=new Map(catalog.groups.map(group=>[group.id,group])),seen=new Set(),groups=[];
 for(const file of manifest.files){
  assert(/^[a-z-]+\.json$/u.test(file.name));const bytes=await fs.readFile(new URL('../../seed-data/school-simple/'+file.name,import.meta.url));assert.equal(hash(bytes),file.sha256,'Private school content changed: '+file.name);
  const asset=JSON.parse(bytes.toString('utf8'));assert.equal(asset.version,1);
  for(const guide of asset.groups){
   const group=expected.get(guide.groupId);assert(group&&!seen.has(group.id),'Duplicate or unknown guide '+guide.groupId);seen.add(group.id);
   schoolGuideSchema.parse({summary:guide.summary,formulas:guide.formulas,mistakes:guide.mistakes,examples:guide.examples});
   assert(guide.summary.length>=2&&guide.examples.length>=2&&guide.formulas.length>=1,'Guide is incomplete: '+group.id);
   const topics=new Set(group.parts.map(part=>part.topicId)),prompts=new Set();
   for(const q of guide.questions){
    assert(topics.has(q.topicId)&&q.type==='single_choice'&&q.prompt?.trim()&&q.prompt.length<=1000&&!prompts.has(q.prompt.trim()),'Invalid question prompt/topic: '+group.id);
    assert(q.options?.length===4&&new Set(q.options.map(o=>o.key)).size===4&&new Set(q.options.map(o=>o.text.trim())).size===4&&q.options.every(o=>/^[a-d]$/u.test(o.key)&&o.text?.trim()&&o.text.length<=500),'Invalid choices: '+group.id);
    assert(q.options.some(o=>o.key===q.answer?.key)&&q.explanation?.trim()&&q.explanation.length<=4000&&['easy','medium','hard'].includes(q.difficulty),'Invalid answer: '+group.id);prompts.add(q.prompt.trim());
   }
   groups.push({...guide,metadata:group,sources:asset.sources||[]});
  }
 }
 assert.equal(seen.size,expected.size,'Incomplete school guide coverage');
 return {groups,catalog,manifest};
}
export async function seedSchoolSimple(run,{postgres=false,content,foundations=false}){
 const groups=content.groups.filter(guide=>Boolean(guide.metadata.foundation)===foundations),options={postgres,ignore:true};
 if(foundations){
  const [year]=await run('SELECT id FROM school_years ORDER BY is_active DESC,sort_order,id LIMIT 1');assert(year,'Missing active school year');
  const chapters=[],lessons=[],topics=[];
  for(const {metadata:g}of groups){
   chapters.push([g.chapterId,year.id,g.grade,'year',g.subjectId,g.chapterName,g.chapterId,g.sortOrder,'Ôn kiến thức · Bộ bài tự biên soạn']);
   for(const part of g.parts){topics.push([part.topicId,g.subjectId,g.grade,g.title,part.topicId,g.sortOrder]);lessons.push([part.id,g.chapterId,part.topicId,g.title,1]);}
  }
  await insertSchoolRows(run,'curriculum_chapters',['id','school_year_id','grade','semester','subject_id','name','slug','sort_order','book_label'],chapters,options);
  await insertSchoolRows(run,'topics',['id','subject_id','grade','name','slug','sort_order'],topics,options);
  await insertSchoolRows(run,'curriculum_lessons',['id','chapter_id','topic_id','name','sort_order'],lessons,options);
 }
 const existingGuides=new Set((await run('SELECT group_id FROM school_study_guides')).map(row=>row.group_id)),existingQuestions=new Set((await run("SELECT id FROM questions WHERE id LIKE 'sch2-%'")).map(row=>row.id));
 const guides=[],questions=[],answers=[],choices=[];
 for(const guide of groups){
  const {questions:bank,metadata,...body}=guide;
  if(!existingGuides.has(guide.groupId)){const json=JSON.stringify(body);guides.push([guide.groupId,json,hash(json)]);}
  for(const q of bank){
   const id='sch2-'+hash(guide.groupId+'|'+q.topicId+'|'+q.prompt).slice(0,48);if(existingQuestions.has(id))continue;existingQuestions.add(id);
   questions.push([id,q.topicId,q.type,q.prompt,q.difficulty,'published']);answers.push([id,JSON.stringify(q.answer),q.explanation]);
   for(const [index,o]of q.options.entries())choices.push([id,o.key,o.text,index+1]);
  }
 }
 await insertSchoolRows(run,'questions',['id','topic_id','type','prompt','difficulty','status'],questions,{postgres});
 await insertSchoolRows(run,'question_options',['question_id','opt_key','option_text','sort_order'],choices,{postgres});
 await insertSchoolRows(run,'question_answers',['question_id','answer_json','explanation'],answers,{postgres});
 await insertSchoolRows(run,'school_study_guides',['group_id','content_json','source_sha256'],guides,{postgres});
 const ids=groups.map(g=>g.groupId);let total=0;
 for(let offset=0;offset<ids.length;offset+=100){const batch=ids.slice(offset,offset+100);const [count]=await run(`SELECT COUNT(*) total FROM school_study_guides WHERE group_id IN (${batch.map(()=>'?').join(',')}) AND status='published'`,batch);total+=Number(count.total);}
 assert.equal(total,groups.length,'Published school guides missing');
 return {guidesAdded:guides.length,questionsAdded:questions.length,guideCoverage:total,foundations};
}
