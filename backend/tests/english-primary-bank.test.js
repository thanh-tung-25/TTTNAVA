import fs from 'node:fs/promises';
import {it,expect} from 'vitest';
import {query} from '../src/config/db.js';
import {extractDocxQuestions} from '../src/services/docx-import-service.js';
import {validateQuestionPayload} from '../src/services/admin-question-validation.js';

it('English 1–5 have complete Global Success Units and separate review sets in both semesters',async()=>{
  for(const grade of [1,2,3,4,5]){
    const book=JSON.parse(await fs.readFile(new URL(`../seed-data/english-grade${grade}-gs.json`,import.meta.url),'utf8'));
    const units=grade<=2?16:20;const lessons=book.chapters.flatMap(c=>c.lessons);
    expect(book.chapters).toHaveLength(4);expect(lessons).toHaveLength(grade<=2?24:29);
    expect(lessons.filter(l=>l.kind==='unit').map(l=>l.unitNumbers[0])).toEqual(Array.from({length:units},(_,i)=>i+1));
    expect(lessons.filter(l=>l.kind==='review')).toHaveLength(4);expect(lessons.filter(l=>l.kind==='fun')).toHaveLength(grade<=3?4:0);
    expect(lessons.filter(l=>l.kind==='extension')).toHaveLength(grade>=4?4:0);
    expect(lessons.filter(l=>l.kind==='starter')).toHaveLength(grade<=2?0:1);
    const midpoint=units/2;
    for(const chapter of book.chapters){
      for(const lesson of chapter.lessons){
        expect(lesson.unitNumbers.every(n=>chapter.semester==='hk1'?n<=midpoint:n>midpoint)).toBe(true);
      }
      const rows=await query('SELECT l.id,c.semester,c.subject_id,c.grade FROM curriculum_lessons l JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.chapter_id=?',[chapter.id]);
      expect(rows).toHaveLength(chapter.lessons.length);expect(rows.every(r=>r.subject_id==='tieng-anh'&&r.grade===grade&&r.semester===chapter.semester)).toBe(true);
    }
  }
  for(const [id,title] of [['gs-en-1-u03','At the street market'],['gs-en-1-u06','In the classroom'],['gs-en-1-u13','In the school canteen'],['gs-en-1-u16','At home'],['gs-en-2-u13','In the maths class'],['gs-en-3-u05','My hobbies'],['gs-en-3-u12','Jobs'],['gs-en-4-u20','At summer camp'],['gs-en-5-u02','Our homes'],['gs-en-5-u06','Our school rooms']]){
    const [row]=await query('SELECT name FROM curriculum_lessons WHERE id=?',[id]);expect(row.name).toContain(title);
  }
});

it('all 135 English Word documents contain 50 valid questions without missing pictures or audio',async()=>{
  let total=0,files=0;
  for(const grade of [1,2,3,4,5]){
    let gradeFiles=0;
    for(const semester of ['hk1','hk2']){
      const folder=new URL(`../../tai-lieu/tieng-anh-lop-1-den-5-50-cau/lop-${grade}/${semester}/`,import.meta.url);
      for(const filename of (await fs.readdir(folder)).filter(f=>f.endsWith('.docx'))){
        const parsed=await extractDocxQuestions(await fs.readFile(new URL(filename,folder)),filename);
        expect(parsed.questions,filename).toHaveLength(50);expect(parsed.issues,filename).toEqual([]);
        expect(parsed.metadata).toMatchObject({subjectId:'tieng-anh',grade});
        expect(new Set(parsed.questions.map(q=>q.prompt)).size).toBe(50);
        for(const q of parsed.questions){
          expect(()=>validateQuestionPayload(q.type,q)).not.toThrow();
          expect(q.prompt).not.toMatch(/listen and|look at the picture|nghe (?:và|đoạn)|nhìn tranh/i);
        }
        files++;gradeFiles++;total+=parsed.questions.length;
      }
    }
    expect(gradeFiles).toBe(grade<=2?24:29);
  }
  expect(files).toBe(135);expect(total).toBe(6750);
},30000);
