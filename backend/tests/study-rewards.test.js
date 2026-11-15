import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query,withTransaction} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';
import {awardLearningReward,STUDY_REWARD_LIMIT,rewardDay} from '../src/services/learning-reward.js';

const users=[];let student,other,locked,admin,lesson,set,words,texts;
const base='/api/v1/experience/study-sessions';
async function start(activity,unit='all',agent=student,course='hsk-1',source=set){const r=await agent.post(base).set('X-Course-Id',course).send({activity,source_id:source,unit:String(unit)});expect(r.status,r.text).toBe(200);return r.body.data;}
const finish=(session,evidence,agent=student)=>agent.post(base+'/'+session.id+'/finish').send(evidence);
const viewItems=ids=>({items:ids.map(id=>({id}))});
const ledger=async user=>(await query('SELECT COALESCE(SUM(amount),0) total FROM diamond_ledger WHERE profile_id=?',[user.id]))[0].total;
beforeAll(async()=>{
 for(const opts of [{},{},{enrolled:false},{role:'admin'}])users.push(await createTestUser(opts));[student,other,locked,admin]=await Promise.all(users.map(loginStudent));
 lesson=(await admin.post('/api/v1/chinese/lessons').send({level_id:1,position:1001,title:'Reward source',status:'published'})).body.data.id;
 set=(await admin.post('/api/v1/chinese/sets').send({lesson_id:lesson,title:'Reward words'})).body.data.id;
 const hanzi=['你','我','他','她','是','人','老师','学生','好','一','二','三'];
 const saved=await admin.put('/api/v1/chinese/sets/'+set).send({title:'Reward words',status:'published',items:[...hanzi.map((h,n)=>({kind:'vocabulary',data:{hanzi:h,pinyin:'nǐ',meaning:'Nghĩa '+n}})),...['你好。','我是学生。'].map((text,n)=>({kind:'reading',data:{title:'Bài đọc '+n,text}}))]});expect(saved.status,saved.text).toBe(200);
 const details=(await admin.get('/api/v1/chinese/sets/'+set)).body.data;words=details.items.filter(i=>i.kind==='vocabulary');texts=details.items.filter(i=>i.kind==='reading');
 const activities=await admin.put('/api/v1/chinese/lessons/'+lesson+'/activities').send({revision:0,status:'published',topic:'Practice',tasks:Array.from({length:10},(_,n)=>({type:'fill',prompt:'Câu '+n+': 我___学生。',answer:'是',explanation:'是 nghĩa là là.'}))});expect(activities.status,activities.text).toBe(200);
});
afterAll(async()=>{for(const user of users)await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);if(lesson)await admin.delete('/api/v1/chinese/lessons/'+lesson);for(const user of users)await query('DELETE FROM profiles WHERE id=?',[user.id]);});
it('validates access, source scope and submitted evidence before any reward',async()=>{
 expect((await locked.post(base).set('X-Course-Id','hsk-1').send({activity:'cards',source_id:set})).status).toBe(403);
 expect((await admin.post(base).set('X-Course-Id','hsk-1').send({activity:'cards',source_id:set})).status).toBe(403);
 expect((await student.post(base).set('X-Course-Id','grade-1').send({activity:'cards',source_id:set})).status).toBe(400);
 expect((await student.post(base).set('X-Course-Id','hsk-1').send({activity:'cards',source_id:set,unit:'fake-bonus'})).status).toBe(400);
 const session=await start('cards');expect(session.required).toBe(5);
 expect((await finish(session,viewItems(words.slice(0,4).map(w=>w.id)))).status).toBe(400);
 expect((await finish(session,viewItems(Array(5).fill(words[0].id)))).status).toBe(400);
 expect((await finish(session,viewItems([randomUUID(),...words.slice(0,4).map(w=>w.id)]))).status).toBe(400);
 expect((await finish(session,{...viewItems(words.slice(0,5).map(w=>w.id)),earned:999})).status).toBe(400);
 expect(Number(await ledger(users[0]))).toBe(0);
});
it('credits once under concurrent finish requests and retries, including a fresh session for the same activity',async()=>{
 const session=await start('cards'),evidence=viewItems(words.slice(0,5).map(w=>w.id)),responses=await Promise.all([finish(session,evidence),finish(session,evidence)]);
 expect(responses.map(r=>r.status)).toEqual([200,200]);expect(responses.map(r=>r.body.data.reward.earned).sort()).toEqual([0,1]);expect(Number(await ledger(users[0]))).toBe(1);
 const next=await start('cards');expect((await finish(next,evidence)).body.data.reward.reason).toBe('already_rewarded');
 expect((await finish(session,evidence,other)).status).toBe(404);
});
it('checks every listening answer against the current stage and gives only one bonus per stage/day',async()=>{
 const session=await start('listening',0),evidence={items:words.slice(0,10).map(w=>({id:w.id,answer:w.data.meaning}))};
 expect((await finish(session,{items:evidence.items.slice(0,9)})).status).toBe(400);
 const completed=await finish(session,evidence);expect(completed.status,completed.text).toBe(200);expect(completed.body.data).toMatchObject({completed:10,correct:10,reward:{earned:1}});
 const padded=await start('listening','00');expect((await finish(padded,evidence)).body.data.reward.reason).toBe('already_rewarded');
 const tail=await start('listening',1);expect(tail.required).toBe(2);expect((await finish(tail,{items:words.slice(10).map(w=>({id:w.id,answer:w.data.meaning}))})).body.data.reward.earned).toBe(1);
});
it('rewards complete vocabulary, reading and application practice, using server-calculated results',async()=>{
 const vocabulary=await start('words');expect((await finish(vocabulary,viewItems(words.slice(0,5).map(w=>w.id)))).body.data.reward.earned).toBe(1);
 const reading=await start('reading');expect((await finish(reading,viewItems([texts[0].id]))).status).toBe(400);expect((await finish(reading,viewItems(texts.map(t=>t.id)))).body.data.reward.earned).toBe(1);
 const application=await start('application','fill'),response=await finish(application,{items:Array.from({length:10},(_,n)=>({id:String(n),answer:'是'}))});expect(response.status,response.text).toBe(200);expect(response.body.data).toMatchObject({correct:10,reward:{earned:1}});
});
it('requires actual writing paths and a completed recording duration, without storing media',async()=>{
 const writing=await start('writing'),stationary=Array.from({length:3},()=>Array(6).fill([.2,.2]));expect((await finish(writing,{strokes:stationary})).status).toBe(400);
 const strokes=Array.from({length:3},(_,n)=>Array.from({length:6},(_,k)=>[.1+k*.1,.1+n*.2]));const written=await finish(writing,{strokes});expect(written.status,written.text).toBe(200);expect(written.body.data.reward.earned).toBe(1);
 const recording=await start('recording');expect((await finish(recording,{duration:5})).status).toBe(400);await query('UPDATE study_activity_sessions SET created_at=? WHERE id=?',[new Date(Date.now()-6000),recording.id]);expect((await finish(recording,{duration:5})).body.data.reward.earned).toBe(1);
 const [row]=await query('SELECT result FROM study_activity_sessions WHERE id=?',[writing.id]);expect(JSON.stringify(row.result)).not.toContain('strokes');
});
it('classifies school interaction rewards into the correct program, independent of the selected grade',async()=>{
 const evidence={actions:['slider:1','slider:2','slider:3','answer:4','answer:5']};
 for(const course of ['grade-1','grade-6']){const session=await start('lab','all',other,course,'toan');expect((await finish(session,{actions:Array(5).fill('same')},other)).status).toBe(400);expect((await finish(session,evidence,other)).body.data.reward.earned).toBe(1);}
 const summary=(await other.get('/api/v1/diamonds/summary')).body.data;expect(summary.programs).toMatchObject({primary:{total:1},secondary:{total:1},chinese:{total:0}});
 const board=(await student.get('/api/v1/diamonds/leaderboard?program=chinese&range=all&limit=100')).body.data;expect(board.find(r=>r.profileId===users[0].id).diamonds).toBe(Number(await ledger(users[0])));
});
it('enforces a daily cap per program and allows the same learning activity on a new Vietnam day',async()=>{
 const user=await createTestUser();users.push(user);
 const award=(activity,key,course='hsk-1')=>withTransaction(async c=>awardLearningReward(user.id,course,activity,key,async(sql,p=[])=>(await c.query(sql,p))[0]));
 for(let n=0;n<STUDY_REWARD_LIMIT;n++)expect((await award('words','lesson-'+n)).earned).toBe(1);
 expect((await award('cards','extra')).reason).toBe('daily_limit');expect((await award('lab','lab-1','grade-1')).earned).toBe(1);
 const yesterday=new Date(Date.parse(rewardDay()+'T00:00:00+07:00')-86400000);await query("UPDATE student_quest_claims SET claim_day=? WHERE profile_id=? AND course_id='hsk-1'",[rewardDay(yesterday),user.id]);expect((await award('words','lesson-0')).earned).toBe(1);
});
