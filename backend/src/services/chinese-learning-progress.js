import {query,withTransaction} from '../config/db.js';
import {notFound} from '../utils/errors.js';
import {requireCourse} from './course-service.js';
import {speakingAiAvailability} from './chinese-speaking-provider.js';
import {buildChineseLessonProgress} from './chinese-progress-model.js';

// Read-only reconciliation. No scores, source snapshots, or historical IDs are rewritten.
export async function chineseProgressModels(student,{lessons,sets,items,activities,base={}},run=query){
 const specs={
  reviews:['SELECT * FROM chinese_reviews WHERE student_id=?'],
  progress:['SELECT * FROM chinese_progress WHERE student_id=?'],
  attempts:['SELECT set_id,snapshot,answers,score,finished_at,started_at,abandoned_at FROM chinese_attempts WHERE student_id=?'],
  studies:["SELECT course_id,activity,source_id,unit_key,snapshot,result,created_at,completed_at FROM study_activity_sessions WHERE profile_id=? AND course_id LIKE 'hsk-%'"],
  submissions:['SELECT id,set_id,snapshot,result,status,created_at,completed_at FROM chinese_speaking_submissions WHERE student_id=?'],
  clips:['SELECT c.submission_id,c.question_index,c.status,c.result FROM chinese_speaking_clips c JOIN chinese_speaking_submissions s ON s.id=c.submission_id WHERE s.student_id=?'],
  chats:['SELECT lesson_id,turn_count,is_preview,status,created_at,completed_at FROM chinese_ai_chat_sessions WHERE student_id=?'],
  streetProgress:['SELECT lesson_id,mission_id,content_hash,completed_at,updated_at FROM chinese_street_progress WHERE student_id=?'],
  runs:["SELECT course_id,items_json,answers_json,created_at,finished_at FROM learning_runs WHERE profile_id=? AND course_id LIKE 'hsk-%'"]
 };
 const evidence={...base};for(const [key,[sql]]of Object.entries(specs))if(!evidence[key])evidence[key]=await run(sql,[student]);
 evidence.chatSettings=await run('SELECT lesson_id,data FROM chinese_ai_chat_settings');evidence.streetSettings=await run('SELECT lesson_id,data FROM chinese_street_lessons');
 return lessons.filter(lesson=>lesson.status==='published').map(lesson=>buildChineseLessonProgress({lesson,sets,items,activities,...evidence,aiAvailable:speakingAiAvailability().configured}));
}
export async function chineseLessonProgress(student,id){
 const [lesson]=await query("SELECT * FROM chinese_lessons WHERE id=? AND status='published'",[id]);if(!lesson)throw notFound('Bài học chưa được mở.');await requireCourse(student,'hsk-'+lesson.level_id);
 return withTransaction(async connection=>{
  const run=async(sql,p=[])=>(await connection.query(sql,p))[0],sets=await run('SELECT * FROM chinese_sets WHERE lesson_id=?',[id]);
  const items=await run('SELECT i.* FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id WHERE s.lesson_id=? ORDER BY i.position,i.id',[id]);
  const activities=await run("SELECT lesson_id,status,data FROM chinese_activities WHERE lesson_id=? AND status='published'",[id]);
  return (await chineseProgressModels(student,{lessons:[lesson],sets,items,activities},run))[0];
 });
}
