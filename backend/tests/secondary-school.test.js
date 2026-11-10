import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';

const lessonId='toan-9-b01';
let secondary,primary,student,primaryStudent,root,learner,worksheet,practice;
const users=[],questions=[];
beforeAll(async()=>{
 for(const [key,options]of [
  ['secondary',{role:'admin',adminScope:'secondary'}],
  ['primary',{role:'admin',adminScope:'primary'}],
  ['root',{role:'admin'}],
  ['student',{grade:9,enrolled:false}],
  ['primaryStudent',{grade:3,enrolled:false}],
 ]){
  const user=await createTestUser(options);users.push(user);
  const agent=await loginStudent(user);
  if(key==='secondary')secondary=agent;
  if(key==='primary')primary=agent;
  if(key==='root')root=agent;
  if(key==='student'){student=agent;learner=user;}
  if(key==='primaryStudent'){
   primaryStudent=agent;
   await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-3','admin')",[user.id]);
  }
 }
});
afterAll(async()=>{
 for(const id of questions)await query('DELETE FROM atomic_question_writes WHERE question_id=?',[id]);
 for(const user of users){
  await query('DELETE FROM challenges WHERE challenger_id=? OR opponent_id=?',[user.id,user.id]);
  await query('DELETE FROM exam_attempts WHERE student_id=?',[user.id]);
  await query('DELETE FROM practice_sessions WHERE student_id=?',[user.id]);
  await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);
  await query('DELETE FROM profiles WHERE id=?',[user.id]);
 }
 if(worksheet)await query('DELETE FROM worksheets WHERE id=?',[worksheet]);
 for(const id of questions)await query('DELETE FROM questions WHERE id=?',[id]);
});

it('separates THCS courses and exposes the supplied curriculum in its exact order',async()=>{
 const courses=await student.get('/api/v1/courses');expect(courses.status).toBe(200);
 expect(courses.body.data.filter(c=>c.kind==='secondary').map(c=>Number(c.level))).toEqual([6,7,8,9]);
 expect(courses.body.data.filter(c=>c.kind==='secondary').every(c=>!c.unlocked&&c.price_vnd==null)).toBe(true);
 const tree=await secondary.get('/api/v1/admin/curriculum/tree');expect(tree.status).toBe(200);
 expect(tree.body.data.grades.map(g=>g.grade)).toEqual([6,7,8,9]);
 const semesters=tree.body.data.grades.find(g=>g.grade===9).semesters;
 const chapters=semesters.flatMap(s=>s.subjects.find(subject=>subject.id==='toan').chapters);
 expect(chapters).toHaveLength(10);
 expect(semesters.map(s=>s.subjects.find(subject=>subject.id==='toan').chapters.length)).toEqual([5,5]);
 const lessons=chapters.flatMap(c=>c.lessons);expect(lessons).toHaveLength(39);
 expect(lessons.filter(l=>l.name.startsWith('Bài ')).map(l=>l.name.match(/^Bài (\d+)/)[1])).toEqual(Array.from({length:29},(_,i)=>String(i+1)));
 expect(lessons.filter(l=>l.name==='Luyện tập chung')).toHaveLength(10);
 expect(chapters[2].lessons.at(-2).name).toBe('Luyện tập chung');
 expect(chapters[2].lessons.at(-1).name).toMatch(/^Bài 10[.:]/);
 expect(chapters[5].lessons.at(-2).name).toBe('Luyện tập chung');
 expect(chapters[5].lessons.at(-1).name).toMatch(/^Bài 19[.:]/);
 const primaryTree=await primary.get('/api/v1/admin/curriculum/tree');
 expect(primaryTree.body.data.grades.map(g=>g.grade)).toEqual([1,2,3,4,5]);
});

it('blocks cross-program curriculum reads and writes, including forged scope and lesson IDs',async()=>{
 for(const [agent,wrongGrade,wrongLesson]of [[primary,9,lessonId],[secondary,1,'kntt-toan-1-b01']]){
  expect((await agent.get('/api/v1/admin/questions?lessonId='+wrongLesson)).status).toBe(403);
  expect((await agent.post('/api/v1/admin/content/chapters').send({yearId:'2026-2027',grade:wrongGrade,semester:'hk1',subjectId:'toan',name:'Không được tạo'})).status).toBe(403);
  expect((await agent.post('/api/v1/admin/content/publish-questions').send({lessonId:wrongLesson})).status).toBe(403);
  expect((await agent.post('/api/v1/admin/content/publish-questions').send({lessonId:' '+wrongLesson+' '})).status).toBe(403);
 }
 expect((await primary.get('/api/v1/admin/curriculum/tree?program=secondary')).status).toBe(403);
 expect((await secondary.get('/api/v1/chinese/catalog')).status).toBe(403);
 expect((await secondary.get('/api/v1/courses/admin/catalog')).status).toBe(403);
 expect((await primaryStudent.get('/api/v1/catalog/topics?subjectId=toan&grade=9')).status).toBe(403);
 expect((await student.get('/api/v1/catalog/topics?subjectId=toan&grade=9')).status).toBe(403);
 expect((await student.post('/api/v1/practice').send({topicId:' '+lessonId+' '})).status).toBe(403);
 expect((await student.post('/api/v1/exams').send({topicId:' '+lessonId+' '})).status).toBe(403);
 expect((await student.post('/api/v1/challenges/robot').send({topicId:' '+lessonId+' ',durationSeconds:300,botLevel:'easy'})).status).toBe(403);
});

