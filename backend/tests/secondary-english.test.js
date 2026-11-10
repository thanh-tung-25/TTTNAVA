import {beforeAll,afterAll,it,expect} from 'vitest';
import {query,withTransaction} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';
import {loadSecondaryEnglishBooks,seedSecondaryEnglishCatalog} from '../scripts/lib/seed-english-secondary.mjs';

let books,admin,primary,student,learner,practice;
const users=[],questions=[];
beforeAll(async()=>{
 books=await loadSecondaryEnglishBooks();
 for(const options of [{role:'admin',adminScope:'secondary'},{role:'admin',adminScope:'primary'},{grade:9,enrolled:false}])users.push(await createTestUser(options));
 [admin,primary,student]=await Promise.all(users.map(loginStudent));learner=users[2];
 await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-9','admin')",[learner.id]);
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

it('places 12 Global Success units and four reviews in the correct grade, volume and sequence',async()=>{
 const tree=await admin.get('/api/v1/admin/curriculum/tree');expect(tree.status).toBe(200);
 for(const book of books){
  const grade=tree.body.data.grades.find(g=>g.grade===book.grade);
  const subjects=grade.semesters.map(s=>s.subjects.find(subject=>subject.id==='tieng-anh'));
  expect(subjects.map(s=>s.name)).toEqual(['Tiếng Anh','Tiếng Anh']);
  expect(subjects.map(s=>s.chapters.length)).toEqual([8,8]);
  const chapters=subjects.flatMap(s=>s.chapters);
  expect(chapters.map(c=>c.id)).toEqual(book.chapters.map(c=>c.id));
  expect([3,7,11,15].map(index=>chapters[index].name)).toEqual(book.chapters.filter(c=>/-r\d+$/.test(c.id)).map(c=>c.name));
  const catalog=await admin.get(`/api/v1/catalog/topics?subjectId=tieng-anh&grade=${book.grade}`);
  expect(catalog.status).toBe(200);
  expect(catalog.body.data.map(t=>t.id)).toEqual(book.chapters.flatMap(c=>c.lessons.map(l=>l.id)));
  expect(catalog.body.data.every(t=>t.bookLabel.includes('Global Success'))).toBe(true);
 }
 const primaryTree=await primary.get('/api/v1/admin/curriculum/tree');
 expect(primaryTree.body.data.grades.every(g=>g.grade<=5)).toBe(true);
 expect((await student.get('/api/v1/catalog/topics?subjectId=tieng-anh&grade=6')).status).toBe(403);
});

it('imports and publishes English questions in their unit and keeps practice, exams and history in English subject scope',async()=>{
 const book=books.find(b=>b.grade===9),lesson=book.chapters[0].lessons[0];
 const imported=await admin.post('/api/v1/admin/questions/import').send({lessonId:lesson.id,grade:9,subjectId:'tieng-anh',semester:'hk1',questions:Array.from({length:30},(_,i)=>({
  type:'fill_in',prompt:`English test ${i+1}: We ___ English every day.`,options:[],answer:{accepted:['study']},explanation:'We study English every day.',difficulty:'easy',
 }))});
 expect(imported.status).toBe(201);questions.push(...imported.body.data.ids);
 expect((await primary.get('/api/v1/admin/questions/'+questions[0])).status).toBe(403);
 const unpublished=await student.get('/api/v1/catalog/topics?subjectId=tieng-anh&grade=9');
 expect(unpublished.body.data.find(t=>t.id===lesson.id).questionCount).toBe(0);
 expect((await admin.post('/api/v1/admin/content/publish-questions').send({lessonId:lesson.id})).status).toBe(200);
 const started=await student.post('/api/v1/practice').send({topicId:lesson.id});expect(started.status).toBe(201);practice=started.body.data;
 expect(practice.topic).toMatchObject({subjectId:'tieng-anh',subjectName:'Tiếng Anh',grade:9});expect(practice.questions).toHaveLength(10);
 for(const q of practice.questions)expect((await student.post('/api/v1/practice/'+practice.id+'/answers').send({questionId:q.id,answer:{value:'study'}})).status).toBe(200);
 expect((await student.post('/api/v1/practice/'+practice.id+'/finish')).status).toBe(200);
 const history=await student.get('/api/v1/practice/history');
 expect(history.body.data.find(h=>h.id===practice.id).subjectName).toBe('Tiếng Anh');
 const exam=await student.post('/api/v1/exams').set('X-Course-Id','grade-9').send({mode:'chapter',chapterId:book.chapters[0].id,subjectId:'tieng-anh',yearId:'2026-2027'});
 expect(exam.status).toBe(201);expect(exam.body.data.topic.subjectId).toBe('tieng-anh');expect(exam.body.data.questions).toHaveLength(30);
});

it('repeated English seeds keep authored content, course prices and existing questions intact',async()=>{
 const rollback=Error('ROLLBACK_ENGLISH_SEED_TEST'),topic=books[0].chapters[0].lessons[0].id;
 const [initial]=await query('SELECT (SELECT COUNT(*) FROM topics WHERE grade>=6) topics,(SELECT COUNT(*) FROM questions) questions');
 try{
  await withTransaction(async connection=>{
   const run=async(sql,params)=>(await connection.query(sql,params))[0];
   await run('UPDATE topics SET name=? WHERE id=?',['Tên đã biên tập',topic]);
   await run("UPDATE courses SET price_vnd=345678,description='Mô tả riêng của giáo viên' WHERE id='grade-6'");
   await seedSecondaryEnglishCatalog(run);await seedSecondaryEnglishCatalog(run);
   expect((await run('SELECT name FROM topics WHERE id=?',[topic]))[0].name).toBe('Tên đã biên tập');
   expect((await run("SELECT price_vnd,description FROM courses WHERE id='grade-6'"))[0]).toMatchObject({price_vnd:345678,description:'Mô tả riêng của giáo viên'});
   expect((await run('SELECT (SELECT COUNT(*) FROM topics WHERE grade>=6) topics,(SELECT COUNT(*) FROM questions) questions'))[0]).toEqual(initial);
   throw rollback;
  });
 }catch(error){if(error!==rollback)throw error;}
});
