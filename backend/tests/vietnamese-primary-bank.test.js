import fs from 'node:fs/promises';
import path from 'node:path';
import {it,expect} from 'vitest';
import {extractDocxQuestions} from '../src/services/docx-import-service.js';
import {validateQuestionPayload} from '../src/services/admin-question-validation.js';
import {query} from '../src/config/db.js';

const folder=new URL('../../tai-lieu/tieng-viet-lop-2-den-5-50-cau/',import.meta.url);
it('KNTT Vietnamese grades 2–5 retain volume numbering, all review units and corrected titles',async()=>{
  for(const grade of [2,3,4,5]){
    const book=JSON.parse(await fs.readFile(new URL(`../seed-data/vietnamese-grade${grade}-kntt.json`,import.meta.url),'utf8'));
    const lessons=book.chapters.flatMap(c=>c.lessons);
    expect(new Set(lessons.map(l=>l.id)).size).toBe(66);
    for(const [semester,count,total] of [['hk1',32,34],['hk2',30,32]]){
      const units=book.chapters.filter(c=>c.semester===semester).flatMap(c=>c.lessons);
      expect(units).toHaveLength(total);
      expect(units.filter(l=>l.kind==='lesson').map(l=>l.numberInVolume)).toEqual(Array.from({length:count},(_,i)=>i+1));
      expect(units.filter(l=>l.kind==='review')).toHaveLength(2);
      const rows=await query('SELECT l.id,c.semester,c.grade,c.subject_id FROM curriculum_lessons l JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.id IN (?)',[units.map(l=>l.id)]);
      expect(rows).toHaveLength(total);expect(rows.every(r=>r.grade===grade&&r.semester===semester&&r.subject_id==='tieng-viet')).toBe(true);
    }
    const old=await query('SELECT is_legacy FROM curriculum_chapters WHERE id IN (?,?)',[`chapter-tieng-viet-${grade}-hk1`,`chapter-tieng-viet-${grade}-hk2`]);
    expect(old.every(c=>c.is_legacy===1)).toBe(true);
  }
  const rows=await query('SELECT id,name FROM curriculum_lessons WHERE id IN (?)',[[
    'kntt-tv-2-hk1-b01','kntt-tv-3-hk1-b03','kntt-tv-3-hk2-b07',
    'kntt-tv-4-hk1-b05','kntt-tv-4-hk2-b26','kntt-tv-5-hk1-b01',
    'kntt-tv-5-hk1-b16','kntt-tv-5-hk2-b16']]);
  const names=Object.fromEntries(rows.map(r=>[r.id,r.name]));
  for(const [id,title] of [['2-hk1-b01','Tôi là học sinh lớp 2'],['3-hk1-b03','Cánh rừng trong nắng'],['3-hk2-b07','Mặt trời xanh của tôi'],['4-hk1-b05','Thằn lằn xanh và tắc kè'],['4-hk2-b26','Ngôi nhà của yêu thương'],['5-hk1-b01','Thanh âm của gió'],['5-hk1-b16','Xin chào, Xa-ha-ra'],['5-hk2-b16','Về thăm Đất Mũi']])expect(names['kntt-tv-'+id]).toContain(title);
});

it('all 264 Word files provide 50 valid independent questions and a separate writing activity',async()=>{
  let total=0;
  for(const grade of [2,3,4,5])for(const semester of ['hk1','hk2']){
    const dir=new URL(`lop-${grade}/${semester}/`,folder);
    const files=(await fs.readdir(dir)).filter(f=>f.endsWith('.docx'));
    expect(files).toHaveLength(semester==='hk1'?34:32);
    for(const filename of files){
      const parsed=await extractDocxQuestions(await fs.readFile(new URL(filename,dir)),filename);
      expect(parsed.questions,filename).toHaveLength(50);expect(parsed.issues,filename).toEqual([]);
      expect(parsed.metadata).toMatchObject({subjectId:'tieng-viet',grade});
      expect(new Set(parsed.questions.map(q=>q.prompt)).size).toBe(50);
      expect(parsed.questions.slice(0,20).every(q=>q.prompt.startsWith('Đọc ngữ liệu bổ trợ tự soạn:'))).toBe(true);
      for(const q of parsed.questions)expect(()=>validateQuestionPayload(q.type,q)).not.toThrow();
      total+=parsed.questions.length;
    }
  }
  expect(total).toBe(13200);
},30000);