it('lets THCS admin import drafts and publish questions in the correct grade-nine lesson',async()=>{
 const result=await secondary.post('/api/v1/admin/questions/import').send({lessonId,grade:9,subjectId:'toan',semester:'hk1',questions:Array.from({length:30},(_,i)=>({
  type:'fill_in',prompt:`Kiểm thử THCS ${i+1}: x + ${i+1} = ${i+2}. Tìm x.`,options:[],answer:{accepted:['1']},explanation:'Trừ cùng một số ở hai vế, được x = 1.',difficulty:'easy',
 }))});
 expect(result.status).toBe(201);questions.push(...result.body.data.ids);
 const draft=await secondary.get('/api/v1/admin/questions?lessonId='+lessonId);
 expect(draft.body.data.filter(q=>questions.includes(q.id)).every(q=>q.status==='draft')).toBe(true);
 expect((await primary.get('/api/v1/admin/questions/'+questions[0])).status).toBe(403);
 const published=await secondary.post('/api/v1/admin/content/publish-questions').send({lessonId});
 expect(published.status).toBe(200);expect(published.body.data.published).toBe(30);
 const granted=await root.post('/api/v1/courses/admin/access').send({username:learner.username,course_id:'grade-9',action:'grant',note:'Kiểm thử THCS'});
 expect(granted.status).toBe(200);
 const topics=await student.get('/api/v1/catalog/topics?subjectId=toan&grade=9');
 expect(topics.status).toBe(200);expect(topics.body.data.find(t=>t.id===lessonId).questionCount).toBe(30);
});

it('runs grade-nine practice, chapter exams and Robot challenges through the shared school engine',async()=>{
 const started=await student.post('/api/v1/practice').send({topicId:lessonId});expect(started.status).toBe(201);
 practice=started.body.data;expect(practice.questions).toHaveLength(10);
 expect(practice.questions.every(q=>questions.includes(q.id))).toBe(true);
 for(const question of practice.questions){
  const answered=await student.post('/api/v1/practice/'+practice.id+'/answers').send({questionId:question.id,answer:{value:'1'}});
  expect(answered.status).toBe(200);
 }
 expect((await student.post('/api/v1/practice/'+practice.id+'/finish')).status).toBe(200);
 const exam=await student.post('/api/v1/exams').set('X-Course-Id','grade-9').send({mode:'chapter',chapterId:'toan-9-c01',subjectId:'toan',yearId:'2026-2027'});
 expect(exam.status).toBe(201);expect(exam.body.data.questions).toHaveLength(30);
 expect(exam.body.data.questions.every(q=>questions.includes(q.id))).toBe(true);
 const challenge=await student.post('/api/v1/challenges/robot').send({topicId:lessonId,durationSeconds:300,botLevel:'easy'});
 expect(challenge.status).toBe(201);expect(challenge.body.data.topic.grade).toBe(9);
 const report=await student.get('/api/v1/learning/family-report').set('X-Course-Id','grade-9');
 expect(report.status).toBe(200);expect(report.body.data.recent.some(r=>r.id===practice.id)).toBe(true);
 const today=await student.get('/api/v1/learning/today').set('X-Course-Id','grade-9');
 expect(today.status).toBe(200);expect(today.body.data.topic.id).toBe(lessonId);
 const stats=await secondary.get('/api/v1/admin/stats');expect(stats.status).toBe(200);
 expect(stats.body.data.bank.questions).toBe(30);expect(stats.body.data.practiceSessions).toBe(1);
 const filtered=await root.get('/api/v1/admin/stats?program=secondary');
 expect(filtered.body.data.bank.questions).toBe(stats.body.data.bank.questions);
 const primaryStats=await primary.get('/api/v1/admin/stats');
 expect(primaryStats.body.data.topStudents.some(s=>s.profileId===learner.id)).toBe(false);
});

it('supports grade-nine worksheets while preserving primary-admin and student access boundaries',async()=>{
 const item=randomUUID();
 const body={title:'Kiểm thử phiếu Toán 9',grade:9,subject_id:'toan',lesson_id:lessonId,status:'published',items:[{id:item,type:'fill',prompt:'x + 2 = 3. Tìm x.',config:{},answer:{accepted:['1']}}]};
 expect((await primary.post('/api/v1/worksheets/admin').send(body)).status).toBe(403);
 const created=await secondary.post('/api/v1/worksheets/admin').send(body);expect(created.status).toBe(200);worksheet=created.body.data.id;
 expect((await primary.get('/api/v1/worksheets/admin/'+worksheet)).status).toBe(403);
 expect((await primaryStudent.get('/api/v1/worksheets/'+worksheet)).status).toBe(403);
 const list=await student.get('/api/v1/worksheets').set('X-Course-Id','grade-9');expect(list.status).toBe(200);expect(list.body.data.some(w=>w.id===worksheet)).toBe(true);
 const started=await student.post('/api/v1/worksheets/'+worksheet+'/start');expect(started.status).toBe(200);
 const submitted=await student.post('/api/v1/worksheets/attempts/'+started.body.data.id+'/submit').send({answers:{[item]:'1'}});
 expect(submitted.status).toBe(200);expect(Number(submitted.body.data.score)).toBe(100);
});
