import fs from 'node:fs/promises';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';

let admin,student;
const questions=[],documents=[],exams=[],practices=[];
const source=await fs.readFile(new URL('../../frontend/assets/templates/mau-nhap-cau-hoi.docx',import.meta.url));
beforeAll(async()=>{
  admin=await loginStudent(await createTestUser({username:'test_parity_admin',role:'admin'}));
  student=await loginStudent(await createTestUser({username:'test_parity_student',grade:1}));
});
afterAll(async()=>{
  for(const id of exams)await query('DELETE FROM exam_attempts WHERE id=?',[id]);
  for(const id of practices)await query('DELETE FROM practice_sessions WHERE id=?',[id]);
  for(const id of questions)await query('DELETE FROM questions WHERE id=?',[id]);
  for(const id of documents)await query('DELETE FROM word_import_documents WHERE id=?',[id]);
});

for(const subjectId of ['toan','tieng-viet','tieng-anh']){
  it(`${subjectId}: admin imports Word and publishes lessons; students get practice and scoped exams`,async()=>{
    let firstChapter,firstTopic;
    for(const semester of ['hk1','hk2']){
      const [lesson]=await query(`SELECT l.id,l.topic_id,c.id chapter_id FROM curriculum_lessons l
        JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE c.subject_id=? AND c.grade=1
        AND c.semester=? AND c.is_legacy=0 ORDER BY c.sort_order,l.sort_order LIMIT 1`,[subjectId,semester]);
      expect(lesson).toBeTruthy();
      if(semester==='hk1'){firstChapter=lesson.chapter_id;firstTopic=lesson.topic_id;}
      // The import preview is editable: send the reviewed payload and retain
      // the original Word, using exactly the same endpoint for all subjects.
      const payload={lessonId:lesson.id,grade:1,subjectId,semester,questions:Array.from({length:50},(_,i)=>({type:'fill_in',prompt:`Parity ${subjectId} ${semester} ${i}: Điền tiếng còn thiếu: con ...`,options:[],answer:{accepted:['mèo']},explanation:'Điền tiếng mèo.',difficulty:'easy'}))};
      const imported=await admin.post('/api/v1/admin/questions/import/file').field('payload',JSON.stringify(payload)).attach('file',source,`parity-${subjectId}-${semester}.docx`);
      expect(imported.status).toBe(201);questions.push(...imported.body.data.ids);documents.push(imported.body.data.documentId);
      const [stored]=await query('SELECT lesson_id,original,question_count FROM word_import_documents WHERE id=?',[imported.body.data.documentId]);
      expect(stored.lesson_id).toBe(lesson.id);expect(stored.original.equals(source)).toBe(true);expect(stored.question_count).toBe(50);
      expect((await student.post('/api/v1/admin/content/publish-questions').send({lessonId:lesson.id})).status).toBe(403);
      const published=await admin.post('/api/v1/admin/content/publish-questions').send({lessonId:lesson.id});
      expect(published.status).toBe(200);expect(published.body.data.published).toBe(50);
    }
    const practice=await student.post('/api/v1/practice').set('X-Course-Id','grade-1').send({topicId:firstTopic});
    expect(practice.status).toBe(201);practices.push(practice.body.data.id);expect(practice.body.data.questions).toHaveLength(10);
    const catalog=await student.get('/api/v1/exams/catalog?subjectId='+subjectId).set('X-Course-Id','grade-1');
    expect(catalog.status).toBe(200);expect(catalog.body.data.subjectId).toBe(subjectId);
    for(const [scope,n] of [[{mode:'chapter',chapterId:firstChapter},30],[{mode:'semester',semester:'hk1'},50],[{mode:'annual'},50]]){
      const exam=await student.post('/api/v1/exams').set('X-Course-Id','grade-1').send({subjectId,...scope});
      expect(exam.status).toBe(201);exams.push(exam.body.data.id);expect(exam.body.data.questions).toHaveLength(n);
      const rows=await query('SELECT DISTINCT t.subject_id,c.semester FROM exam_questions eq JOIN questions q ON q.id=eq.question_id JOIN topics t ON t.id=q.topic_id JOIN curriculum_lessons l ON l.topic_id=t.id JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE eq.attempt_id=?',[exam.body.data.id]);
      expect(rows.every(r=>r.subject_id===subjectId)).toBe(true);
      if(scope.mode==='semester')expect(rows.every(r=>r.semester==='hk1')).toBe(true);
      if(scope.mode==='annual')expect(rows.map(r=>r.semester).sort()).toEqual(['hk1','hk2']);
    }
  });
}
