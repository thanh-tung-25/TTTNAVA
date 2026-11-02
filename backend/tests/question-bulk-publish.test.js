import {beforeAll,afterAll,it,expect} from 'vitest';
import {createTestUser,loginStudent} from './helpers/index.js';
import {query} from '../src/config/db.js';
let admin,student,adminId,ids=[],drafts=[],hidden,other,published;
const endpoint='/api/v1/admin/content/publish-questions',lessonId='kntt-toan-4-b01';
beforeAll(async()=>{
 const user=await createTestUser({username:'test_bulk_admin',role:'admin'});adminId=user.id;admin=await loginStudent(user);student=await loginStudent(await createTestUser({username:'test_bulk_student'}));
 async function create(scope=lessonId,status='draft'){
  const response=await admin.post('/api/v1/admin/questions').send({lessonId:scope,type:'fill_in',prompt:'Bulk publish test: 1 + 1 = ?',options:[],answer:{accepted:['2']},explanation:'1 + 1 = 2',difficulty:'easy',status});
  expect(response.status).toBe(201);ids.push(response.body.data.id);return response.body.data.id;
 }
 for(let n=0;n<25;n++)drafts.push(await create());
 hidden=await create(lessonId,'hidden');published=await create(lessonId,'published');other=await create('kntt-toan-4-b02');
});
afterAll(async()=>{for(const id of ids)await query('DELETE FROM questions WHERE id=?',[id]);});
it('requires admin and an existing exact lesson',async()=>{
 expect((await student.post(endpoint).send({lessonId})).status).toBe(403);
 expect((await admin.post(endpoint).send({})).status).toBe(400);
 expect((await admin.post(endpoint).send({lessonId:'missing'})).status).toBe(404);
});
it('invalid drafts prevent partial publishing',async()=>{
 await query("UPDATE question_answers SET explanation='' WHERE question_id=?",[drafts.at(-1)]);
 const r=await admin.post(endpoint).send({lessonId});expect(r.status).toBe(400);expect(r.body.error.code).toBe('BULK_PUBLISH_INVALID');
 const rows=await query('SELECT status FROM questions WHERE id IN (?)',[drafts]);expect(rows.every(q=>q.status==='draft')).toBe(true);
 await query('UPDATE question_answers SET explanation=? WHERE question_id=?',['1 + 1 = 2',drafts.at(-1)]);
});
it('publishes every draft across pages, audits changes and leaves other content untouched',async()=>{
 const r=await admin.post(endpoint).send({lessonId});expect(r.status).toBe(200);expect(r.body.data.published).toBe(25);
 const rows=await query('SELECT status,published_at,updated_by FROM questions WHERE id IN (?)',[drafts]);expect(rows.every(q=>q.status==='published'&&q.published_at&&q.updated_by===adminId)).toBe(true);
 const untouched=await query('SELECT id,status FROM questions WHERE id IN (?)',[[hidden,other,published]]);
 expect(Object.fromEntries(untouched.map(q=>[q.id,q.status]))).toEqual({[hidden]:'hidden',[other]:'draft',[published]:'published'});
 const [audit]=await query("SELECT COUNT(*) n FROM atomic_question_writes WHERE question_id IN (?) AND action='publish'",[drafts]);expect(Number(audit.n)).toBe(25);
 expect((await admin.post(endpoint).send({lessonId})).body.data.published).toBe(0);
});
