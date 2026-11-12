// Default: inspect only. --apply is deliberately limited to the local database.
import env from '../src/config/env.js';
import {query,closePool,withTransaction} from '../src/config/db.js';
import {supplementVocabulary} from '../src/services/chinese-vocabulary-supplement.js';

const args=process.argv.slice(2),apply=args.includes('--apply');
try{
 if(args.some(arg=>arg!=='--apply'))throw Error('Cách dùng: node backend/scripts/supplement-chinese-lessons-1-2.mjs [--apply]');
 if(apply&&(env.isProduction||env.db.driver!=='mysql'||!['127.0.0.1','localhost','::1'].includes(env.db.host)))throw Error('--apply chỉ được dùng với cơ sở dữ liệu MySQL cục bộ.');
 const targets=[];
 for(const [lesson,expectedCount] of [[1,79],[2,100]]){
  const rows=await query(`SELECT s.id,l.position,d.filename FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id JOIN chinese_documents d ON d.id=s.document_id WHERE l.level_id=1 AND l.position=? AND l.status='published' AND s.status='published' AND d.filename=?`,[lesson,`cau-hoi-tu-vung-tieng-trung-bai-${lesson}.docx`]);
  if(rows.length!==1)throw Error(`Bài ${lesson}: cần đúng một tài liệu nguồn đã xuất bản, tìm thấy ${rows.length}.`);
  targets.push({lesson,expectedCount,setId:rows[0].id});
 }
 // Validate both banks before adding anything; applying both is atomic.
 for(const target of targets)await supplementVocabulary(target.setId,{expectedCount:target.expectedCount});
 const report=await withTransaction(async connection=>{
  const rows=[];
  for(const target of targets)rows.push({lesson:target.lesson,...await supplementVocabulary(target.setId,{apply,expectedCount:target.expectedCount},connection)});
  return rows;
 });
 console.log(JSON.stringify({mode:apply?'applied-local':'dry-run',lessons:report},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await closePool();}
