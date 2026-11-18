import {query} from '../config/db.js';
import {familyReport} from './learning-support.js';
import {json} from '../repositories/chinese.js';
import {schoolSubjectName} from '../utils/school-subjects.js';
import {notFound} from '../utils/errors.js';

const dayOf=value=>new Date(new Date(value).getTime()+7*3600000).toISOString().slice(0,10);
const eventTime=row=>row.completed_at||row.started_at;
const done=row=>Boolean(row.completed_at)&&!['pending_review','failed'].includes(row.status);
const average=rows=>{const scores=rows.filter(r=>r.score!=null);return scores.length?Math.round(scores.reduce((n,r)=>n+r.score,0)/scores.length):null;};
const activityNames={cards:'Ôn thẻ từ',words:'Học từ mới',listening:'Luyện nghe',application:'Luyện vận dụng',reading:'Đọc bài',writing:'Luyện viết',recording:'Ghi âm luyện nói',lab:'Hoạt động tương tác'};
const units={order:'Xếp câu',fix:'Sửa lỗi',fill:'Điền từ',dialogue:'Hội thoại'};
function statistics(rows){
 const completed=rows.filter(done),scored=completed.filter(r=>r.score!=null);
 return {completed:completed.length,average:average(scored),scored_completed:scored.length,active_days:new Set(completed.map(r=>dayOf(r.completed_at))).size,in_progress:rows.filter(r=>!r.completed_at&&!['failed','pending_review'].includes(r.status)).length,pending_review:rows.filter(r=>r.status==='pending_review').length,estimated_minutes:Math.round(completed.reduce((n,r)=>n+(r.duration_seconds??Math.max(0,Math.min(1800,(new Date(r.completed_at)-new Date(r.started_at))/1000))),0)/60)};
}
async function courseActivities(student,course,days,since){
 const [legacy,practice,assignments,sets,speaking]=await Promise.all([
  familyReport(student,course.id,{days:days*2,includeRows:true}),
  query('SELECT id,activity,source_id,unit_key,result,created_at,completed_at FROM study_activity_sessions WHERE profile_id=? AND course_id=? AND completed_at>=? ORDER BY completed_at DESC LIMIT 1000',[student,course.id,since]),
  query('SELECT a.id,a.title,a.assignment_kind,a.due_at,a.created_at,m.run_id,m.submitted_at,m.feedback,m.teacher_score,m.reviewed_at,r.status AS run_status FROM study_assignments a JOIN study_assignment_members m ON m.assignment_id=a.id LEFT JOIN learning_runs r ON r.id=m.run_id WHERE m.student_id=? AND a.course_id=? ORDER BY a.created_at DESC LIMIT 100',[student,course.id]),
  course.kind==='chinese'?query('SELECT s.id,l.title FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id WHERE l.level_id=?',[course.level]):[],
  course.kind==='chinese'?query('SELECT id,lesson_title,status,score,result,created_at,completed_at FROM chinese_speaking_submissions WHERE student_id=? AND level_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 1000',[student,course.level,since]):[]
 ]);
 const titles=new Map(sets.map(s=>[s.id,s.title])),rows=legacy.activities.map(r=>({...r,category:'assessment'}));
 for(const item of practice){
  const result=json(item.result)||{},graded=result.correct!=null;
  rows.push({id:item.id,category:'practice',kind:activityNames[item.activity]||'Tự luyện',title:titles.get(item.source_id)||schoolSubjectName(item.source_id,course.level,activityNames[item.activity]||'Hoạt động học tập'),detail:units[item.unit_key]||(item.activity==='listening'?'Chặng '+(Number(item.unit_key)+1):''),subject_id:course.kind==='chinese'?'chinese':item.source_id,status:'finished',started_at:item.created_at,completed_at:item.completed_at,correct:graded?Number(result.correct):null,total:graded?Number(result.completed):null,score:graded&&result.completed?Math.round(Number(result.correct)/Number(result.completed)*100):null,items_completed:Number(result.completed)||null,...(result.duration?{duration_seconds:Number(result.duration)}:{})});
 }
 for(const item of speaking){
  const result=json(item.result)||{};
  rows.push({id:item.id,category:'speaking',kind:'Luyện nói · AI chấm',title:item.lesson_title,subject_id:'chinese',status:['needs_review','pending','grading'].includes(item.status)?'pending_review':item.status,started_at:item.created_at,completed_at:item.completed_at,correct:null,total:Number(result.question_count)||null,score:item.score==null?null:Number(item.score),feedback:(result.questions||[]).map(q=>q.feedback).filter(Boolean).slice(0,3).join(' '),detail:'Điểm đúng ý, từ và ngữ pháp; chưa đánh giá phát âm.'});
 }
 for(const assignment of assignments){
  const row=rows.find(r=>r.id===assignment.run_id);if(row&&assignment.feedback)row.feedback=assignment.feedback;
  if(assignment.assignment_kind==='writing'&&assignment.submitted_at&&new Date(assignment.submitted_at)>=since)rows.push({id:assignment.id,category:'assignment',kind:'Bài viết được giao',title:assignment.title,subject_id:course.kind==='chinese'?'chinese':'writing',status:assignment.reviewed_at?'finished':'pending_review',started_at:assignment.created_at,completed_at:assignment.submitted_at,score:assignment.teacher_score==null?null:Number(assignment.teacher_score),feedback:assignment.feedback});
 }
 return {rows:rows.map(r=>({...r,course_id:course.id,course_title:course.title,subject:r.subject||schoolSubjectName(r.subject_id,course.level,r.subject_id==='writing'?'Bài viết':''),score:r.score==null?null:Number(r.score)})),assignments:assignments.map(({id,title,due_at,submitted_at,reviewed_at,teacher_score,feedback,run_status})=>({id,title,due_at,submitted_at,reviewed_at,teacher_score,feedback,course_title:course.title,course_id:course.id,completed:Boolean(submitted_at)||run_status==='finished'}))};
}

