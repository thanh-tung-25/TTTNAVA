import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {json} from '../repositories/chinese.js';
import {requireCourse} from './course-service.js';
import {badRequest,notFound} from '../utils/errors.js';
import {studyStartSchema,studySnapshot,evidenceSchema,validateStudyEvidence} from './study-activity-source.js';
import {awardLearningReward,STUDY_REWARD_LIMIT} from './learning-reward.js';

export async function startStudyActivity(user,courseId,body){
 const input=studyStartSchema.parse(body);
 if(!['listening','application'].includes(input.activity)&&input.unit!=='all')throw badRequest('Phần học không hợp lệ.');
 if(input.activity==='application'&&input.unit==='mixed')input.unit='all';
 if(input.activity==='listening'&&/^\d+$/.test(input.unit))input.unit=String(Number(input.unit));
 if(input.activity==='lab')input.source_id=({math:'toan',language:'tieng-viet',english:'tieng-anh',science:'khoa-hoc'})[input.source_id]||input.source_id;
 const snapshot=await studySnapshot(user,courseId,input),id=randomUUID();
 await query('INSERT INTO study_activity_sessions(id,profile_id,course_id,activity,source_id,unit_key,snapshot) VALUES (?,?,?,?,?,?,?)',[id,user,courseId,input.activity,input.source_id,input.unit,JSON.stringify(snapshot)]);
 return {id,required:snapshot.required,reward:1,daily_limit:STUDY_REWARD_LIMIT};
}
export async function finishStudyActivity(user,id,body){
 z.uuid().parse(id);const evidence=evidenceSchema.parse(body);
 return withTransaction(async c=>{const run=async(sql,p=[])=>(await c.query(sql,p))[0];
  await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user]);
  const [row]=await run('SELECT * FROM study_activity_sessions WHERE id=? AND profile_id=? FOR UPDATE',[id,user]);if(!row)throw notFound();await requireCourse(user,row.course_id,run);
  if(row.completed_at)return {...json(row.result),reward:{earned:0,reason:'already_rewarded'}};
  if(Date.now()-new Date(row.created_at).getTime()>86400000)throw badRequest('Lượt học đã hết hạn. Bạn mở lại phần học nhé.');
  const result=validateStudyEvidence(json(row.snapshot),evidence,row.created_at),reward=await awardLearningReward(user,row.course_id,row.activity,row.source_id+'|'+row.unit_key,run);
  const response={...result,reward};await run('UPDATE study_activity_sessions SET result=?,completed_at=CURRENT_TIMESTAMP(3) WHERE id=?',[JSON.stringify(response),id]);return response;
 });
}
