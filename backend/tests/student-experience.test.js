import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent,questionFor,correctClientAnswer,wrongClientAnswer} from './helpers/index.js';
import {FIXTURE_TOPIC_ID} from './fixtures/questions.js';
const base='/api/v1/experience',course='grade-3';let users=[],student,other,staff,scoped,guardian,locked,mainRun;
const get=(agent,path)=>agent.get(base+path).set('X-Course-Id',course);
const post=(agent,path,body={})=>agent.post(base+path).set('X-Course-Id',course).send(body);
const put=(agent,path,body)=>agent.put(base+path).set('X-Course-Id',course).send(body);
async function start(agent=student,kind='daily'){const r=await post(agent,'/runs',{kind,itemId:FIXTURE_TOPIC_ID,minutes:5});expect(r.status,r.text).toBe(200);return (await get(agent,'/runs/'+r.body.data.id)).body.data;}
async function complete(agent,state,correct=true){while(state.question){const q=await questionFor(state.question.id),r=await post(agent,'/runs/'+state.id+'/answer',{questionId:q.id,answer:correct?correctClientAnswer(q):wrongClientAnswer(q,state.question.options),revision:state.revision});expect(r.status,r.text).toBe(200);state=r.body.data;}const r=await post(agent,'/runs/'+state.id+'/finish');expect(r.status,r.text).toBe(200);return r.body.data;}
beforeAll(async()=>{
 for(const options of [{},{},{role:'admin'},{role:'admin',adminScope:'chinese'},{},{enrolled:false}])users.push(await createTestUser(options));
 await query("UPDATE profiles SET account_kind='guardian',email_verified_at=CURRENT_TIMESTAMP WHERE id=?",[users[4].id]);
 [student,other,staff,scoped,guardian,locked]=await Promise.all(users.map(loginStudent));
});
afterAll(async()=>{for(const u of users){await query('DELETE FROM diamond_ledger WHERE profile_id=?',[u.id]);await query('DELETE FROM profiles WHERE id=?',[u.id]);}});
it('protects content and identities; persists settings without accepting ownership or privilege fields',async()=>{
 expect((await post(locked,'/runs',{minutes:5})).status).toBe(403);
 expect((await put(student,'/preferences',{minutes:5,font_scale:'large',effects_enabled:false,companion:'panda',companion_name:'Bạn Gấu'})).status).toBe(200);
 expect((await get(student,'/preferences')).body.data).toMatchObject({minutes:5,font_scale:'large',effects_enabled:0,companion_name:'Bạn Gấu'});
 expect((await put(student,'/preferences',{admin_scope:'super'})).status).toBe(400);
 expect((await put(student,'/focus',{itemId:'invalid-topic'})).status).toBe(400);
 expect((await get(staff,'/catalog')).status).toBe(403);
});
it('does not expose answers; resumes drafts and rejects stale device writes',async()=>{
 const state=await start();mainRun=state.id;expect(state.total).toBe(5);expect(state.question.answer).toBeUndefined();expect(state.question.explanation).toBeUndefined();expect(state.feedback).toHaveLength(0);
 expect((await get(other,'/runs/'+state.id)).status).toBe(404);
 expect((await post(student,'/runs/'+state.id+'/finish')).status).toBe(400);
 const answer=correctClientAnswer(await questionFor(state.question.id));const saved=await put(student,'/runs/'+state.id+'/draft',{revision:0,answer});expect(saved.body.data.revision).toBe(1);
 expect((await put(student,'/runs/'+state.id+'/draft',{revision:0,answer})).status).toBe(409);
 const resumed=(await get(student,'/runs/'+state.id)).body.data;expect(resumed.draft).toEqual(answer);
 expect((await post(student,'/runs/'+state.id+'/answer',{revision:0,questionId:state.question.id,answer})).status).toBe(409);
 expect((await post(student,'/runs/'+state.id+'/answer',{revision:1,questionId:'out-of-order',answer})).status).toBe(400);
 const next=await post(student,'/runs/'+state.id+'/answer',{revision:1,questionId:state.question.id,answer});expect(next.body.data.feedback[0].expected).toBeTruthy();expect(next.body.data.question.answer).toBeUndefined();
 await complete(student,next.body.data);const again=await post(student,'/runs/'+state.id+'/finish');expect(again.status).toBe(200);
 expect(Number((await query('SELECT COUNT(*) n FROM learning_events WHERE ref_id=?',[state.id]))[0].n)).toBe(1);
});
it('requires real completed learning for rewards; repeated claims do not pay twice',async()=>{
 expect((await post(other,'/rewards/claim/learn')).status).toBe(400);
 const results=await Promise.all([post(student,'/rewards/claim/learn'),post(student,'/rewards/claim/learn')]);expect(results.map(r=>r.status)).toEqual([200,200]);expect(results.reduce((n,r)=>n+r.body.data.earned,0)).toBe(3);
 expect((await post(student,'/store/frame-mint/equip')).status).toBe(400);expect((await post(student,'/store/frame-mint/buy')).status).toBe(400);
 const ref=randomUUID();await query("INSERT INTO diamond_ledger(profile_id,amount,reason,ref_type,ref_id) VALUES (?,30,'practice_complete','practice',?)",[users[0].id,ref]);
 const purchases=await Promise.all([post(student,'/store/frame-mint/buy'),post(student,'/store/frame-mint/buy')]);expect(purchases.map(r=>r.status)).toEqual([200,200]);expect(purchases.reduce((n,r)=>n+r.body.data.charged,0)).toBe(20);
 expect((await post(student,'/store/frame-mint/equip')).status).toBe(200);expect((await get(student,'/rewards')).body.data.wallet.total).toBe(13);
 expect((await post(student,'/store/forged-price/buy',{price:0})).status).toBe(404);
});
it('uses latest answers across old and new learning; mastery needs successful days apart',async()=>{
 const bad=await complete(other,await start(other),false),wrong=(await other.get('/api/v1/learning/wrong').set('X-Course-Id',course)).body.data;expect(wrong.length).toBe(5);
 const review=await start(other,'review');expect(wrong.map(r=>r.id)).toContain(review.question.id);await complete(other,review,true);
 expect((await other.get('/api/v1/learning/wrong').set('X-Course-Id',course)).body.data).toHaveLength(0);
 await complete(student,await start(student),true);let skill=(await get(student,'/progress')).body.data.find(s=>s.skill_key===FIXTURE_TOPIC_ID);expect(skill.spaced_successes).toBe(1);expect(skill.status).not.toBe('vững');
 await query("UPDATE learning_skill_state SET last_success_day='2020-01-01' WHERE profile_id=?",[users[0].id]);await complete(student,await start(student),true);skill=(await get(student,'/progress')).body.data.find(s=>s.skill_key===FIXTURE_TOPIC_ID);expect(skill.spaced_successes).toBe(2);expect(skill.status).toBe('vững');
 const report=await student.get('/api/v1/learning/family-report').set('X-Course-Id',course);expect(report.status).toBe(200);expect(report.body.data.summary.completed).toBeGreaterThan(0);
 expect(bad.correct).toBe(0);
});
it('isolates private saved work and detects conflicting revisions',async()=>{
 const saved=await post(student,'/gallery',{title:'Dàn ý',body:'Nội dung tự viết'});expect(saved.status).toBe(200);const id=saved.body.data.id;
 expect((await post(other,'/gallery',{id,revision:0,title:'Thay thế',body:'Không phải của mình'})).status).toBe(404);
 expect((await post(student,'/gallery',{id,revision:0,title:'Dàn ý mới',body:'Thêm một ý mới'})).body.data.revision).toBe(1);
 expect((await post(student,'/gallery',{id,revision:0,title:'Bản cũ',body:'Ghi đè từ thiết bị khác'})).status).toBe(409);
 expect((await get(other,'/gallery')).body.data).toHaveLength(0);
});
it('keeps guardian requests pending until child approval, and revokes access immediately',async()=>{
 const code=(await post(student,'/guardian/code')).body.data.code;expect(code).toHaveLength(12);
 expect((await post(other,'/guardian/links',{code})).status).toBe(403);
 const linked=await post(guardian,'/guardian/links',{code});expect(linked.status,linked.text).toBe(200);const id=linked.body.data.id;
 expect((await get(guardian,'/guardian/children/'+users[0].id+'/courses')).status).toBe(404);
 expect((await post(guardian,'/guardian/links/'+id,{action:'accept'})).status).toBe(403);
 expect((await post(other,'/guardian/links/'+id,{action:'accept'})).status).toBe(404);
 expect((await post(student,'/guardian/links/'+id,{action:'accept'})).status).toBe(200);
 expect((await get(guardian,'/guardian/children/'+users[0].id+'/courses')).body.data.length).toBeGreaterThan(0);
 expect((await get(guardian,'/guardian/children/'+users[0].id+'/report?courseId='+course)).body.data.summary.completed).toBeGreaterThan(0);
 await post(student,'/guardian/links/'+id,{action:'revoke'});expect((await get(guardian,'/guardian/children/'+users[0].id+'/courses')).status).toBe(404);
});
it('limits teacher scope, hides unfinished writing and saves submitted feedback',async()=>{
 expect((await get(student,'/assignments/manage')).status).toBe(403);
 expect((await get(scoped,'/assignments/manage/choices?courseId='+course)).status).toBe(403);
 const created=await post(staff,'/assignments/manage',{courseId:course,title:'Bài viết tuần này',description:'Viết một điều đã học.',kind:'writing',studentIds:[users[0].id]});expect(created.status,created.text).toBe(200);const id=created.body.data.id;
 expect((await get(other,'/assignments/'+id)).status).toBe(404);
 expect((await put(student,'/assignments/'+id+'/writing',{text:'Một bản nháp riêng tư',revision:0})).status).toBe(200);
 expect((await get(staff,'/assignments/manage/'+id)).body.data.students[0].draft_text).toBeNull();
 expect((await put(student,'/assignments/'+id+'/writing',{text:'Bản từ thiết bị cũ',revision:0})).status).toBe(409);
 expect((await post(staff,'/assignments/manage/'+id+'/review/'+users[0].id,{feedback:'Chưa nộp',score:null})).status).toBe(400);
 expect((await put(student,'/assignments/'+id+'/writing',{text:'Bài viết đã hoàn thành của mình.',revision:1,submit:true})).status).toBe(200);
 expect((await put(student,'/assignments/'+id+'/writing',{text:'Sửa sau nộp',revision:2})).status).toBe(400);
 expect((await post(staff,'/assignments/manage/'+id+'/review/'+users[0].id,{feedback:'Bài viết rõ ý, hãy thêm một ví dụ.',score:85})).status).toBe(200);
 expect((await get(student,'/assignments/'+id)).body.data.teacher_score).toBe(85);
 const quiz=await post(staff,'/assignments/manage',{courseId:course,title:'Ôn toán có phản hồi',kind:'quiz',itemId:FIXTURE_TOPIC_ID,questionCount:5,studentIds:[users[0].id]});expect(quiz.status,quiz.text).toBe(200);const begun=await post(student,'/assignments/'+quiz.body.data.id+'/start');expect(begun.status,begun.text).toBe(200);
});
it('requires accepted friends and shares the same questions without exposing peer answers',async()=>{
 expect((await post(student,'/duels',{opponentUsername:users[1].username,kind:'competitive',minutes:5})).status).toBe(403);
 await query("INSERT INTO chat_friendships(user_a,user_b,requester_id,status) VALUES (?,?,?,'accepted')",[...[users[0].id,users[1].id].sort(),users[0].id]);
 const created=await post(student,'/duels',{opponentUsername:users[1].username,kind:'cooperative',minutes:5,itemId:FIXTURE_TOPIC_ID});expect(created.status,created.text).toBe(200);const id=created.body.data.id;
 expect((await post(guardian,'/duels/'+id+'/respond',{accept:true})).status).toBe(404);
 const accepted=await post(other,'/duels/'+id+'/respond',{accept:true});expect(accepted.status,accepted.text).toBe(200);
 const a=new URL(created.body.data.href,'http://test').searchParams.get('run'),b=new URL(accepted.body.data.href,'http://test').searchParams.get('run');const snapshots=await query('SELECT items_json FROM learning_runs WHERE id IN (?,?)',[a,b]);expect(snapshots[0].items_json).toEqual(snapshots[1].items_json);
 await complete(student,(await get(student,'/runs/'+a)).body.data);expect((await get(other,'/duels')).body.data.find(d=>d.id===id).result).toBeNull();await complete(other,(await get(other,'/runs/'+b)).body.data);
 const done=(await get(other,'/duels')).body.data.find(d=>d.id===id);expect(done.status).toBe('finished');expect(done.result.cooperativeComplete).toBe(true);expect(JSON.stringify(done)).not.toContain('answers_json');
});
it('preserves Chinese administrator privacy for assignments and uses published Chinese choices',async()=>{
 await query("UPDATE profiles SET student_creator_scope='super',registration_source='admin' WHERE id=?",[users[0].id]);await query("UPDATE profiles SET student_creator_scope='chinese' WHERE id=?",[users[1].id]);
 const choices=await scoped.get(base+'/assignments/manage/choices?courseId=hsk-1');expect(choices.status).toBe(200);expect(choices.body.data.students.some(s=>s.id===users[0].id)).toBe(false);expect(choices.body.data.students.some(s=>s.id===users[1].id)).toBe(true);
 expect((await post(scoped,'/assignments/manage',{courseId:'hsk-1',title:'Hidden target',kind:'writing',studentIds:[users[0].id]})).status).toBe(404);
 await query("UPDATE profiles SET registration_source='self' WHERE id=?",[users[0].id]);expect((await scoped.get(base+'/assignments/manage/choices?courseId=hsk-1')).body.data.students.some(s=>s.id===users[0].id)).toBe(true);
 const lesson=(await scoped.post('/api/v1/chinese/lessons').send({level_id:1,title:'Experience language fixture',position:999,status:'published'})).body.data.id;
 try{const set=(await scoped.post('/api/v1/chinese/sets').send({lesson_id:lesson,title:'Words and choices'})).body.data.id;
  const published=await scoped.put('/api/v1/chinese/sets/'+set).send({title:'Words and choices',status:'published',items:[{kind:'vocabulary',data:{hanzi:'山',pinyin:'shān',meaning:'Núi'}},{kind:'vocabulary',data:{hanzi:'水',pinyin:'shuǐ',meaning:'Nước'}},{kind:'question',data:{type:'choice',prompt:'Chọn nghĩa của 山',options:['Núi','Nước'],accepted:['Núi'],explanation:'山 nghĩa là núi.',approved:true}}]});expect(published.status,published.text).toBe(200);
  const begun=await student.post(base+'/runs').set('X-Course-Id','hsk-1').send({itemId:set,minutes:5});expect(begun.status,begun.text).toBe(200);const state=(await get(student,'/runs/'+begun.body.data.id)).body.data;expect(state.total).toBe(3);expect(state.question.type).toBe('single_choice');expect(state.question.options).toHaveLength(2);expect(state.question.answer).toBeUndefined();expect((await student.get(base+'/vocabulary').set('X-Course-Id','hsk-1')).body.data.some(w=>w.hanzi==='山')).toBe(true);
  expect((await post(guardian,'/guardian/code')).status).toBe(403);
 }finally{await scoped.delete('/api/v1/chinese/lessons/'+lesson);}
});
