import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadHighschoolCatalog} from './seed-highschool.mjs';
import {insertSchoolRows} from './insert-school-rows.mjs';
export async function loadHighschoolContent(){
 const catalog=await loadHighschoolCatalog(),expected=new Map(catalog.books.flatMap(book=>book.chapters.flatMap(chapter=>chapter.lessons.map(lesson=>[lesson.id,{...lesson,subjectId:book.subjectId}]))));
 const rows=[];
 for(const subjectId of [...new Set(catalog.books.map(book=>book.subjectId))]){
  const subject=JSON.parse(await fs.readFile(new URL('../../seed-data/highschool-content/'+subjectId+'.json',import.meta.url),'utf8'));
  if(subject.subjectId!==subjectId||!Array.isArray(subject.lessons)||!subject.sources?.length)throw Error('Invalid THPT subject content: '+subjectId);
  for(const lesson of subject.lessons){
   const target=expected.get(lesson.lessonId);
   if(!target||target.subjectId!==subjectId||lesson.title!==target.name)throw Error('Content does not match source lesson: '+lesson.lessonId);
   if(!lesson.objectives?.length||!lesson.sections?.length||lesson.sections.length<2||lesson.sections.some(section=>!section.heading?.trim()||!section.body?.trim())||!lesson.example?.prompt?.trim()||!lesson.example?.solution?.trim())throw Error('Incomplete theory/example: '+lesson.lessonId);
   if(lesson.questions?.length<3)throw Error('Need at least three practice questions: '+lesson.lessonId);
   const prompts=new Set();
   lesson.questions=lesson.questions.map(question=>{
    const key=question.answer?.key||question.answer?.keys?.[0];
    if(question.type!=='single_choice'||!question.prompt?.trim()||question.prompt.length>1000||prompts.has(question.prompt)||question.options?.length!==4||new Set(question.options.map(option=>option.text.trim())).size!==4||new Set(question.options.map(option=>option.key)).size!==4||question.options.some(option=>!option.text?.trim()||option.text.length>500||!/^[a-d]$/u.test(option.key))||!question.options.some(option=>option.key===key)||!question.explanation?.trim()||question.explanation.length>4000||!['easy','medium','hard'].includes(question.difficulty))throw Error('Invalid practice question: '+lesson.lessonId);
    prompts.add(question.prompt);return {...question,answer:{key}};
   });
   for(const source of subject.sources){const url=new URL(source.url);if(!['https:','http:'].includes(url.protocol)||!source.title?.trim())throw Error('Invalid reference');}
   rows.push({...lesson,subjectId,sources:subject.sources});expected.delete(lesson.lessonId);
  }
 }
 if(expected.size||rows.length!==1082)throw Error('Incomplete THPT learning content: '+expected.size+' missing');
 return rows;
}
export async function seedHighschoolContent(run,{postgres=false,rows}={}){
 rows=rows||await loadHighschoolContent();
 const existing=new Set((await run('SELECT lesson_id FROM school_lesson_materials')).map(row=>row.lesson_id));
 const questionIds=new Set((await run("SELECT id FROM questions WHERE id LIKE 'hs%' ")).map(row=>row.id));
 const questionRows=[],optionRows=[],answerRows=[],materialRows=[];
 let materials=0,questions=0;
 for(const lesson of rows){
  if(existing.has(lesson.lessonId))continue;
  const {questions:quiz,...content}=lesson;
  for(const [index,question]of quiz.entries()){
   const id=lesson.lessonId+'-q'+String(index+1).padStart(2,'0');if(questionIds.has(id))throw Error('Question identifier already in use: '+id);
   questionRows.push([id,lesson.lessonId,question.type,question.prompt,question.difficulty,'published']);
   for(const [position,option]of question.options.entries())optionRows.push([id,option.key,option.text,position+1]);
   answerRows.push([id,JSON.stringify(question.answer),question.explanation]);questions++;
  }
  const serialized=JSON.stringify(content),sha256=createHash('sha256').update(serialized).digest('hex');
  materialRows.push([lesson.lessonId,serialized,sha256]);materials++;
 }
 await insertSchoolRows(run,'questions',['id','topic_id','type','prompt','difficulty','status'],questionRows,{postgres});
 await insertSchoolRows(run,'question_options',['question_id','opt_key','option_text','sort_order'],optionRows,{postgres});
 await insertSchoolRows(run,'question_answers',['question_id','answer_json','explanation'],answerRows,{postgres});
 await insertSchoolRows(run,'school_lesson_materials',['lesson_id','content_json','source_sha256'],materialRows,{postgres});
 return {materials,questions,expectedMaterials:rows.length};
}
