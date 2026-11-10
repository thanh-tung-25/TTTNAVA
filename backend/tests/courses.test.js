import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createTestUser,loginStudent} from './helpers/index.js';
import {query} from '../src/config/db.js';
const base='/api/v1/courses';let admin,student,other,user,saved,order,lesson,set,item,attempt;
describe('Course purchases and enforced access',()=>{
 beforeAll(async()=>{
  user=await createTestUser({username:'test_course_locked',enrolled:false});student=await loginStudent(user);
  other=await loginStudent(await createTestUser({username:'test_course_other',enrolled:false}));
  admin=await loginStudent(await createTestUser({username:'test_course_admin',role:'admin'}));
  saved=await query("SELECT * FROM courses WHERE id IN ('grade-2','hsk-1')");
  lesson=randomUUID();set=randomUUID();item=randomUUID();attempt=randomUUID();
  await query("INSERT INTO chinese_lessons(id,level_id,title,status) VALUES (?,1,'Access fixture','published')",[lesson]);
  await query("INSERT INTO chinese_sets(id,lesson_id,title,status) VALUES (?,?,'Access set','published')",[set,lesson]);
  await query("INSERT INTO chinese_items(id,set_id,kind,data) VALUES (?,?,'vocabulary',?)",[item,set,JSON.stringify({hanzi:'你好',meaning:'Chào'})]);
  await query('INSERT INTO chinese_attempts(id,student_id,set_id,snapshot,answers) VALUES (?,?,?,?,?)',[attempt,user.id,set,JSON.stringify({title:'Locked quiz',pass:70,items:[{id:item,set_id:set,kind:'question',data:{prompt:'secret',accepted:['secret'],approved:true}}]}),'{}']);
 });
 afterAll(async()=>{
  await query('DELETE FROM chinese_attempts WHERE id=?',[attempt]);await query('DELETE FROM chinese_items WHERE id=?',[item]);await query('DELETE FROM chinese_sets WHERE id=?',[set]);await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);
  for(const c of saved)await query('UPDATE courses SET price_vnd=?,duration_days=?,payment_instructions=?,active=? WHERE id=?',[c.price_vnd,c.duration_days,c.payment_instructions,c.active,c.id]);
 });
 it('new students see all eighteen courses but have no rights; APIs and direct pages block',async()=>{
  const catalog=await student.get(base);expect(catalog.status).toBe(200);expect(catalog.body.data).toHaveLength(18);expect(catalog.body.data.every(c=>!c.unlocked)).toBe(true);
  expect((await student.get(base+'/grade-2/access')).status).toBe(403);
  expect((await student.get('/pages/student/home/')).headers.location).toBe('/pages/student/courses/');
  expect((await student.get('/api/v1/catalog/topics?subjectId=toan&grade=2')).status).toBe(403);
  const [topic]=await query('SELECT id FROM topics WHERE grade=2 LIMIT 1');
  expect((await student.post('/api/v1/practice').send({topicId:topic.id})).status).toBe(403);
  expect((await student.post('/api/v1/exams').send({topicId:topic.id})).status).toBe(403);
  expect((await student.post('/api/v1/challenges/robot').send({topicId:topic.id,durationSeconds:300,botLevel:'easy'})).status).toBe(403);
 });
 it('Chinese content, flashcard answers, progress, attempts and notebook respect enrollment',async()=>{
  expect((await student.get('/api/v1/chinese/sets/'+set)).status).toBe(403);
  expect((await student.get('/api/v1/chinese/sets/'+set+'/study/'+item)).status).toBe(403);
  expect((await student.put('/api/v1/chinese/sets/'+set+'/progress').send({last_item:item,read_items:[]})).status).toBe(403);
  expect((await student.put('/api/v1/chinese/reviews/'+item).send({event_id:randomUUID(),memory:'remembered'})).status).toBe(403);
  expect((await student.get('/api/v1/chinese/attempts/'+attempt)).status).toBe(403);
  expect((await student.post('/api/v1/chinese/attempts').send({set_id:set})).status).toBe(403);
  expect((await student.get('/api/v1/chinese/catalog')).body.data.sets).toHaveLength(0);
  expect((await student.get('/api/v1/chinese/notebook')).body.data).toHaveLength(0);
 });
 it('students cannot set prices, approve purchases or grant rights',async()=>{
  expect((await student.get(base+'/admin/catalog')).status).toBe(403);
  expect((await student.post(base+'/admin/access').send({})).status).toBe(403);
  expect((await student.post(base+'/admin/orders/'+randomUUID()+'/review').send({decision:'approved'})).status).toBe(403);
 });
 it('requires payment setup and freezes server price and duration',async()=>{
  await query("UPDATE courses SET payment_instructions='' WHERE id='grade-2'");
  const body={course_id:'grade-2',payer_name:'Phụ huynh',payment_reference:'TEST-REF-1',amount_vnd:1,duration_days:1};
  expect((await student.post(base+'/orders').send(body)).status).toBe(409);
  await query("UPDATE courses SET price_vnd=250000,duration_days=NULL,payment_instructions='Test only' WHERE id='grade-2'");
  const result=await student.post(base+'/orders').send(body);expect(result.status).toBe(200);order=result.body.data.id;
  const [row]=await query('SELECT * FROM course_orders WHERE id=?',[order]);expect(row.amount_vnd).toBe(250000);expect(row.duration_days).toBeNull();
  expect((await student.get(base+'/grade-2/access')).status).toBe(403);
  expect((await student.post(base+'/orders').send(body)).status).toBe(409);
  expect((await other.post(base+'/orders/'+order+'/cancel')).status).toBe(409);
 });
 it('admin approval opens exactly the paid course once, using the original order',async()=>{
  await query("UPDATE courses SET price_vnd=999999,duration_days=3 WHERE id='grade-2'");
  const results=await Promise.all([1,2].map(()=>admin.post(base+'/admin/orders/'+order+'/review').send({decision:'approved',note:'Đã đối soát TEST-REF-1'})));
  expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  const [access]=await query('SELECT * FROM course_enrollments WHERE student_id=? AND course_id=?',[user.id,'grade-2']);expect(access.expires_at).toBeNull();
  expect((await student.get(base+'/grade-2/access')).status).toBe(200);expect((await student.get(base+'/grade-3/access')).status).toBe(403);
  expect((await student.get('/api/v1/catalog/topics?subjectId=toan&grade=2')).status).toBe(200);
  expect((await student.get('/pages/student/home/').set('Cookie','ttnava_course=grade-2')).status).toBe(200);
  const [count]=await query("SELECT COUNT(*) total FROM course_access_audit WHERE student_id=? AND action='approved'",[user.id]);expect(count.total).toBe(1);
 });
 it('revoke and expiry block access again without deleting history',async()=>{
  expect((await admin.post(base+'/admin/access').send({username:user.username,course_id:'grade-2',action:'revoke',note:'Test thu hồi'})).status).toBe(200);
  expect((await student.get(base+'/grade-2/access')).status).toBe(403);
  expect((await admin.post(base+'/admin/access').send({username:user.username,course_id:'hsk-1',action:'grant',duration_days:1,note:'Test cấp HSK'})).status).toBe(200);
  expect((await student.get('/api/v1/chinese/sets/'+set)).status).toBe(200);
  expect((await student.get('/api/v1/chinese/attempts/'+attempt)).status).toBe(200);
  expect((await student.get(base+'/hsk-2/access')).status).toBe(403);
  await query("UPDATE course_enrollments SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE student_id=? AND course_id='hsk-1'",[user.id]);
  expect((await student.get('/api/v1/chinese/sets/'+set)).status).toBe(403);
  expect((await student.get('/api/v1/chinese/attempts/'+attempt)).status).toBe(403);
  expect((await student.get('/api/v1/chinese/history')).body.data.some(a=>a.id===attempt)).toBe(true);
 });
 it('rejected requests remain locked and students can cancel and send another request',async()=>{
  const body={course_id:'grade-2',payer_name:'Phụ huynh',payment_reference:'TEST-REF-2'};
  let result=await student.post(base+'/orders').send(body);const first=result.body.data.id;
  expect((await student.post(base+'/orders/'+first+'/cancel')).status).toBe(200);
  result=await student.post(base+'/orders').send(body);const second=result.body.data.id;
  expect((await admin.post(base+'/admin/orders/'+second+'/review').send({decision:'rejected',note:'Chưa thấy giao dịch'})).status).toBe(200);
  expect((await student.get(base+'/grade-2/access')).status).toBe(403);
  expect((await student.get(base+'/orders')).body.data.some(o=>o.id===second&&o.review_note==='Chưa thấy giao dịch')).toBe(true);
 });
});
