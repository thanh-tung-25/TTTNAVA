import {z} from 'zod';
import {query} from '../config/db.js';
import {AppError} from '../utils/errors.js';
import {seededShuffle} from '../utils/hash.js';
import {schoolSubjectName} from '../utils/school-subjects.js';

export const scopedExamSchema=z.object({mode:z.enum(['chapter','semester','annual']),subjectId:z.enum(['toan','tieng-viet','tieng-anh']),yearId:z.string().trim().min(1).max(20).optional(),chapterId:z.string().trim().min(1).max(90).optional(),semester:z.enum(['hk1','hk2']).optional()}).superRefine((d,c)=>{
 if(d.mode==='chapter'&&!d.chapterId)c.addIssue({code:'custom',path:['chapterId'],message:'Chọn chủ đề kiểm tra.'});
 if(d.mode==='semester'&&!d.semester)c.addIssue({code:'custom',path:['semester'],message:'Chọn học kì.'});
});

async function year(id){
 const rows=await query('SELECT id,name FROM school_years'+(id?' WHERE id=?':'')+' ORDER BY is_active DESC,sort_order LIMIT 1',id?[id]:[]);
 if(!rows[0])throw new AppError(404,'YEAR_NOT_FOUND','Không tìm thấy năm học.');return rows[0];
}

export async function examCatalog(grade,subjectId){
 const selected=await year();
 const chapters=await query(`SELECT c.id,c.name,c.semester,c.sort_order,COUNT(DISTINCT q.id) question_count
 FROM curriculum_chapters c LEFT JOIN curriculum_lessons l ON l.chapter_id=c.id
 LEFT JOIN questions q ON q.topic_id=l.topic_id AND q.status='published'
 WHERE c.school_year_id=? AND c.grade=? AND c.subject_id=? AND c.is_legacy=0
 GROUP BY c.id,c.name,c.semester,c.sort_order ORDER BY c.semester,c.sort_order,c.id`,[selected.id,grade,subjectId]);
 const counts=await query(`SELECT c.semester,COUNT(DISTINCT q.id) question_count FROM curriculum_chapters c JOIN curriculum_lessons l ON l.chapter_id=c.id JOIN questions q ON q.topic_id=l.topic_id AND q.status='published' WHERE c.school_year_id=? AND c.grade=? AND c.subject_id=? AND c.is_legacy=0 GROUP BY c.semester`,[selected.id,grade,subjectId]);
 return {year:selected,grade,subjectId,chapters:chapters.map(c=>({...c,questionCount:Number(c.question_count),count:30,durationSeconds:1800})),semesters:['hk1','hk2'].map(id=>({id,name:id==='hk1'?'Học kì 1':'Học kì 2',questionCount:Number(counts.find(c=>c.semester===id)?.question_count||0),count:50,durationSeconds:3000})),annual:{questionCount:counts.reduce((sum,c)=>sum+Number(c.question_count),0),count:50,durationSeconds:3600}};
}

export async function selectScopedExam(grade,body,seed){
 const scope=scopedExamSchema.parse(body),selectedYear=await year(scope.yearId);
 const params=[selectedYear.id,grade,scope.subjectId];let filter='';
 if(scope.mode==='chapter'){filter=' AND c.id=?';params.push(scope.chapterId);}
 if(scope.mode==='semester'){filter=' AND c.semester=?';params.push(scope.semester);}
 const rows=await query(`SELECT DISTINCT q.id,q.topic_id,c.id chapter_id,c.name chapter_name,c.semester
 FROM curriculum_chapters c JOIN curriculum_lessons l ON l.chapter_id=c.id
 JOIN questions q ON q.topic_id=l.topic_id AND q.status='published'
 WHERE c.school_year_id=? AND c.grade=? AND c.subject_id=? AND c.is_legacy=0${filter} ORDER BY c.id,q.id`,params);
 const unique=new Map(rows.map(q=>[q.id,q]));const count=scope.mode==='chapter'?30:50;
 if(unique.size<count)throw new AppError(409,'NOT_ENOUGH_QUESTIONS',`Phạm vi đã chọn có ${unique.size} câu đã đăng, cần ${count} câu để tạo đề.`);
 const groups=new Map();for(const row of unique.values()){if(!groups.has(row.chapter_id))groups.set(row.chapter_id,[]);groups.get(row.chapter_id).push(row);}
 const shuffled=seededShuffle([...groups.entries()].map(([id,questions])=>({id,questions:seededShuffle(questions,seed+'|'+id)})),seed+'|chapters');
 const chosen=[];while(chosen.length<count)for(const group of shuffled){const next=group.questions.pop();if(next)chosen.push(next);if(chosen.length===count)break;}
 const ordered=seededShuffle(chosen,seed+'|order');
 const subject=schoolSubjectName(scope.subjectId,grade);
 const title=(scope.mode==='chapter'?'Kiểm tra '+rows[0].chapter_name:scope.mode==='semester'?'Thi thử học kì '+(scope.semester==='hk1'?'1':'2'):'Thi thử cả năm')+' · '+subject+' lớp '+grade;
 return {questionIds:ordered.map(q=>q.id),topicId:ordered[0].topic_id,title,durationSeconds:scope.mode==='chapter'?1800:scope.mode==='semester'?3000:3600,scope:{...scope,grade,yearId:selectedYear.id}};
}
