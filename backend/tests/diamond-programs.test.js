import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {vnRange} from '../src/utils/time.js';
import {createTestUser,loginStudent} from './helpers/index.js';

let learner,other,client,emptyClient;const activities={practice_sessions:[],exam_attempts:[],challenges:[]};
const credit=async(user,amount,type,ref=randomUUID(),created=new Date())=>query('INSERT INTO diamond_ledger(profile_id,amount,reason,ref_type,ref_id,created_at) VALUES (?,?,?,?,?,?)',[user.id,amount,type==='quest'?'quest_reward':type==='store'?'store_purchase':type==='chinese'?'chinese_complete':type==='exam'?'exam_complete':type==='challenge'?'challenge_win':'practice_complete',type,ref,created]);
async function quest(user,course,created=new Date()){
 const id=randomUUID();await query('INSERT INTO student_quest_claims(id,profile_id,course_id,claim_day,task_key) VALUES (?,?,?,?,?)',[id,user.id,course,created.toISOString().slice(0,10),'learn']);
 await credit(user,3,'quest',id,created);return id;
}
async function practice(user,grade,amount){
 const [topic]=await query('SELECT id FROM topics WHERE grade=? ORDER BY id LIMIT 1',[grade]);expect(topic).toBeTruthy();
 const id=randomUUID();await query('INSERT INTO practice_sessions(id,student_id,topic_id,seed) VALUES (?,?,?,?)',[id,user.id,topic.id,'scope']);activities.practice_sessions.push(id);await credit(user,amount,'practice',id);return id;
}
async function exam(grade,amount){
 const [topic]=await query('SELECT id FROM topics WHERE grade=? ORDER BY id LIMIT 1',[grade]),id=randomUUID();
 await query('INSERT INTO exam_attempts(id,student_id,topic_id,seed,ends_at) VALUES (?,?,?,?,?)',[id,learner.id,topic.id,'scope',new Date()]);activities.exam_attempts.push(id);await credit(learner,amount,'exam',id);
}
async function challenge(grade,amount){
 const [topic]=await query('SELECT id,subject_id FROM topics WHERE grade=? ORDER BY id LIMIT 1',[grade]),id=randomUUID();
 await query('INSERT INTO challenges(id,challenger_id,opponent_id,subject_id,grade,topic_id,seed,question_ids) VALUES (?,?,?,?,?,?,?,?)',[id,other.id,learner.id,topic.subject_id,grade,topic.id,'scope','[]']);activities.challenges.push(id);await credit(learner,amount,'challenge',id);
}
const summary=()=>client.get('/api/v1/diamonds/summary');
beforeAll(async()=>{
 learner=await createTestUser({grade:9,enrolled:false});other=await createTestUser({grade:1,enrolled:false});
 client=await loginStudent(learner);emptyClient=await loginStudent(other);
 for(let grade=1;grade<=9;grade++)await practice(learner,grade,grade);
 await exam(5,7);await exam(9,8);await challenge(3,4);await challenge(8,5);
 for(const course of ['grade-1','grade-5','grade-6','grade-9','hsk-1','hsk-2'])await quest(learner,course);
 const old=new Date(Math.min(vnRange('week').start.getTime(),vnRange('month').start.getTime())-86400000);
 await credit(learner,10,'chinese');await credit(learner,5,'chinese',randomUUID(),old);await credit(learner,-1,'chinese');await credit(learner,-6,'store');
});
afterAll(async()=>{
 for(const user of [learner,other])if(user)await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);
 for(const [table,ids]of Object.entries(activities))for(const id of ids)await query(`DELETE FROM ${table} WHERE id=?`,[id]);
 for(const user of [learner,other])if(user){await query('DELETE FROM student_quest_claims WHERE profile_id=?',[user.id]);await query('DELETE FROM profiles WHERE id=?',[user.id]);}
});
it('totals all grades and reward types by their source program while preserving the wallet',async()=>{
 const response=await summary();expect(response.status).toBe(200);expect(response.headers['cache-control']).toContain('no-store');
 const data=response.body.data;
 expect(data.programs.primary).toEqual({total:32,week:32,month:32});
 expect(data.programs.secondary).toEqual({total:49,week:49,month:49});
 expect(data.programs.chinese).toEqual({total:20,week:16,month:16});
 expect(data.total).toBe(95);expect(data.week).toBe(97);expect(data.month).toBe(97);
 expect(data.recent.some(r=>r.reason==='store_purchase'&&r.amount===-6)).toBe(true);
});
it('uses the earned activity rather than the current profile grade or enrollment',async()=>{
 await query('UPDATE profiles SET grade=2 WHERE id=?',[learner.id]);
 const response=await summary();expect(response.body.data.programs).toMatchObject({primary:{total:32},secondary:{total:49},chinese:{total:20}});
});
it('returns explicit zero totals for a program without earnings',async()=>{
 const r=await emptyClient.get('/api/v1/diamonds/summary');expect(r.status).toBe(200);
 expect(r.body.data.programs).toEqual({primary:{total:0,week:0,month:0},secondary:{total:0,week:0,month:0},chinese:{total:0,week:0,month:0}});
});
it('does not assign missing or another learner’s source records to a program',async()=>{
 const foreignPractice=await practice(other,1,2),foreignQuest=await quest(other,'hsk-1');
 await credit(learner,1000,'practice',foreignPractice);await credit(learner,1500,'quest',foreignQuest);await credit(learner,500,'practice');
 const data=(await summary()).body.data;
 expect(data.total).toBe(3095);expect(data.programs).toMatchObject({primary:{total:32},secondary:{total:49},chinese:{total:20}});
});
