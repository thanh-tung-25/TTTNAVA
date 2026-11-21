import {z} from 'zod';
import {notFound,AppError} from '../utils/errors.js';
import {evidenceSchema,validateStudyProgress} from './study-activity-source.js';

const json=value=>typeof value==='string'?JSON.parse(value):value;
// The same locked session is used before and after claiming a reward. Only
// coverage metadata changes; completion, scores, and the reward receipt stay put.
export function createStudyProgressSaver({withTransaction,requireCourse,clock=Date.now}){
 return async function saveStudyProgress(user,id,body){
  z.uuid().parse(id);const evidence=evidenceSchema.parse(body);
  return withTransaction(async connection=>{
   const run=async(sql,parameters=[])=>(await connection.query(sql,parameters))[0];
   const [row]=await run('SELECT * FROM study_activity_sessions WHERE id=? AND profile_id=? FOR UPDATE',[id,user]);
   if(!row)throw notFound();await requireCourse(user,row.course_id,run);
   if(clock()-new Date(row.created_at).getTime()>86400000)throw new AppError(409,'STUDY_SESSION_EXPIRED','Lượt học đã hết hạn. Bạn mở lại phần học để lưu tiếp.');
   const ids=validateStudyProgress(json(row.snapshot),evidence,row.created_at),previous=json(row.result)||{};
   const studied=[...new Set([...(previous.studied_items||[]),...ids])];
   const legacy=row.completed_at&&!Object.hasOwn(previous,'studied_items')?{legacy_completed:Number(previous.completed)||0}:{};
   await run('UPDATE study_activity_sessions SET result=? WHERE id=?',[JSON.stringify({...previous,...legacy,studied_items:studied}),id]);
   return {saved:true,studied:studied.length};
  });
 };
}
