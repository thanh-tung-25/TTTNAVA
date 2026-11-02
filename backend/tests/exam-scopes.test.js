import {beforeAll,afterAll,it,expect} from 'vitest';
import {createTestUser,loginStudent} from './helpers/index.js';
import {query} from '../src/config/db.js';
const base='/api/v1/exams';
let admin,student,locked,other;const questions=[],attempts=[];
beforeAll(async()=>{
 admin=await loginStudent(await createTestUser({username:'test_scope_exam_a',role:'admin'}));
 student=await loginStudent(await createTestUser({username:'test_scope_exam_s',grade:1}));
 locked=await loginStudent(await createTestUser({username:'test_scope_exam_l',grade:1,enrolled:false}));
 other=await loginStudent(await createTestUser({username:'test_scope_exam_o',grade:1}));
 for(const [lessonId,n]of [['kntt-toan-1-b01',20],['kntt-toan-1-b02',20],['kntt-toan-1-b07',40],['kntt-toan-1-b21',40]]){
  for(let i=0;i<n;i++){
   const r=await admin.post('/api/v1/admin/questions').send({lessonId,type:'fill_in',prompt:`Scope exam ${lessonId}: ${i} + 1 = ?`,options:[],answer:{accepted:[String(i+1)]},explanation:`${i} + 1 = ${i+1}`,difficulty:'easy',status:'published'});expect(r.status).toBe(201);questions.push(r.body.data.id);
  }
 }
});
afterAll(async()=>{for(const id of attempts)await query('DELETE FROM exam_attempts WHERE id=?',[id]);for(const id of questions)await query('DELETE FROM questions WHERE id=?',[id]);});
async function start(body){const r=await student.post(base).set('X-Course-Id','grade-1').send({subjectId:'toan',...body});if(r.status===201)attempts.push(r.body.data.id);return r;}
async function placements(attempt){return query('SELECT DISTINCT c.id,c.grade,c.semester FROM exam_questions eq JOIN questions q ON q.id=eq.question_id JOIN curriculum_lessons l ON l.topic_id=q.topic_id JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE eq.attempt_id=?',[attempt.id]);}

it('catalog uses the selected course and provides separate chapter/semester/year sizes',async()=>{
 const r=await student.get(base+'/catalog?subjectId=toan').set('X-Course-Id','grade-1');expect(r.status).toBe(200);expect(r.body.data.grade).toBe(1);expect(r.body.data.chapters).toHaveLength(10);
 expect(r.body.data.chapters[0].count).toBe(30);expect(r.body.data.chapters[0].questionCount).toBeGreaterThanOrEqual(40);expect(r.body.data.annual.count).toBe(50);
 expect((await locked.get(base+'/catalog?subjectId=toan').set('X-Course-Id','grade-1')).status).toBe(403);
});
it('chapter checks contain 30 unique published questions from multiple lessons of that chapter only',async()=>{
 const r=await start({mode:'chapter',chapterId:'kntt-toan-1-c01'});expect(r.status).toBe(201);const a=r.body.data;
 expect(a.questions).toHaveLength(30);expect(new Set(a.questions.map(q=>q.id)).size).toBe(30);expect(a.durationSeconds).toBe(1800);expect(a.questions.every(q=>q.correctAnswer===undefined&&q.explanation===undefined)).toBe(true);
 expect((await placements(a)).map(c=>c.id)).toEqual(['kntt-toan-1-c01']);
 expect((await other.get(base+'/'+a.id)).status).toBe(404);
});
it('semester exams draw 50 questions from semester 1 and cover its available chapters',async()=>{
 const r=await start({mode:'semester',semester:'hk1'});expect(r.status).toBe(201);const a=r.body.data;
 expect(a.questions).toHaveLength(50);expect(a.durationSeconds).toBe(3000);expect(a.topic.name).toContain('học kì 1');const scopes=await placements(a);expect(scopes.every(c=>c.semester==='hk1'&&c.grade===1)).toBe(true);expect(scopes).toHaveLength(2);
 const second=await start({mode:'semester',semester:'hk1'});expect(second.status).toBe(201);expect(second.body.data.questions.map(q=>q.id)).not.toEqual(a.questions.map(q=>q.id));
});
it('year exams contain 50 unique questions from both semesters and retain the title in history',async()=>{
 const r=await start({mode:'annual'});expect(r.status).toBe(201);const a=r.body.data;
 expect(a.questions).toHaveLength(50);expect(new Set(a.questions.map(q=>q.id)).size).toBe(50);expect(a.durationSeconds).toBe(3600);expect((await placements(a)).map(c=>c.semester)).toContain('hk2');
 const q=a.questions[0];const [answer]=await query('SELECT answer_json FROM question_answers WHERE question_id=?',[q.id]);const data=typeof answer.answer_json==='string'?JSON.parse(answer.answer_json):answer.answer_json;
 expect((await student.post(base+'/'+a.id+'/answers').send({questionId:q.id,answer:{value:data.accepted[0]}})).status).toBe(200);
 const submitted=await student.post(base+'/'+a.id+'/submit');expect(submitted.status).toBe(200);expect(submitted.body.data.totalQuestions).toBe(50);expect(submitted.body.data.correctCount).toBe(1);expect(submitted.body.data.scorePercent).toBe(2);
 const history=await student.get(base+'/history');expect(history.body.data.find(h=>h.id===a.id).topicName).toContain('cả năm');
});
it('rejects missing scope, insufficient semester pools and locked courses',async()=>{
 expect((await start({mode:'semester'})).status).toBe(400);
 expect((await start({mode:'semester',semester:'hk2'})).body.error.code).toBe('NOT_ENOUGH_QUESTIONS');
 expect((await locked.post(base).set('X-Course-Id','grade-1').send({mode:'annual',subjectId:'toan'})).status).toBe(403);
 expect((await start({mode:'chapter',chapterId:'kntt-toan-2-c01'})).status).toBe(409);
});