export async function guardianLearningReport(student,courses,courseId,days=7){
 const selected=courseId==='all'?courses:courses.filter(c=>c.id===courseId);if(!selected.length&&courseId!=='all')throw notFound();
 const now=new Date(),day=dayOf(now),today=new Date(day+'T00:00:00+07:00'),since=new Date(today.getTime()-(days-1)*86400000),earliest=new Date(since.getTime()-days*86400000),until=new Date(today.getTime()+86400000);
 const packs=await Promise.all(selected.map(c=>courseActivities(student,c,days,earliest)));
 const distinct=new Map();for(const row of packs.flatMap(p=>p.rows)){const key=row.kind+':'+row.id;if(!distinct.has(key))distinct.set(key,row);}
 const all=[...distinct.values()].filter(r=>eventTime(r)&&new Date(eventTime(r))<until).sort((a,b)=>new Date(eventTime(b))-new Date(eventTime(a)));
 const current=all.filter(r=>new Date(eventTime(r))>=since),previous=all.filter(r=>new Date(eventTime(r))>=earliest&&new Date(eventTime(r))<since),summary=statistics(current),completed=current.filter(done);
 const daily=Array.from({length:days},(_,n)=>{const date=dayOf(new Date(since.getTime()+n*86400000)),rows=completed.filter(r=>dayOf(r.completed_at)===date);return {date,completed:rows.length,average:average(rows)};});
 const subjectIds=[...new Set(current.map(r=>r.subject))],subjects=subjectIds.map(title=>{const rows=current.filter(r=>r.subject===title);return {title,...statistics(rows)};});
 const lessonGroups=new Map();for(const row of current){const key=row.course_id+'|'+row.title;if(!lessonGroups.has(key))lessonGroups.set(key,[]);lessonGroups.get(key).push(row);}
 const lessons=[...lessonGroups.values()].map(rows=>({title:rows[0].title,course_title:rows[0].course_title,...statistics(rows),latest_at:eventTime(rows[0]),latest_score:rows.find(r=>done(r)&&r.score!=null)?.score??null})).slice(0,100);
 const weak=completed.filter(r=>r.score!=null&&r.score<70).sort((a,b)=>a.score-b.score).slice(0,5);
 const assignments=packs.flatMap(p=>p.assignments).sort((a,b)=>(a.completed-b.completed)||(new Date(a.due_at||'9999-01-01')-new Date(b.due_at||'9999-01-01')));
 const overdue=assignments.filter(a=>!a.completed&&a.due_at&&new Date(a.due_at)<now),attention=[];
 if(overdue.length)attention.push({tone:'warning',title:overdue.length+' bài được giao đã quá hạn',text:'Cùng con xem lại: '+overdue.slice(0,2).map(a=>a.title).join(' · '),section:'assignments'});
 if(weak.length)attention.push({tone:'warning',title:'Có nội dung con nên ôn lại',text:'Có lượt ở “'+weak[0].title+'” đạt '+weak[0].score+'/100. Có thể cùng con ôn ngắn và làm lại phần này.',section:'lessons'});
 if(summary.pending_review)attention.push({tone:'neutral',title:summary.pending_review+' hoạt động cần chấm hoặc xem lại',text:'Điểm các lượt này chưa được tính vào điểm trung bình.',section:'history'});
 if(!completed.length)attention.push({tone:'neutral',title:'Chưa có lượt hoàn thành được lưu',text:'Trong '+days+' ngày đã chọn chưa ghi nhận lượt hoàn thành. Cùng con chọn một bài ngắn để bắt đầu.',section:'history'});
 else if(summary.average>=80)attention.push({tone:'positive',title:'Các lượt đã chấm có kết quả tốt',text:'Trung bình '+summary.average+'/100 trên '+summary.scored_completed+' lượt có điểm. Khuyến khích con giữ nhịp học đều.',section:'lessons'});
 if(!attention.length)attention.push({tone:'neutral',title:'Tiếp tục theo dõi nhịp học của con',text:'Con đã hoàn thành '+summary.completed+' hoạt động trong '+summary.active_days+' ngày. Xem từng bài để cùng con chọn phần học tiếp.',section:'history'});
 return {day,since:since.toISOString(),days,generated_at:now.toISOString(),course:courseId==='all'?{id:'all',title:'Tất cả khóa học'}:selected[0],available_courses:courses,summary:{...summary,last_activity_at:current.length?eventTime(current[0]):null,overdue:overdue.length},previous:statistics(previous),daily,subjects,lessons,weak,attention:attention.slice(0,3),recent:current.slice(0,100),recent_total:current.length,assignments,courses:selected.map(c=>({...c,...statistics(current.filter(r=>r.course_id===c.id))})),note:'Chỉ tổng hợp hoạt động đã được hệ thống lưu. Lượt tự luyện không có điểm được tính hoàn thành nhưng không đưa vào điểm trung bình. Thời lượng là ước tính, không phải thời gian tương tác thực. Hội thoại AI riêng tư không được hiển thị trong báo cáo.'};
}
