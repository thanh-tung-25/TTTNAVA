import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createTestUser,loginStudent,wrongClientAnswer,questionFor} from './helpers/index.js';
import {FIXTURE_TOPIC_ID} from './fixtures/questions.js';
import {query} from '../src/config/db.js';
import {deploymentCheck,requiredTables} from '../src/services/deployment-check.js';
let student,other,admin,scoped,locked,seed,wrongId,lesson,set;const users=[];
beforeAll(async()=>{
 for(const options of [{},{},{role:'admin'},{role:'admin',adminScope:'chinese'},{enrolled:false}])users.push(await createTestUser(options));
 [student,other,admin,scoped,locked]=await Promise.all(users.map(loginStudent));
 const start=await student.post('/api/v1/practice').set('X-Course-Id','grade-3').send({topicId:FIXTURE_TOPIC_ID});seed=start.body.data.id;const q=start.body.data.questions[0];wrongId=q.id;
 await student.post(`/api/v1/practice/${seed}/answers`).set('X-Course-Id','grade-3').send({questionId:q.id,answer:wrongClientAnswer(await questionFor(q.id),q.options)});
 await query("UPDATE practice_sessions SET status='finished',correct_count=4,finished_at=CURRENT_TIMESTAMP WHERE id=?",[seed]);
 lesson=(await admin.post('/api/v1/chinese/lessons').send({title:'Daily words',level_id:1,position:1,status:'published'})).body.data.id;
 set=(await admin.post('/api/v1/chinese/sets').send({title:'Daily vocabulary',lesson_id:lesson})).body.data.id;
 await admin.put('/api/v1/chinese/sets/'+set).send({title:'Daily vocabulary',status:'published',items:[{kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'Xin chào'}}]});
});
afterAll(async()=>{if(lesson)await admin.delete('/api/v1/chinese/lessons/'+lesson);for(const u of users){await query('DELETE FROM practice_sessions WHERE student_id=?',[u.id]);await query('DELETE FROM profiles WHERE id=?',[u.id]);}});
it('requires the authenticated student and unlocked selected course',async()=>{
 expect((await admin.get('/api/v1/learning/today').set('X-Course-Id','grade-3')).status).toBe(403);
 expect((await locked.get('/api/v1/learning/today').set('X-Course-Id','grade-3')).status).toBe(403);
 expect((await student.get('/api/v1/learning/family-report').set('X-Course-Id','grade-4')).body.data.summary.completed).toBe(0);
});
it('prioritizes a wrong topic, starts ten safe questions and resumes the same unfinished session',async()=>{
 const plan=await student.get('/api/v1/learning/today').set('X-Course-Id','grade-3');expect(plan.status).toBe(200);expect(plan.body.data.topic.id).toBe(FIXTURE_TOPIC_ID);
 const start=await student.post('/api/v1/learning/today/start').set('X-Course-Id','grade-3');expect(start.status).toBe(200);
 const id=new URL(start.body.data.href,'http://localhost').searchParams.get('session'),session=await student.get('/api/v1/practice/'+id).set('X-Course-Id','grade-3');expect(session.body.data.questions).toHaveLength(10);expect(session.body.data.questions[0].id).toBe(wrongId);
 for(const q of session.body.data.questions){expect(q.correctAnswer).toBeUndefined();expect(q.answer).toBeUndefined();}
 expect((await student.post('/api/v1/learning/today/start').set('X-Course-Id','grade-3')).body.data.href).toBe(start.body.data.href);
});
it('reports real seven-day scores, gives empty data for another account and never accepts a student override',async()=>{
 const response=await student.get('/api/v1/learning/family-report').set('X-Course-Id','grade-3');expect(response.status).toBe(200);expect(response.body.data.summary.completed).toBe(1);expect(response.body.data.summary.average).toBe(40);expect(response.body.data.weak[0].score).toBe(40);expect(response.body.data.subjects[0].title).toBe('Toán');
 const second=await other.get('/api/v1/learning/family-report').query({student_id:users[0].id}).set('X-Course-Id','grade-3');expect(second.body.data.summary.completed).toBe(0);expect(second.body.data.recent).toHaveLength(0);
});
it('Chinese daily plans use published words in the selected HSK only',async()=>{
 const response=await student.get('/api/v1/learning/today').set('X-Course-Id','hsk-1');expect(response.status).toBe(200);expect(response.body.data.kind).toBe('chinese');expect(response.body.data.words.some(w=>w.hanzi==='你好')).toBe(true);
 expect((await student.get('/api/v1/learning/today').set('X-Course-Id','hsk-2')).body.data.words).toHaveLength(0);
});
it('deployment readiness flags missing tables and is restricted to super admins',async()=>{
 const check=await deploymentCheck(async()=>requiredTables.filter(t=>t!=='chat_friendships').map(table_name=>({table_name})));expect(check.ready).toBe(false);expect(check.missing).toEqual(['chat_friendships']);
 expect((await scoped.get('/api/v1/admin/deployment-check')).status).toBe(403);expect((await student.get('/api/v1/admin/deployment-check')).status).toBe(403);
 const live=await admin.get('/api/v1/admin/deployment-check');expect(live.status).toBe(200);expect(live.body.data.ready).toBe(true);expect(live.body.data.database).toBe('MySQL');
});
