import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {extractDocxQuestions} from '../src/services/docx-import-service.js';
import {validateQuestionPayload} from '../src/services/admin-question-validation.js';
import {importQuestionsSchema} from '../src/validators/admin-question.js';
import {importQuestionDrafts} from '../src/services/admin-question-create.js';
import {query,closePool} from '../src/config/db.js';

// Generate first with build-primary-english-bank.py. Default is validation only.
const root=fileURLToPath(new URL('../../',import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(root,'backend/backups/english-primary-manifest.json'),'utf8'));
const results=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
try {
  if(manifest.length!==135 || manifest.some(x=>![1,2,3,4,5].includes(x.grade) || x.subjectId!=='tieng-anh' || x.questions.length!==50))throw new Error('Invalid manifest');
  for(const item of manifest){
    const file=path.resolve(root,item.file);
    if(!file.startsWith(path.join(root,'tai-lieu','tieng-anh-lop-1-den-5-50-cau')+path.sep))throw new Error('Unexpected source path');
    const buffer=await fs.readFile(file);
    if(hash(buffer)!==item.sha256)throw new Error('Word file changed: '+item.file);
    const extracted=await extractDocxQuestions(buffer,path.basename(file));
    if(extracted.questions.length!==50 || extracted.issues?.length || extracted.extractionWarnings?.length)throw new Error('Word parsing failed: '+item.file+' '+JSON.stringify(extracted.issues));
    for(const [index,q] of extracted.questions.entries()){
      validateQuestionPayload(q.type,q);
      for(const field of ['type','prompt','options','answer','explanation','difficulty']){
        if(JSON.stringify(q[field])!==JSON.stringify(item.questions[index][field]))throw new Error(`Word mismatch: ${item.file}, question ${index+1}, ${field}`);
      }
    }
    importQuestionsSchema.parse({lessonId:item.lessonId,grade:item.grade,subjectId:'tieng-anh',semester:item.semester,questions:extracted.questions});
  }
  console.log(JSON.stringify({validatedFiles:manifest.length,validatedQuestions:manifest.length*50,wordRoundTripMatches:true}));
  if(process.argv.includes('--apply')){
    const [{db}]=await query('SELECT DATABASE() db');
    if(db!=='kids_learning')throw new Error('Unexpected target database');
    const [admin]=await query("SELECT id FROM profiles WHERE username='admin' AND role='admin'");
    if(!admin)throw new Error('Admin not found');
    const unchangedSql="SELECT q.id,q.status,q.import_document_id FROM questions q WHERE q.topic_id NOT LIKE 'gs-en-%' ORDER BY q.id";
    const before=await query(unchangedSql);
    await fs.writeFile(path.join(root,'backend/backups/before-english-primary-import.json'),JSON.stringify(before));
    // Preflight every destination before the first write; reruns skip matching archives.
    for(const item of manifest){
      const matching=await query('SELECT id FROM word_import_documents WHERE lesson_id=? AND filename=? AND SHA2(original,256)=?',[item.lessonId,path.basename(item.file),item.sha256]);
      if(matching.length)continue;
      const [row]=await query('SELECT l.id,COUNT(q.id) n FROM curriculum_lessons l LEFT JOIN questions q ON q.topic_id=l.topic_id WHERE l.id=? GROUP BY l.id',[item.lessonId]);
      if(!row || Number(row.n))throw new Error('Missing or non-empty destination: '+item.lessonId);
    }
    for(const item of manifest){
      const filename=path.basename(item.file);
      const matching=await query('SELECT id FROM word_import_documents WHERE lesson_id=? AND filename=? AND SHA2(original,256)=?',[item.lessonId,filename,item.sha256]);
      if(matching.length){results.push({lessonId:item.lessonId,documentId:matching[0].id,skipped:true});continue;}
      const buffer=await fs.readFile(path.resolve(root,item.file));
      const payload=importQuestionsSchema.parse({lessonId:item.lessonId,grade:item.grade,subjectId:'tieng-anh',semester:item.semester,questions:item.questions});
      const {ids,...result}=await importQuestionDrafts(admin.id,payload,{originalname:filename,buffer});
      results.push({lessonId:item.lessonId,filename,sha256:item.sha256,...result});
      await fs.writeFile(path.join(root,'backend/backups/english-primary-import-results.json'),JSON.stringify({updatedAt:new Date().toISOString(),results},null,2));
    }
    if(JSON.stringify(before)!==JSON.stringify(await query(unchangedSql)))throw new Error('Existing question data changed');
    const stored=await query("SELECT l.id,COUNT(q.id) n,SUM(q.status='draft') drafts,COUNT(DISTINCT d.id) files FROM curriculum_lessons l LEFT JOIN questions q ON q.topic_id=l.topic_id LEFT JOIN word_import_documents d ON d.id=q.import_document_id WHERE l.id LIKE 'gs-en-%' GROUP BY l.id");
    if(stored.length!==135 || stored.some(r=>Number(r.n)!==50 || Number(r.files)!==1))throw new Error('Stored bank does not match manifest');
    console.log(JSON.stringify({importedFiles:results.filter(r=>!r.skipped).length,createdQuestions:results.reduce((s,r)=>s+(r.created||0),0),storedFiles:stored.length,storedQuestions:stored.reduce((s,r)=>s+Number(r.n),0),drafts:stored.reduce((s,r)=>s+Number(r.drafts),0),existingQuestionsUnchanged:true}));
  }
} finally {await closePool();}
