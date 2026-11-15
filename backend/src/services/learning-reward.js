import {createHash,randomUUID} from 'node:crypto';
import {requireCourse} from './course-service.js';
import {insertLedger} from './ledger-service.js';

export const STUDY_REWARD_LIMIT=20;
export const rewardDay=(date=new Date())=>new Date(new Date(date).getTime()+7*3600000).toISOString().slice(0,10);
// The caller supplies its transaction: completion and credit commit together.
export async function awardLearningReward(user,courseId,activity,source,run){
 const [profile]=await run("SELECT role,account_kind FROM profiles WHERE id=? AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) FOR UPDATE",[user]);
 if(profile?.role!=='student'||profile.account_kind==='guardian')return {earned:0,reason:'preview'};
 const course=await requireCourse(user,courseId,run),day=rewardDay(),key='study:'+createHash('sha256').update(activity+'|'+source).digest('hex').slice(0,24);
 const [old]=await run('SELECT id FROM student_quest_claims WHERE profile_id=? AND course_id=? AND claim_day=? AND task_key=?',[user,courseId,day,key]);
 if(old)return {earned:0,reason:'already_rewarded',claim_id:old.id};
 const [count]=await run("SELECT COUNT(*) total FROM student_quest_claims q JOIN courses c ON c.id=q.course_id WHERE q.profile_id=? AND q.claim_day=? AND q.task_key LIKE 'study:%' AND c.kind=?",[user,day,course.kind]);
 if(Number(count.total)>=STUDY_REWARD_LIMIT)return {earned:0,reason:'daily_limit'};
 const id=randomUUID();
 await run('INSERT INTO student_quest_claims(id,profile_id,course_id,claim_day,task_key) VALUES (?,?,?,?,?)',[id,user,courseId,day,key]);
 await insertLedger({query:async(sql,p)=>([await run(sql,p)])},{profileId:user,amount:1,reason:'quest_reward',refType:'quest',refId:id});
 await run('INSERT INTO learning_events(id,profile_id,course_id,event_kind,ref_id,event_day,details_json) VALUES (?,?,?,?,?,?,?)',[randomUUID(),user,courseId,'study_completed',id,day,JSON.stringify({activity,source,earned:1,types:activity.startsWith('session-')?[]:[activity]})]);
 return {earned:1,reason:'completed',claim_id:id};
}
