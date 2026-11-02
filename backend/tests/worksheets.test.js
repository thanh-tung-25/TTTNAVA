import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createTestUser,loginStudent} from './helpers/index.js';
import {query} from '../src/config/db.js';
const base='/api/v1/worksheets';let admin,student,other,locked,sheet,attempt,empty;
const item=(type,config,answer)=>({id:randomUUID(),type,prompt:'Câu thử '+type,explanation:'Lời giải thử',config,answer});
const items=[item('fill',{}, {accepted:['78']}),item('blanks',{labels:['Ô 1','Ô 2']},{values:['18','20']}),item('choice',{options:['6','7']},{index:1}),item('compare',{}, {value:'='}),item('ordering',{tokens:['28','54','74']},{values:['28','54','74']}),item('matching',{left:['2 + 3','4 + 2'],targets:['5','6']},{values:['5','6']}),item('column',{a:24,b:55,operator:'+'},{}),item('word',{unit:'bông hoa'},{accepted:['19']}),item('drawing',{}, {})];
const answers=Object.fromEntries(items.map((i,n)=>[i.id,['78',['18','20'],1,'=',['28','54','74'],['5','6'],'79','19',{text:'Bài giải của con',drawing:''}][n]]));
describe('Interactive worksheet authoring and grading',()=>{
 beforeAll(async()=>{admin=await loginStudent(await createTestUser({username:'test_ws_admin',role:'admin'}));student=await loginStudent(await createTestUser({username:'test_ws_student'}));other=await loginStudent(await createTestUser({username:'test_ws_other'}));locked=await loginStudent(await createTestUser({username:'test_ws_locked',enrolled:false}));});
 afterAll(async()=>{for(const id of [sheet?.id,empty?.id].filter(Boolean)){await query('DELETE FROM worksheet_attempts WHERE worksheet_id=?',[id]);await query('DELETE FROM worksheets WHERE id=?',[id]);}});
 it('admin can create an empty draft and students cannot publish or access drafts',async()=>{
  const body={title:'Bộ trống kiểm thử',grade:1,subject_id:'toan',status:'draft',items:[]};
  expect((await student.post(base+'/admin').send(body)).status).toBe(403);
  const r=await admin.post(base+'/admin').send(body);expect(r.status).toBe(200);empty=r.body.data;
  expect((await student.get(base+'/'+empty.id)).status).toBe(404);
  expect((await admin.put(base+'/admin/'+empty.id).send({...empty,status:'published'})).status).toBe(400);
 });
 it('validates all item types, publishes a sheet and hides answers',async()=>{
  const r=await admin.post(base+'/admin').send({title:'Bộ bài kiểm thử',grade:1,subject_id:'toan',status:'published',items});expect(r.status).toBe(200);sheet=r.body.data;
  const publicSheet=await student.get(base+'/'+sheet.id);expect(publicSheet.status).toBe(200);expect(publicSheet.body.data.items.every(i=>!('answer'in i)&&!('explanation'in i))).toBe(true);
  expect(publicSheet.body.data.items.find(i=>i.type==='ordering').config.tokens.sort()).toEqual(['28','54','74']);
  expect((await locked.get(base+'/'+sheet.id)).status).toBe(403);expect((await locked.post(base+'/'+sheet.id+'/start')).status).toBe(403);
  expect((await locked.get(base).set('X-Course-Id','grade-1')).status).toBe(403);
 });
 it('starts once, saves answers and enforces ownership',async()=>{
  const r=await student.post(base+'/'+sheet.id+'/start');expect(r.status).toBe(200);attempt=r.body.data;
  expect((await student.post(base+'/'+sheet.id+'/start')).body.data.id).toBe(attempt.id);
  expect((await other.get(base+'/attempts/'+attempt.id)).status).toBe(404);
  expect((await student.put(base+'/attempts/'+attempt.id).send({answers})).status).toBe(200);
  const saved=(await student.get(base+'/attempts/'+attempt.id)).body.data;expect(saved.answers[items[0].id]).toBe('78');expect(saved.results).toBeNull();expect(saved.snapshot).toBeUndefined();
 });
 it('grades each cell on the server and leaves free response for the teacher',async()=>{
  const r=await student.post(base+'/attempts/'+attempt.id+'/submit').send({answers:{...answers,[items[1].id]:['18','99']}});expect(r.status).toBe(200);
  expect(r.body.data.status).toBe('pending_review');expect(r.body.data.score).toBeNull();expect(r.body.data.results.find(i=>i.id===items[1].id).checks).toEqual([true,false]);
  expect((await student.post(base+'/admin/reviews/'+attempt.id).send({marks:[]})).status).toBe(403);
  const retry=await student.post(base+'/attempts/'+attempt.id+'/submit').send({answers});expect(retry.body.data.results.find(i=>i.id===items[1].id).correct).toBe(false);
 });
 it('teacher reviews manual questions; saved attempts keep their original contents',async()=>{
  expect((await admin.post(base+'/admin/reviews/'+attempt.id).send({marks:[]})).status).toBe(400);
  const r=await admin.post(base+'/admin/reviews/'+attempt.id).send({marks:[{id:items[8].id,correct:true,comment:'Con làm tốt.'}]});expect(r.status).toBe(200);expect(r.body.data.score).toBeCloseTo(88.89);
  const result=(await student.get(base+'/attempts/'+attempt.id)).body.data;expect(result.status).toBe('completed');expect(result.results.find(i=>i.id===items[8].id).comment).toBe('Con làm tốt.');
  const edited=await admin.put(base+'/admin/'+sheet.id).send({...sheet,title:'Tên bộ mới',items:[items[0]]});expect(edited.status).toBe(200);
  expect((await student.get(base+'/attempts/'+attempt.id)).body.data.items).toHaveLength(9);
  expect((await admin.put(base+'/admin/'+sheet.id).send(sheet)).status).toBe(409);
  expect((await admin.put(base+'/admin/'+sheet.id).send({...edited.body.data,grade:2})).status).toBe(400);
 });
 it('rejects forged answers, invalid comparisons and invalid drawing uploads',async()=>{
  const preview=body=>admin.post(base+'/admin/preview').send(body);
  expect((await preview({item:items[6],answer:'79'})).body.data.correct).toBe(true);
  expect((await preview({item:items[5],answer:['5','7']})).body.data.correct).toBe(false);
  expect((await preview({item:items[8],answer:{drawing:'data:image/svg+xml,fake'}})).status).toBe(400);
  expect((await admin.post(base+'/admin').send({...sheet,items:[{...items[3],answer:{value:'evil'}}]})).status).toBe(400);
 });
 it('unified content management lists worksheets and individual questions with filters',async()=>{
  expect((await student.get('/api/v1/admin/content')).status).toBe(403);
  const list=await admin.get('/api/v1/admin/content?kind=worksheet&grade=1&q='+encodeURIComponent('Tên bộ mới'));expect(list.status).toBe(200);expect(list.body.data.some(row=>row.id===sheet.id&&row.kind==='worksheet')).toBe(true);
  const questions=await admin.get('/api/v1/admin/content?kind=question');expect(questions.status).toBe(200);expect(questions.body.pagination.total).toBeGreaterThan(0);expect(questions.body.data.every(row=>row.kind==='question'&&!('answer'in row))).toBe(true);
  expect((await admin.get('/api/v1/admin/content?grade=99')).status).toBe(400);
 });
 it('deletes unused sets; used sets are hidden while attempts stay available',async()=>{
  expect((await student.delete(base+'/admin/'+empty.id+'?version='+empty.version)).status).toBe(403);
  const removed=await admin.delete(base+'/admin/'+empty.id+'?version='+empty.version);expect(removed.status).toBe(200);expect(removed.body.data.action).toBe('deleted');expect((await admin.get(base+'/admin/'+empty.id)).status).toBe(404);
  const latest=(await admin.get(base+'/admin/'+sheet.id)).body.data;
  expect((await admin.delete(base+'/admin/'+sheet.id+'?version=1')).status).toBe(409);
  const archived=await admin.delete(base+'/admin/'+sheet.id+'?version='+latest.version);expect(archived.status).toBe(200);expect(archived.body.data.action).toBe('hidden');
  expect((await student.post(base+'/'+sheet.id+'/start')).status).toBe(404);expect((await student.get(base+'/attempts/'+attempt.id)).status).toBe(200);
 });
});
