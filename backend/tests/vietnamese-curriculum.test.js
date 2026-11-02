import fs from 'node:fs/promises';
import path from 'node:path';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {createTestUser,loginStudent} from './helpers/index.js';
import {query} from '../src/config/db.js';
import {extractDocxQuestions} from '../src/services/docx-import-service.js';

let admin,student;
const questions=[],documents=[],attempts=[];
const book=JSON.parse(await fs.readFile(new URL('../seed-data/vietnamese-grade1-a.json',import.meta.url),'utf8'));
beforeAll(async()=>{
  admin=await loginStudent(await createTestUser({username:'test_tv1_admin',role:'admin'}));
  student=await loginStudent(await createTestUser({username:'test_tv1_student',grade:1}));
});
afterAll(async()=>{
  for(const id of attempts)await query('DELETE FROM exam_attempts WHERE id=?',[id]);
  for(const id of questions)await query('DELETE FROM questions WHERE id=?',[id]);
  for(const id of documents)await query('DELETE FROM word_import_documents WHERE id=?',[id]);
});

it('shows 77 grouped Vietnamese lessons in the correct semesters, separate from Math',async()=>{
  const tree=await admin.get('/api/v1/admin/curriculum/tree');expect(tree.status).toBe(200);
  const semesters=tree.body.data.grades.find(g=>g.grade===1).semesters;
  for(const [i,n,start,end] of [[0,44,'01','44'],[1,33,'45','77']]){
    const subject=semesters[i].subjects.find(s=>s.id==='tieng-viet');
    const chapters=subject.chapters.filter(c=>c.bookLabel);expect(chapters).toHaveLength(9);
    const lessons=chapters.flatMap(c=>c.lessons);expect(lessons).toHaveLength(n);
    expect(lessons[0].id).toBe('tv1-a-b'+start);expect(lessons.at(-1).id).toBe('tv1-a-b'+end);
    expect(subject.chapters.some(c=>c.isLegacy)).toBe(true);
  }
  const lessons=book.chapters.flatMap(c=>c.lessons);
  expect(lessons.find(l=>l.id==='tv1-a-b07').name).toContain('g và gh');
  expect(lessons.find(l=>l.id==='tv1-a-b10').name).toContain('ng và ngh');
});

it('archives Word, publishes a whole lesson and builds Vietnamese-only scoped exams',async()=>{
  for(const [semester,id] of [['hk1','tv1-a-b01'],['hk2','tv1-a-b45']]){
    const number=Number(id.split('-b')[1]);
    const folder=new URL(`../../tai-lieu/tieng-viet-lop-1-phuong-an-a/${semester}/`,import.meta.url);
    const filename=(await fs.readdir(folder)).find(f=>f.startsWith(`50-cau-tieng-viet-lop-1-bai-${String(number).padStart(2,'0')}-`));
    const buffer=await fs.readFile(new URL(filename,folder));
    const extracted=await extractDocxQuestions(buffer,filename);expect(extracted.questions).toHaveLength(50);
    expect(extracted.issues).toEqual([]);
    if(semester==='hk2')expect(extracted.questions.every(q=>q.prompt.includes('Đọc đoạn văn tự soạn:'))).toBe(true);
    const payload={lessonId:id,grade:1,subjectId:'tieng-viet',semester,questions:extracted.questions};
    const imported=await admin.post('/api/v1/admin/questions/import/file').field('payload',JSON.stringify(payload)).attach('file',buffer,filename);
    expect(imported.status).toBe(201);questions.push(...imported.body.data.ids);documents.push(imported.body.data.documentId);
    const [stored]=await query('SELECT original FROM word_import_documents WHERE id=?',[imported.body.data.documentId]);
    expect(stored.original.equals(buffer)).toBe(true);
    const rows=await query('SELECT status,topic_id FROM questions WHERE import_document_id=?',[imported.body.data.documentId]);
    expect(rows).toHaveLength(50);expect(rows.every(q=>q.status==='draft'&&q.topic_id===id)).toBe(true);
    const published=await admin.post('/api/v1/admin/content/publish-questions').send({lessonId:id});
    expect(published.status).toBe(200);expect(published.body.data.published).toBe(50);
  }
  const catalog=await student.get('/api/v1/exams/catalog?subjectId=tieng-viet').set('X-Course-Id','grade-1');
  expect(catalog.status).toBe(200);expect(catalog.body.data.chapters).toHaveLength(18);
  for(const [scope,n,semester] of [[{mode:'chapter',chapterId:'tv1-a-c01'},30,'hk1'],[{mode:'semester',semester:'hk2'},50,'hk2'],[{mode:'annual'},50,null]]){
    const exam=await student.post('/api/v1/exams').set('X-Course-Id','grade-1').send({subjectId:'tieng-viet',...scope});
    expect(exam.status).toBe(201);attempts.push(exam.body.data.id);
    expect(exam.body.data.questions).toHaveLength(n);expect(new Set(exam.body.data.questions.map(q=>q.id)).size).toBe(n);
    const placements=await query('SELECT DISTINCT t.subject_id,c.semester FROM exam_questions eq JOIN questions q ON q.id=eq.question_id JOIN topics t ON t.id=q.topic_id JOIN curriculum_lessons l ON l.topic_id=t.id JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE eq.attempt_id=?',[exam.body.data.id]);
    expect(placements.every(p=>p.subject_id==='tieng-viet')).toBe(true);
    if(semester)expect(placements.every(p=>p.semester===semester)).toBe(true);
    else expect(placements.map(p=>p.semester).sort()).toEqual(['hk1','hk2']);
  }
});
