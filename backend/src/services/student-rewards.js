import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {AppError,badRequest,notFound} from '../utils/errors.js';
import {insertLedger,diamondTotals} from './ledger-service.js';
import {requireCourse} from './course-service.js';
import {familyReport} from './learning-support.js';
import {activeStudent,json,localDay,txRun,preferences} from './student-experience.js';

export const storeCatalog=[
 {sku:'frame-lilac',title:'Khung tím mộng mơ',type:'frame',price:20},
 {sku:'frame-mint',title:'Khung xanh khám phá',type:'frame',price:20},
 {sku:'frame-gold',title:'Khung ngôi sao',type:'frame',price:50},
 {sku:'room-garden',title:'Góc học khu vườn',type:'background',price:30},
 {sku:'room-space',title:'Góc học vũ trụ',type:'background',price:40},
 {sku:'room-ocean',title:'Góc học đại dương',type:'background',price:30},
];
const badgeDefinitions=[{key:'first-step',title:'Bước đầu tiên'},{key:'steady',title:'Ba ngày bền bỉ'},{key:'repair',title:'Người sửa lỗi'},{key:'weekend',title:'Khám phá thử thách'},{key:'teammate',title:'Bạn đồng đội'}];
export async function rewardState(user,courseId){
 await requireCourse(user,courseId);
 const [report,events,claims,inventory,badges,wallet,prefs,completed]=await Promise.all([
  familyReport(user,courseId),query('SELECT details_json,event_day FROM learning_events WHERE profile_id=? AND course_id=? ORDER BY created_at DESC LIMIT 1000',[user,courseId]),
  query('SELECT task_key FROM student_quest_claims WHERE profile_id=? AND course_id=? AND claim_day=?',[user,courseId,localDay()]),
  query('SELECT sku FROM student_inventory WHERE profile_id=?',[user]),query('SELECT badge_key,awarded_at FROM student_badges WHERE profile_id=?',[user]),diamondTotals(user),preferences(user),query("SELECT COUNT(*) total FROM learning_events WHERE profile_id=? AND event_kind='run_finished'",[user])
 ]);
 const todays=events.filter(e=>(e.event_day instanceof Date?e.event_day.toISOString().slice(0,10):String(e.event_day).slice(0,10))===localDay()).map(e=>json(e.details_json));
 const types=new Set(todays.flatMap(e=>e.types||[])),repaired=todays.reduce((n,e)=>n+Number(e.repaired||0),0);
 const doneToday=todays.length>0||report.recent.some(r=>r.completed_at&&localDay(r.completed_at)===localDay());
 const tasks=[{key:'learn',title:'Hoàn thành một buổi học',ready:doneToday,reward:3},{key:'repair',title:'Sửa đúng một lỗi đã gặp',ready:repaired>0,reward:3},{key:'explore',title:'Khám phá hai dạng câu hỏi',ready:types.size>=2,reward:3}].map(t=>({...t,claimed:claims.some(c=>c.task_key===t.key)}));
 return {tasks,wallet,companion:{animal:prefs.companion,name:prefs.companion_name,level:1+Math.floor(Number(completed[0].total)/5)},store:storeCatalog.map(s=>({...s,owned:inventory.some(i=>i.sku===s.sku),equipped:prefs.equipped_frame===s.sku||prefs.equipped_background===s.sku})),badges:badgeDefinitions.map(b=>({...b,awardedAt:badges.find(x=>x.badge_key===b.key)?.awarded_at||null}))};
}
export async function claimDailyTask(user,courseId,key){
 z.enum(['learn','repair','explore']).parse(key);
 const state=await rewardState(user,courseId),task=state.tasks.find(t=>t.key===key);if(!task.ready)throw badRequest('Nhiệm vụ chưa hoàn thành bằng kết quả học đã lưu.');
 return withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);
  const [existing]=await run('SELECT id FROM student_quest_claims WHERE profile_id=? AND course_id=? AND claim_day=? AND task_key=?',[user,courseId,localDay(),key]);if(existing)return {claimed:true,earned:0};
  const id=randomUUID();await run('INSERT INTO student_quest_claims(id,profile_id,course_id,claim_day,task_key) VALUES (?,?,?,?,?)',[id,user,courseId,localDay(),key]);
  await insertLedger(c,{profileId:user,amount:task.reward,reason:'quest_reward',refType:'quest',refId:id});return {claimed:true,earned:task.reward};
 });
}
export async function buyCosmetic(user,sku){
 const item=storeCatalog.find(i=>i.sku===sku);if(!item)throw notFound();
 return withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);
  if((await run('SELECT id FROM student_inventory WHERE profile_id=? AND sku=?',[user,sku])).length)return {owned:true,charged:0};
  const [balance]=await run('SELECT COALESCE(SUM(amount),0) total FROM diamond_ledger WHERE profile_id=?',[user]);if(Number(balance.total)<item.price)throw badRequest('Bạn chưa đủ kim cương để đổi vật phẩm này.');
  const id=randomUUID();await run('INSERT INTO student_inventory(id,profile_id,sku) VALUES (?,?,?)',[id,user,sku]);
  await insertLedger(c,{profileId:user,amount:-item.price,reason:'store_purchase',refType:'store',refId:id});return {owned:true,charged:item.price};
 });
}
export async function equipCosmetic(user,sku){
 const item=storeCatalog.find(i=>i.sku===sku);if(!item)throw notFound();
 await withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);if(!(await run('SELECT id FROM student_inventory WHERE profile_id=? AND sku=?',[user,sku])).length)throw badRequest('Bạn cần sở hữu vật phẩm trước khi sử dụng.');
  if(!(await run('SELECT profile_id FROM student_preferences WHERE profile_id=?',[user])).length)await run('INSERT INTO student_preferences(profile_id) VALUES (?)',[user]);
  await run('UPDATE student_preferences SET '+(item.type==='frame'?'equipped_frame':'equipped_background')+'=? WHERE profile_id=?',[sku,user]);
 });return {equipped:true};
}
export async function syncBadges(user,courseId){
 const report=await familyReport(user,courseId),events=await query('SELECT details_json,event_day FROM learning_events WHERE profile_id=? AND course_id=? LIMIT 10000',[user,courseId]);
 const details=events.map(e=>json(e.details_json)),ready=[];
 if(report.summary.completed||events.length)ready.push('first-step');
 if(report.summary.active_days>=3||new Set(events.map(e=>String(e.event_day))).size>=3)ready.push('steady');
 if(details.reduce((n,e)=>n+Number(e.repaired||0),0)>=3)ready.push('repair');
 if(details.some(e=>e.kind==='weekend'))ready.push('weekend');
 const pairs=await query("SELECT d.id FROM async_learning_duels d JOIN learning_runs a ON a.id=d.creator_run_id JOIN learning_runs b ON b.id=d.opponent_run_id WHERE (d.creator_id=? OR d.opponent_id=?) AND d.duel_kind='cooperative' AND a.status='finished' AND b.status='finished' LIMIT 1",[user,user]);if(pairs.length)ready.push('teammate');
 await withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);for(const key of ready)if(!(await run('SELECT badge_key FROM student_badges WHERE profile_id=? AND badge_key=?',[user,key])).length)await run('INSERT INTO student_badges(profile_id,badge_key) VALUES (?,?)',[user,key]);});
 return {awarded:ready};
}
export async function gallery(user,courseId){await requireCourse(user,courseId);return query('SELECT id,title,body,revision,updated_at FROM student_gallery WHERE profile_id=? AND course_id=? ORDER BY updated_at DESC LIMIT 50',[user,courseId]);}
export async function saveGallery(user,courseId,body){
 await requireCourse(user,courseId);const d=z.object({id:z.uuid().optional(),revision:z.number().int().min(0).default(0),title:z.string().trim().min(1).max(120),body:z.string().trim().min(1).max(20000)}).strict().parse(body);
 return withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);if(d.id){const [old]=await run('SELECT revision FROM student_gallery WHERE id=? AND profile_id=? AND course_id=?',[d.id,user,courseId]);if(!old)throw notFound();if(Number(old.revision)!==d.revision)throw new AppError(409,'GALLERY_REVISION_CONFLICT','Bài lưu đã thay đổi ở thiết bị khác. Hãy sao chép nội dung đang viết rồi mở lại bài.');await run('UPDATE student_gallery SET title=?,body=?,updated_at=?,revision=revision+1 WHERE id=? AND profile_id=? AND course_id=?',[d.title,d.body,new Date(),d.id,user,courseId]);return {id:d.id,revision:d.revision+1};}
  const [total]=await run('SELECT COUNT(*) total FROM student_gallery WHERE profile_id=? AND course_id=?',[user,courseId]);if(Number(total.total)>=50)throw badRequest('Góc trưng bày đã đủ 50 bài. Bạn có thể cập nhật hoặc xóa bài cũ.');
  const id=randomUUID();await run('INSERT INTO student_gallery(id,profile_id,course_id,title,body) VALUES (?,?,?,?,?)',[id,user,courseId,d.title,d.body]);return {id,revision:0};
 });
}
export async function deleteGallery(user,id){z.uuid().parse(id);const [row]=await query('SELECT course_id FROM student_gallery WHERE id=? AND profile_id=?',[id,user]);if(!row)throw notFound();await requireCourse(user,row.course_id);await query('DELETE FROM student_gallery WHERE id=? AND profile_id=?',[id,user]);return {deleted:true};}
