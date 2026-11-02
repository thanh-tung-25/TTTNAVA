import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {extractDocxQuestions} from '../src/services/docx-import-service.js';
import {validateQuestionPayload} from '../src/services/admin-question-validation.js';
import {importQuestionsSchema} from '../src/validators/admin-question.js';
import {importQuestionDrafts} from '../src/services/admin-question-create.js';
import {query,closePool} from '../src/config/db.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(root,'backend/backups/generated-primary-50-manifest.json'),'utf8'));
const apply=process.argv.includes('--apply');
const results=[];
try{
 if(manifest.length!==304||manifest.some(item=>item.grade<2||item.grade>5||item.questions.length!==50))throw new Error('Invalid manifest');
 for(const item of manifest){
  const file=path.resolve(root,item.file);if(!file.startsWith(path.join(root,'tai-lieu')+path.sep))throw new Error('Unexpected source path');
  const buffer=await fs.readFile(file);
  if(createHash('sha256').update(buffer).digest('hex')!==item.sha256)throw new Error('Source changed: '+item.file);
  const extracted=await extractDocxQuestions(buffer,path.basename(file));
  if(extracted.questions.length!==50||extracted.issues?.length||extracted.extractionWarnings?.length)throw new Error('Word parsing failed: '+item.file+' '+JSON.stringify(extracted.issues));
  for(const [index,q]of extracted.questions.entries()){
   validateQuestionPayload(q.type,q);
   for(const field of ['type','prompt','options','answer','explanation','difficulty'])if(JSON.stringify(q[field])!==JSON.stringify(item.questions[index][field]))throw new Error('Round-trip mismatch: '+item.file+' question '+(index+1)+' '+field);
  }
  importQuestionsSchema.parse({lessonId:item.lessonId,grade:item.grade,subjectId:'toan',semester:item.semester,questions:extracted.questions});
 }
 console.log(JSON.stringify({validatedWordFiles:manifest.length,validatedQuestions:manifest.length*50,roundTripMatches:true}));
 if(apply){
  const [{db}]=await query('SELECT DATABASE() db');if(db!=='kids_learning')throw new Error('Unexpected database');
  const [admin]=await query("SELECT id FROM profiles WHERE username='admin' AND role='admin'");if(!admin)throw new Error('Admin not found');
  const beforeGrade1=await query("SELECT q.id,q.status,q.import_document_id FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade=1 ORDER BY q.id");
  await fs.writeFile(path.join(root,'backend/backups/grade1-before-generated-primary.json'),JSON.stringify(beforeGrade1,null,2));
  for(const item of manifest){
   const filename=path.basename(item.file);
   const existing=await query('SELECT id,question_count FROM word_import_documents WHERE lesson_id=? AND filename=? AND SHA2(original,256)=?',[item.lessonId,filename,item.sha256]);
   if(existing.length){results.push({lessonId:item.lessonId,documentId:existing[0].id,skipped:true});continue;}
   const [counts]=await query('SELECT COUNT(*) n FROM questions WHERE topic_id=(SELECT topic_id FROM curriculum_lessons WHERE id=?)',[item.lessonId]);
   if(Number(counts.n))throw new Error('Lesson already has questions; stopped to avoid duplication: '+item.lessonId);
   const buffer=await fs.readFile(path.resolve(root,item.file));
   const payload=importQuestionsSchema.parse({lessonId:item.lessonId,grade:item.grade,subjectId:'toan',semester:item.semester,questions:item.questions});
   const result=await importQuestionDrafts(admin.id,payload,{originalname:filename,buffer});
   results.push({grade:item.grade,lessonId:item.lessonId,filename,sha256:item.sha256,...result});
   await fs.writeFile(path.join(root,'backend/backups/generated-primary-50-import-results.json'),JSON.stringify({updatedAt:new Date().toISOString(),results},null,2));
   if(results.length%25===0)console.log(JSON.stringify({processed:results.length,total:manifest.length}));
  }
  const afterGrade1=await query("SELECT q.id,q.status,q.import_document_id FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade=1 ORDER BY q.id");
  if(JSON.stringify(beforeGrade1)!==JSON.stringify(afterGrade1))throw new Error('Grade 1 changed unexpectedly');
  console.log(JSON.stringify({importedFiles:results.filter(r=>!r.skipped).length,createdQuestions:results.reduce((sum,r)=>sum+(r.created||0),0),grade1Unchanged:true}));
 }
}finally{await closePool();}
