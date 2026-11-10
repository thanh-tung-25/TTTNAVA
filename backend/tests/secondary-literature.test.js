import {beforeAll,afterAll,it,expect} from 'vitest';
import {query,withTransaction} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';
import {loadLiteratureBooks,seedLiteratureCatalog} from '../scripts/lib/seed-literature.mjs';
import {parseMetadata} from '../src/services/question-import-format.js';

let books,admin,primary,student,learner,practice;
const users=[],questions=[];
beforeAll(async()=>{
 books=await loadLiteratureBooks();
 for(const options of [{role:'admin',adminScope:'secondary'},{role:'admin',adminScope:'primary'},{grade:6,enrolled:false}]){
  const user=await createTestUser(options);users.push(user);
 }
 [admin,primary,student]=await Promise.all(users.map(loginStudent));learner=users[2];
 await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-6','admin')",[learner.id]);
});
afterAll(async()=>{
 for(const id of questions)await query('DELETE FROM atomic_question_writes WHERE question_id=?',[id]);
 for(const user of users){
  await query('DELETE FROM exam_attempts WHERE student_id=?',[user.id]);
  await query('DELETE FROM practice_sessions WHERE student_id=?',[user.id]);
  await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);
  await query('DELETE FROM profiles WHERE id=?',[user.id]);
 }
 for(const id of questions)await query('DELETE FROM questions WHERE id=?',[id]);
});

it('exposes the correct Ngữ văn books for each THCS grade while retaining primary Tiếng Việt',async()=>{
 const tree=await admin.get('/api/v1/admin/curriculum/tree');expect(tree.status).toBe(200);
 for(const book of books){
  const grade=tree.body.data.grades.find(g=>g.grade===book.grade);
  const subjects=grade.semesters.map(s=>s.subjects.find(subject=>subject.id==='tieng-viet'));
  expect(subjects.map(s=>s.name)).toEqual(['Ngữ văn','Ngữ văn']);
  expect(subjects.map(s=>s.chapters.length)).toEqual([5,5]);
  expect(subjects.flatMap(s=>s.chapters.map(c=>c.name))).toEqual(book.chapters.map(c=>c.name));
  const topics=await admin.get(`/api/v1/catalog/topics?subjectId=tieng-viet&grade=${book.grade}`);
  expect(topics.status).toBe(200);
  expect(topics.body.data.map(t=>t.id)).toEqual(book.chapters.flatMap(c=>c.lessons.map(l=>l.id)));
  expect(topics.body.data.every(t=>t.bookLabel.includes('Kết nối tri thức'))).toBe(true);
 }
 const school=await student.get('/api/v1/catalog/subjects').set('X-Course-Id','grade-6');
 expect(school.body.data.find(s=>s.id==='tieng-viet').name).toBe('Ngữ văn');
 const elementary=await primary.get('/api/v1/admin/curriculum/tree');
 expect(elementary.body.data.grades[0].semesters[0].subjects.find(s=>s.id==='tieng-viet').name).toBe('Tiếng Việt');
 expect(parseMetadata(['Môn: Ngữ văn','Lớp: 6'])).toMatchObject({subjectId:'tieng-viet',grade:6});
});

it('imports literature questions into the exact lesson and uses Ngữ văn in practice, history and reports',async()=>{
 const lesson=books.find(b=>b.grade===6).chapters[0].lessons[0],chapterId='kntt-nguvan-6-c01';
 const result=await admin.post('/api/v1/admin/questions/import').send({lessonId:lesson.id,grade:6,subjectId:'tieng-viet',semester:'hk1',questions:Array.from({length:30},(_,i)=>({
  type:'fill_in',prompt:`Kiểm thử Ngữ văn ${i+1}: Điền tên mạch học về đọc văn bản.`,options:[],answer:{accepted:['Đọc']},explanation:'Mạch Đọc dành cho việc đọc và tìm hiểu văn bản.',difficulty:'easy',
 }))});
 expect(result.status).toBe(201);questions.push(...result.body.data.ids);
 expect((await primary.get('/api/v1/admin/questions/'+questions[0])).status).toBe(403);
 expect((await admin.post('/api/v1/admin/content/publish-questions').send({lessonId:lesson.id})).status).toBe(200);
 const started=await student.post('/api/v1/practice').send({topicId:lesson.id});
 expect(started.status).toBe(201);practice=started.body.data;
 expect(practice.topic.subjectName).toBe('Ngữ văn');expect(practice.questions).toHaveLength(10);
 for(const q of practice.questions)expect((await student.post('/api/v1/practice/'+practice.id+'/answers').send({questionId:q.id,answer:{value:'Đọc'}})).status).toBe(200);
 expect((await student.post('/api/v1/practice/'+practice.id+'/finish')).status).toBe(200);
 const history=await student.get('/api/v1/practice/history');
 expect(history.body.data.find(h=>h.id===practice.id).subjectName).toBe('Ngữ văn');
 const report=await student.get('/api/v1/learning/family-report').set('X-Course-Id','grade-6');
 expect(report.body.data.subjects.find(s=>s.id==='tieng-viet').title).toBe('Ngữ văn');
 const exam=await student.post('/api/v1/exams').set('X-Course-Id','grade-6').send({mode:'chapter',chapterId,subjectId:'tieng-viet',yearId:'2026-2027'});
 expect(exam.status).toBe(201);expect(exam.body.data.topic.subjectName).toBe('Ngữ văn');
 expect(exam.body.data.topic.name).toContain('Ngữ văn lớp 6');
});

it('repeated literature seeds preserve authored lesson names, questions and course pricing',async()=>{
 const rollback=Error('ROLLBACK_LITERATURE_SEED_TEST'),topic=books[0].chapters[0].lessons[0].id;
 const [initial]=await query('SELECT (SELECT COUNT(*) FROM topics WHERE grade>=6) topics,(SELECT COUNT(*) FROM questions) questions');
 try{
  await withTransaction(async connection=>{
   const run=async(sql,params)=>(await connection.query(sql,params))[0];
   await run('UPDATE topics SET name=? WHERE id=?',['Tên đã biên tập',topic]);
   await run("UPDATE courses SET price_vnd=123456,description='Mô tả đã biên tập' WHERE id='grade-6'");
   await seedLiteratureCatalog(run);await seedLiteratureCatalog(run);
   expect((await run('SELECT name FROM topics WHERE id=?',[topic]))[0].name).toBe('Tên đã biên tập');
   const [course]=await run("SELECT price_vnd,description FROM courses WHERE id='grade-6'");
   expect(course).toMatchObject({price_vnd:123456,description:'Mô tả đã biên tập'});
   const [after]=await run('SELECT (SELECT COUNT(*) FROM topics WHERE grade>=6) topics,(SELECT COUNT(*) FROM questions) questions');
   expect(after).toEqual(initial);throw rollback;
  });
 }catch(error){if(error!==rollback)throw error;}
});
