// Defaults to a read-only plan. --apply is restricted to local MySQL.
// --export-word creates reviewable teacher documents outside public web assets.
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import env from '../src/config/env.js';
import {query,closePool,withTransaction} from '../src/config/db.js';
import {json} from '../src/repositories/chinese.js';
import {speakingLessonBanks} from '../src/data/chinese-speaking-lessons-1-6.js';
import {planSpeakingQuestionBank,replaceSpeakingQuestionBank,speakingBankFingerprint} from '../src/services/chinese-speaking-question-bank.js';
import {extractChinese} from '../src/services/chinese-import.js';

const args=process.argv.slice(2),apply=args.includes('--apply');
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function exportWord(){
 const require=createRequire(import.meta.url),Zip=createRequire(require.resolve('mammoth'))('jszip');
 const root=new URL('../../tai-lieu/tieng-trung-luyen-noi/',import.meta.url);await mkdir(root,{recursive:true});
 const review=['# Luyện nói HSK 1 — 6 bài, 60 câu hỏi','', 'Bản dành cho giáo viên. Nghĩa, đáp án tham khảo và tiêu chí được ẩn với học sinh trước khi chấm. Đáp án mẫu không phải đáp án duy nhất.',''];
 for(const pack of speakingLessonBanks){
  const zip=new Zip(),paragraphs=['MÔN: Tiếng Trung','HSK: 1',`CHỦ ĐỀ: Bài ${pack.lesson} — ${pack.topic}`,'[LUYEN NOI]'];
  review.push(`## Bài ${pack.lesson} — ${pack.topic}`,'');
  pack.questions.forEach((q,n)=>{
   paragraphs.push(`Câu ${n+1}. ${q.text}`,`Nghĩa: ${q.meaning}`,`Đáp án tham khảo: ${q.answer_reference}`,`Tiêu chí chấm: ${q.assessment_notes}`);
   review.push(`### ${n+1}. ${q.text}`,'',q.meaning,'',`Tham khảo: ${q.answer_reference}`,'',`Tiêu chí: ${q.assessment_notes}`,'');
  });
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml','<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paragraphs.map(text=>'<w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>').join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>');
  const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
  const parsed=await extractChinese(buffer,{destination:'speaking'});
  assert.deepEqual(parsed.items.map(item=>item.data),pack.questions.map(q=>({practice:'speaking',...q})),`Word round-trip mismatch: lesson ${pack.lesson}`);
  await writeFile(new URL(`luyen-noi-bai-${pack.lesson}.docx`,root),buffer);
 }
 await writeFile(new URL('cau-hoi-va-tieu-chi.md',root),review.join('\n'),'utf8');
 console.log('Đã xuất và đọc lại đủ 6 file Word / 60 câu; bản duyệt tại tai-lieu/tieng-trung-luyen-noi/cau-hoi-va-tieu-chi.md.');
}

try{
 if(args.some(arg=>!['--apply','--export-word'].includes(arg)))throw Error('Cách dùng: node backend/scripts/replace-chinese-speaking-lessons-1-6.mjs [--export-word] [--apply]');
 if(env.isProduction||env.db.driver!=='mysql'||!['127.0.0.1','localhost','::1'].includes(env.db.host))throw Error('Script này chỉ được dùng với MySQL cục bộ, không kết nối database online.');
 for(const pack of speakingLessonBanks)planSpeakingQuestionBank([],pack,null);
 if(args.includes('--export-word'))await exportWord();
 const targets=[],backup=[];
 for(const pack of speakingLessonBanks){
  const rows=await query(`SELECT s.id,s.title,s.status,s.speaking_settings,l.id lesson_id FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id JOIN chinese_documents d ON d.id=s.document_id WHERE l.level_id=1 AND l.position=? AND l.status='published' AND s.status='published' AND d.filename=?`,[pack.lesson,`cau-hoi-tu-vung-tieng-trung-bai-${pack.lesson}.docx`]);
  if(rows.length!==1)throw Error(`Bài ${pack.lesson}: cần đúng một bộ nguồn đã xuất bản, tìm thấy ${rows.length}.`);
  const set=rows[0],items=(await query('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id',[set.id])).map(item=>({...item,data:json(item.data)}));
  targets.push({pack,setId:set.id,fingerprint:speakingBankFingerprint(set,items)});
  backup.push({lesson:pack.lesson,set_id:set.id,lesson_id:set.lesson_id,speaking_settings:json(set.speaking_settings),items:items.filter(i=>i.kind==='dialogue'&&i.data.practice==='speaking')});
 }
 let backupPath;
 if(apply){
  const name='chinese-speaking-lessons-1-6-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  await mkdir(new URL('../backups/',import.meta.url),{recursive:true});
  await writeFile(new URL('../backups/'+name,import.meta.url),JSON.stringify({created_at:new Date().toISOString(),sections:backup},null,2),'utf8');
  backupPath='backend/backups/'+name;
 }
 const report=await withTransaction(async c=>{
  const results=[];
  for(const target of targets)results.push({lesson:target.pack.lesson,...await replaceSpeakingQuestionBank(target.setId,{pack:target.pack,apply,expectedFingerprint:target.fingerprint},c)});
  return results;
 });
 console.log(JSON.stringify({mode:apply?'applied-local':'dry-run',backup:backupPath,lessons:report.map(({fingerprint,...r})=>r)},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await closePool();}
