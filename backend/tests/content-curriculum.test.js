import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';
let admin,student,worksheet,chapter,lesson,question;
beforeAll(async()=>{admin=await loginStudent(await createTestUser({username:'test_scope_admin',role:'admin'}));student=await loginStudent(await createTestUser({username:'test_scope_student'}));});
afterAll(async()=>{if(worksheet)await query('DELETE FROM worksheets WHERE id=?',[worksheet]);if(question)await query('DELETE FROM questions WHERE id=?',[question]);if(chapter)await query('DELETE FROM curriculum_chapters WHERE id=?',[chapter]);if(lesson)await query('DELETE FROM topics WHERE id=?',[lesson]);});
it('Toán 1 has ten official topics and 41 lessons split into the correct semesters',async()=>{
 const r=await admin.get('/api/v1/admin/curriculum/tree');expect(r.status).toBe(200);
 const semesters=r.body.data.grades.find(g=>g.grade===1).semesters;
 for(const [index,count,first,last]of [[0,20,'01','20'],[1,21,'21','41']]){
  const chapters=semesters[index].subjects.find(s=>s.id==='toan').chapters.filter(c=>c.bookLabel);
  expect(chapters).toHaveLength(5);const lessons=chapters.flatMap(c=>c.lessons);expect(lessons).toHaveLength(count);expect(lessons[0].id).toBe('kntt-toan-1-b'+first);expect(lessons.at(-1).id).toBe('kntt-toan-1-b'+last);
 }
 expect(semesters[0].subjects.find(s=>s.id==='toan').chapters.some(c=>c.isLegacy)).toBe(true);
});
it('Toán 2–5 have complete numbered lessons in the correct topics and semesters',async()=>{
 const r=await admin.get('/api/v1/admin/curriculum/tree');expect(r.status).toBe(200);
 for(const [grade,chapterEnds,semesterEnd,total]of [[2,[6,14,18,24,28,32,36,45,47,54,58,63,67,75],36,75],[3,[8,15,22,29,35,40,44,49,53,58,62,65,69,72,75,81],44,81],[4,[6,9,16,21,26,32,37,48,52,59,62,66,73],37,73],[5,[9,14,18,24,29,35,44,48,55,62,67,75],35,75]]){
  const semesters=r.body.data.grades.find(g=>g.grade===grade).semesters;
  const chapters=semesters.flatMap(s=>s.subjects.find(subject=>subject.id==='toan').chapters.filter(c=>c.bookLabel));
  expect(chapters).toHaveLength(chapterEnds.length);
  const lessons=chapters.flatMap(c=>c.lessons);expect(lessons).toHaveLength(total);
  expect(lessons.map(l=>l.id)).toEqual(Array.from({length:total},(_,i)=>`kntt-toan-${grade}-b${String(i+1).padStart(2,'0')}`));
  expect(chapters.map(c=>Number(c.lessons.at(-1).id.split('-b')[1]))).toEqual(chapterEnds);
  for(const [index,start,end]of [[0,1,semesterEnd],[1,semesterEnd+1,total]]){
   const official=semesters[index].subjects.find(s=>s.id==='toan').chapters.filter(c=>c.bookLabel).flatMap(c=>c.lessons);
   expect(official).toHaveLength(end-start+1);expect(official[0].name).toMatch(new RegExp(`^Bài ${start}\\.`));
   expect(semesters[index].subjects.find(s=>s.id==='toan').chapters.some(c=>c.isLegacy)).toBe(true);
  }
 }
});
it('saves worksheets into exact lessons and keeps other semesters and classes separate',async()=>{
 const body={title:'Scoped curriculum worksheet',grade:1,subject_id:'toan',lesson_id:'kntt-toan-1-b01',status:'published',items:[{id:randomUUID(),type:'fill',prompt:'1 + 1 = ?',config:{},answer:{accepted:['2']}}]};
 expect((await admin.post('/api/v1/worksheets/admin').send({...body,grade:2})).status).toBe(400);
 expect((await admin.post('/api/v1/worksheets/admin').send({...body,lesson_id:'missing'})).status).toBe(404);
 const created=await admin.post('/api/v1/worksheets/admin').send(body);expect(created.status).toBe(200);worksheet=created.body.data.id;expect(created.body.data.lesson_id).toBe(body.lesson_id);
 for(const [scope,expected]of [['lessonId=kntt-toan-1-b01',true],['yearId=2026-2027&grade=1&semester=hk1&subjectId=toan',true],['semester=hk2',false],['grade=2',false],['chapterId=kntt-toan-1-c02',false],['unassigned=1',false]]){
  const r=await admin.get('/api/v1/admin/content?'+scope+'&q=Scoped');expect(r.status).toBe(200);expect(r.body.data.some(w=>w.id===worksheet)).toBe(expected);
 }
 const tree=(await admin.get('/api/v1/admin/curriculum/tree')).body.data;
 const node=tree.grades[0].semesters[0].subjects.find(s=>s.id==='toan').chapters.find(c=>c.id==='kntt-toan-1-c01').lessons[0];expect(node.worksheetCount).toBeGreaterThan(0);expect(node.contentCount).toBe(node.worksheetCount+node.questionCount);
});
it('admin can add topics and lessons in another grade; students cannot author curriculum',async()=>{
 const body={yearId:'2026-2027',grade:2,semester:'hk2',subjectId:'toan',name:'Chủ đề kiểm thử riêng'};
 expect((await student.post('/api/v1/admin/content/chapters').send(body)).status).toBe(403);
 const r=await admin.post('/api/v1/admin/content/chapters').send(body);expect(r.status).toBe(200);chapter=r.body.data.id;
 const l=await admin.post('/api/v1/admin/content/lessons').send({chapterId:chapter,name:'Bài kiểm thử riêng'});expect(l.status).toBe(200);lesson=l.body.data.id;
 const tree=(await admin.get('/api/v1/admin/curriculum/tree')).body.data;
 const node=tree.grades[1].semesters[1].subjects.find(s=>s.id==='toan').chapters.find(c=>c.id===chapter);expect(node.lessons[0].id).toBe(lesson);
});
it('individual questions use the same exact lesson filters as worksheets',async()=>{
 const r=await admin.post('/api/v1/admin/questions').send({lessonId:'kntt-toan-1-b21',grade:1,subjectId:'toan',semester:'hk2',type:'fill_in',options:[],prompt:'Scoped single question: 10 + 1 = ?',answer:{accepted:['11']},difficulty:'easy',explanation:'10 + 1 = 11'});
 expect(r.status).toBe(201);question=r.body.data.id;
 for(const [scope,expected]of [['semester=hk2&lessonId=kntt-toan-1-b21',true],['semester=hk1',false],['lessonId=kntt-toan-1-b01',false]]){
  const response=await admin.get('/api/v1/admin/content?q=Scoped&'+scope);expect(response.status).toBe(200);expect(response.body.data.some(item=>item.id===question)).toBe(expected);
 }
});
