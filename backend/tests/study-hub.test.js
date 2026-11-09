import {beforeAll,afterAll,it,expect} from 'vitest';
import {createTestUser,loginStudent,wrongClientAnswer,questionFor} from './helpers/index.js';
import {FIXTURE_TOPIC_ID} from './fixtures/questions.js';
import {query} from '../src/config/db.js';
let users=[],student,other,admin,chinese,primary,locked,lesson,set,feedback,session;
beforeAll(async()=>{
 for(const options of [{},{},{role:'admin'},{role:'admin',adminScope:'chinese'},{role:'admin',adminScope:'primary'},{enrolled:false}])users.push(await createTestUser(options));
 [student,other,admin,chinese,primary,locked]=await Promise.all(users.map(loginStudent));
 lesson=(await admin.post('/api/v1/chinese/lessons').send({level_id:1,title:'Hub fixture',position:999,status:'published'})).body.data.id;
 set=(await admin.post('/api/v1/chinese/sets').send({lesson_id:lesson,title:'Hub set'})).body.data.id;
 const items=[{kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'Xin chào'}} ,...Array.from({length:44},(_,n)=>({kind:'question',data:{type:'choice',prompt:'Hub question '+(n+1),options:['yes','no'],accepted:['yes'],explanation:'Hub explanation '+(n+1),approved:true}}))];
 expect((await admin.put('/api/v1/chinese/sets/'+set).send({title:'Hub set',status:'published',items})).status).toBe(200);
});
afterAll(async()=>{if(lesson)await admin.delete('/api/v1/chinese/lessons/'+lesson);for(const u of users){await query('DELETE FROM practice_sessions WHERE student_id=?',[u.id]);await query('DELETE FROM diamond_ledger WHERE profile_id=?',[u.id]);await query('DELETE FROM profiles WHERE id=?',[u.id]);}});
it('stores categorized feedback, isolates personal histories and enforces admin scope for replies',async()=>{
 const response=await student.post('/api/v1/feedback').send({category:'audio',message:'Cannot hear this Chinese question',scope:'chinese',page_url:'/pages/student/chinese/?set='+set,context_text:'Question prompt'});expect(response.status).toBe(200);feedback=response.body.data.id;
 expect((await other.get('/api/v1/feedback')).body.data).toHaveLength(0);
 expect((await student.get('/api/v1/feedback?manage=true')).status).toBe(403);
 expect((await primary.get('/api/v1/feedback?manage=true')).body.data.some(r=>r.id===feedback)).toBe(false);
 expect((await primary.put('/api/v1/feedback/'+feedback).send({status:'resolved',reply:'No'})).status).toBe(403);
 expect((await chinese.put('/api/v1/feedback/'+feedback).send({status:'reviewing',reply:'Checking voice'})).status).toBe(200);
 expect((await student.get('/api/v1/feedback')).body.data.find(r=>r.id===feedback).reply).toBe('Checking voice');
 expect((await student.post('/api/v1/feedback').send({category:'audio',message:'Invalid external page',page_url:'https://evil.example'})).status).toBe(400);
});
it('searches only unlocked course content and matches pinyin without tones',async()=>{
 expect((await student.get('/api/v1/learning/search?q=ni%20hao').set('X-Course-Id','hsk-1')).body.data.some(r=>r.title.includes('你好'))).toBe(true);
 expect((await student.get('/api/v1/learning/search?q=ni%20hao').set('X-Course-Id','hsk-2')).body.data).toHaveLength(0);
 expect((await locked.get('/api/v1/learning/search?q=ni').set('X-Course-Id','hsk-1')).status).toBe(403);
 expect((await student.get('/api/v1/learning/search?q=').set('X-Course-Id','hsk-1')).status).toBe(400);
});
it('plans sequential twenty-question blocks without answers, persists choices, and reviews only previously locked questions',async()=>{
 const plan=(await student.get('/api/v1/chinese/sets/'+set+'/quiz-plan').set('X-Course-Id','hsk-1')).body.data;
 expect(plan.blocks).toHaveLength(3);expect(plan.review_count).toBe(0);
 expect(plan.blocks[0].questions[0].data.prompt).toBe('Hub question 1');expect(plan.blocks[2].questions[0].data.prompt).toBe('Hub question 25');expect(plan.blocks[0].questions[0].data.accepted).toBeUndefined();
 expect((await student.post('/api/v1/chinese/attempts').send({set_id:set,count:20,selection:'review'})).status).toBe(400);
 let a=(await student.post('/api/v1/chinese/attempts').send({set_id:set,count:20,selection:'sequential',block:1})).body.data;
 expect(a.items[0].data.prompt).toBe('Hub question 21');expect(a.items).toHaveLength(20);
 const firstIds=a.items.map(i=>i.id);
 a=(await student.post('/api/v1/chinese/attempts/'+a.id+'/answers').send({item_id:a.items[0].id,value:'no',lock:false})).body.data;expect(a.items[0].selection).toBe('no');expect(a.items[0].result).toBeUndefined();
 for(let n=0;n<20;n++)a=(await student.post('/api/v1/chinese/attempts/'+a.id+'/answers').send({item_id:a.items[n].id,value:n===0?'no':'yes',lock:true})).body.data;
 expect(a.finished_at).toBeTruthy();
 const wrong=(await student.get('/api/v1/learning/wrong').set('X-Course-Id','hsk-1')).body.data;expect(wrong).toHaveLength(1);expect(wrong[0].title).toBe('Hub question 21');
 const next=(await student.post('/api/v1/chinese/attempts').send({set_id:set,count:20,selection:'review'})).body.data;
 expect(new Set(next.items.map(i=>i.id))).toEqual(new Set(firstIds));expect(next.items[0].id).toBe(firstIds[0]);
 expect((await other.get('/api/v1/learning/wrong').set('X-Course-Id','hsk-1')).body.data).toHaveLength(0);
});
it('includes primary wrong answers, hides other accounts, and stores goals per course',async()=>{
 const start=await student.post('/api/v1/practice').set('X-Course-Id','grade-3').send({topicId:FIXTURE_TOPIC_ID});session=start.body.data.id;const q=start.body.data.questions[0];
 await student.post('/api/v1/practice/'+session+'/answers').set('X-Course-Id','grade-3').send({questionId:q.id,answer:wrongClientAnswer(await questionFor(q.id),q.options)});
 const result=await student.get('/api/v1/learning/wrong').set('X-Course-Id','grade-3');expect(result.status).toBe(200);expect(result.body.data.some(r=>r.id===q.id)).toBe(true);
 expect((await other.get('/api/v1/learning/wrong').set('X-Course-Id','grade-3')).body.data).toHaveLength(0);
 expect((await student.put('/api/v1/learning/goal').set('X-Course-Id','hsk-1').send({target:5})).status).toBe(200);
 const week=(await student.get('/api/v1/learning/week').set('X-Course-Id','hsk-1')).body.data;expect(week.target).toBe(5);expect(week.days).toBe(1);
 expect((await other.get('/api/v1/learning/week').set('X-Course-Id','hsk-1')).body.data.target).toBe(3);
 expect((await student.put('/api/v1/learning/goal').set('X-Course-Id','hsk-1').send({target:10})).status).toBe(400);
});
