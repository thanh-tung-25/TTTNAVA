import {subjectName} from './primary-subjects.js';
import {paperPeriodLabel} from './school-paper-periods.js';
export const schoolModes=[['lessons','Bài học','Kiến thức, ví dụ và quiz'],['checks','Bài kiểm tra','Ngân hàng câu hỏi theo phạm vi'],['papers','Đề thi','Đề cố định theo đợt thi']];
export const schoolParts=[['knowledge','Cần nhớ / công thức','▤'],['examples','Ví dụ hướng dẫn','✎'],['quiz','Quiz theo bài','★'],['worksheets','Bộ bài tập','▧']];
export function schoolAdminDestination({grade,subjectId,group,part='knowledge',period='other',title,mode='lessons'}){
 const path=['Lớp '+grade,subjectName(subjectId,grade)];
 if(mode==='papers')path.push('Đề thi',...(period==='all'?[]:[paperPeriodLabel(period)]),...(title?[title]:[]));
 else if(mode==='checks')path.push('Bài kiểm tra',...(title?[title]:[]));
 else path.push(part==='worksheets'?'Bài tập tương tác':part==='quiz'?'Quiz theo bài':'Bài học',...(group?[group.title||group]:[]),...(group&&(part==='knowledge'||part==='examples')?[schoolParts.find(([id])=>id===part)[1]]:[]));
 return path.join(' → ');
}
export function worksheetPlacement(sheet,tree){
 if(sheet.exam_config)return schoolAdminDestination({grade:sheet.grade,subjectId:sheet.subject_id,mode:'papers',period:sheet.exam_config.period,title:sheet.title});
 let lesson;for(const grade of tree?.grades||[])for(const semester of grade.semesters)for(const subject of semester.subjects)for(const chapter of subject.chapters)lesson||=chapter.lessons.find(l=>l.id===sheet.lesson_id);
 return schoolAdminDestination({grade:sheet.grade,subjectId:sheet.subject_id,part:'worksheets',group:lesson?.name||sheet.title});
}
export const schoolContentStatus=status=>({published:'Đã cho học sinh xem',draft:'Bản nháp · học sinh chưa thấy',hidden:'Đang ẩn với học sinh'}[status]||'Chưa có nội dung');
export function scopeForSchoolGroup(scope,group,partId){const {unassigned,...base}=scope,part=group.parts.find(p=>p.id===partId)||group.parts[0];return {...base,grade:group.grade,subjectId:group.subjectId,semester:group.semester,chapterId:group.chapterId,groupId:group.id,lessonId:part.id,topicId:part.topicId};}
