import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {createTestUser,loginStudent} from './helpers/index.js';
import {query} from '../src/config/db.js';
import {extractChinese} from '../src/services/chinese-import.js';
import {normalizeAnswer} from '../src/validators/chinese.js';
let admin,student,other,lesson,a,b,word,q,attempt;const testIds=[];
const base='/api/v1/chinese';
const file=fs.readFileSync(new URL('../../frontend/assets/templates/chinese-template.docx',import.meta.url));
describe('Chinese isolated learning path',()=>{
 beforeAll(async()=>{admin=await loginStudent(await createTestUser({role:'admin'}));student=await loginStudent(await createTestUser());other=await loginStudent(await createTestUser());});
 afterAll(async()=>{
  if(!lesson)return;
  for(const id of testIds){await query('DELETE FROM chinese_attempts WHERE test_id=?',[id]);await query('DELETE FROM chinese_tests WHERE id=?',[id]);}
  const sets=await query('SELECT id,document_id FROM chinese_sets WHERE lesson_id=?',[lesson]);
  for(const s of sets){await query('DELETE FROM chinese_attempts WHERE set_id=?',[s.id]);await query('DELETE FROM chinese_progress WHERE set_id=?',[s.id]);
   const items=await query('SELECT id FROM chinese_items WHERE set_id=?',[s.id]);
   for(const i of items){await query('DELETE FROM chinese_review_events WHERE item_id=?',[i.id]);await query('DELETE FROM chinese_reviews WHERE item_id=?',[i.id]);}
   await query('DELETE FROM chinese_items WHERE set_id=?',[s.id]);await query('DELETE FROM chinese_sets WHERE id=?',[s.id]);await query('DELETE FROM chinese_documents WHERE id=?',[s.document_id]);}
  await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);
 });
 it('parses Word tables, preserves unknown content and tone marks',async()=>{const r=await extractChinese(file);expect(r.items.find(i=>i.kind==='vocabulary').data.hanzi).toBe('你好');expect(r.items.some(i=>i.kind==='unknown')).toBe(true);expect(normalizeAnswer(' NǏ   HǍO ')).toBe('nǐ hǎo');expect(normalizeAnswer('ni hao')).not.toBe(normalizeAnswer('nǐ hǎo'));});
 it('enforces admin role and creates a draft lesson independent of grade',async()=>{
  const body={level_id:1,title:'Chinese acceptance '+randomUUID(),position:1,description:'',image_url:'',status:'draft'};
  expect((await student.post(base+'/lessons').send(body)).status).toBe(403);
  const res=await admin.post(base+'/lessons').send(body);expect(res.status).toBe(200);lesson=res.body.data.id;
 });
 it('stores a Word document above 16 MB and rejects uploads above 20 MB',async()=>{
  const require=createRequire(import.meta.url),JSZip=createRequire(require.resolve('mammoth'))('jszip');
  const zip=await JSZip.loadAsync(file);zip.file('word/unused.bin',Buffer.alloc(17*1024*1024));
  const large=await zip.generateAsync({type:'nodebuffer',compression:'STORE'});
  const res=await admin.post(base+'/imports').field('level_id','1').field('lesson_id',lesson).field('title','Large Word').field('allow_duplicate','true').attach('file',large,'large.docx');expect(res.status).toBe(200);
  const detail=(await admin.get(base+'/sets/'+res.body.data.id)).body.data;
  const stored=await query('SELECT OCTET_LENGTH(original) bytes FROM chinese_documents WHERE id=?',[detail.set.document_id]);expect(stored[0].bytes).toBe(large.length);
  const oversized=await admin.post(base+'/imports').attach('file',Buffer.alloc(20*1024*1024+1),'too-large.docx');expect(oversized.status).toBe(413);
 });
 it('imports separate sets, warns on duplicate and never merges',async()=>{
  const upload=()=>admin.post(base+'/imports').field('level_id','1').field('lesson_id',lesson).field('title','Source A').attach('file',file,'A.docx');
  const res=await upload().field('allow_duplicate','true');expect(res.status).toBe(200);a=res.body.data.id;
  expect((await upload()).status).toBe(409);
  const second=await admin.post(base+'/imports').field('level_id','1').field('lesson_id',lesson).field('title','Source B').field('allow_duplicate','true').attach('file',file,'B.docx');expect(second.status).toBe(200);b=second.body.data.id;expect(a).not.toBe(b);
  const sa=(await admin.get(base+'/sets/'+a)).body.data,sb=(await admin.get(base+'/sets/'+b)).body.data;
  expect(sa.set.document_id).not.toBe(sb.set.document_id);expect(sa.items.every(i=>!sb.items.some(j=>j.id===i.id))).toBe(true);
  expect((await student.get(base+'/sets/'+a)).status).toBe(404);
  expect((await student.get(base+'/documents/'+sa.set.document_id)).status).toBe(403);
  expect((await admin.put(base+'/sets/'+a).send({title:'A',status:'published',items:sa.items})).status).toBe(400);
 });
 it('publishes reviewed content and hides answers in student APIs',async()=>{
  const sa=(await admin.get(base+'/sets/'+a)).body.data;
  const items=sa.items.filter(i=>i.kind!=='unknown').map(i=>({...i,data:{...i.data,...(i.kind==='question'?{approved:true}:{})}}));
  expect((await admin.put(base+'/sets/'+a).send({title:'A',status:'published',items})).status).toBe(200);
  expect((await student.get(base+'/sets/'+a)).status).toBe(404);
  expect((await admin.put(base+'/lessons/'+lesson).send({level_id:1,title:'Lesson',position:1,description:'',image_url:'',status:'published'})).status).toBe(200);
  const s=(await student.get(base+'/sets/'+a)).body.data;word=s.items.find(i=>i.kind==='vocabulary');q=s.items.find(i=>i.kind==='question');
  expect(q.data.accepted).toBeUndefined();expect(q.data.explanation).toBeUndefined();expect((await student.get(base+'/sets/'+b)).status).toBe(404);
  expect((await admin.put(base+'/sets/'+b).send({title:'Cross set',status:'draft',items:[word]})).status).toBe(400);
 });
 it('persists reviews per student with idempotent concurrent requests',async()=>{
  const event={event_id:randomUUID(),memory:'remembered'};
  const res=await Promise.all([student.put(base+'/reviews/'+word.id).send(event),student.put(base+'/reviews/'+word.id).send(event)]);expect(res.every(r=>r.status===200)).toBe(true);
  const rows=(await student.get(base+'/notebook')).body.data;expect(rows.find(r=>r.id===word.id).review_count).toBe(1);expect(rows.find(r=>r.id===word.id).next_review).toBeTruthy();
  expect((await other.get(base+'/notebook')).body.data.length).toBe(0);
  expect((await student.put(base+'/sets/'+a+'/progress').send({last_item:word.id,read_items:[]})).status).toBe(200);
  const content=(await student.get(base+'/sets/'+a)).body.data.items.filter(i=>['grammar','reading','dialogue'].includes(i.kind));
  await Promise.all(content.slice(0,2).map(i=>student.put(base+'/sets/'+a+'/progress').send({last_item:i.id,read_items:[i.id]})));
  const p=(await student.get(base+'/sets/'+a)).body.data.progress;expect(JSON.parse(p.read_items)).toHaveLength(2);
  const overview=(await student.get(base+'/catalog')).body.data;expect(overview.completion.find(c=>c.set_id===a).done).toBe(3);
  const stats=(await admin.get(base+'/stats?set_id='+a)).body.data;expect(stats.progress[0].percent).toBe(50);expect(stats.progress[0].learned_words).toBe(1);
 });
 it('snapshots grading, locks answers once, hides uncommitted answers and protects ownership',async()=>{
  const res=await student.post(base+'/attempts').send({set_id:a});expect(res.status).toBe(200);attempt=res.body.data;
  expect(attempt.items[0].data.accepted).toBeUndefined();expect((await other.get(base+'/attempts/'+attempt.id)).status).toBe(404);
  const before=await student.post(base+'/attempts/'+attempt.id+'/answers').send({item_id:q.id,value:'Xin chào',lock:false});expect(before.body.data.items.find(i=>i.id===q.id).result).toBeUndefined();
  const sa=(await admin.get(base+'/sets/'+a)).body.data;sa.items.find(i=>i.id===q.id).data.accepted=['Tạm biệt'];
  expect((await admin.put(base+'/sets/'+a).send({title:'Edited',status:'published',items:sa.items})).status).toBe(200);
  const locked=await Promise.all([student.post(base+'/attempts/'+attempt.id+'/answers').send({item_id:q.id,value:'Xin chào',lock:true}),student.post(base+'/attempts/'+attempt.id+'/answers').send({item_id:q.id,value:'Xin chào',lock:true})]);
  expect(locked[0].body.data.items.find(i=>i.id===q.id).result.correct).toBe(true);
  const changed=await student.post(base+'/attempts/'+attempt.id+'/answers').send({item_id:q.id,value:'Tạm biệt',lock:true});expect(changed.body.data.items.find(i=>i.id===q.id).result.value).toBe('Xin chào');
  const done=await student.post(base+'/attempts/'+attempt.id+'/finish');expect(done.body.data.score).toBe(50);
  const repeated=await student.post(base+'/attempts/'+attempt.id+'/finish');expect(repeated.body.data.score).toBe(50);
  expect((await student.get(base+'/history')).body.data.filter(h=>h.id===attempt.id).length).toBe(1);
 });
 it('expires timed tests on the server and honors archived parent visibility',async()=>{
  const t=await admin.post(base+'/tests').send({title:'Timed',set_ids:[a],duration_seconds:30,pass_percent:70,status:'published'});expect(t.status).toBe(200);testIds.push(t.body.data.id);
  const start=await student.post(base+'/attempts').send({test_id:t.body.data.id});expect(start.status).toBe(200);
  await query('UPDATE chinese_attempts SET ends_at=DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE id=?',[start.body.data.id]);
  const late=await student.post(base+'/attempts/'+start.body.data.id+'/answers').send({item_id:q.id,value:'Tạm biệt',lock:true});expect(late.body.data.finished_at).toBeTruthy();expect(late.body.data.score).toBe(0);
  await admin.put(base+'/lessons/'+lesson).send({level_id:1,title:'Archived',position:1,description:'',image_url:'',status:'archived'});
  expect((await student.get(base+'/sets/'+a)).status).toBe(404);expect((await student.get(base+'/tests')).body.data.some(row=>row.id===t.body.data.id)).toBe(false);
 });
});
