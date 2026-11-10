import {it,expect} from 'vitest';
import {loadSecondaryBook,seedSecondaryCatalog} from '../scripts/lib/seed-secondary.mjs';

it('preserves all 29 numbered lessons, ten review sections and the supplied volume split',async()=>{
  const book=await loadSecondaryBook();
  expect(book.chapters).toHaveLength(10);
  expect(book.chapters.slice(0,5).every(chapter=>chapter.semester==='hk1'&&chapter.volumeId==='tap-1')).toBe(true);
  expect(book.chapters.slice(5).every(chapter=>chapter.semester==='hk2'&&chapter.volumeId==='tap-2')).toBe(true);
  expect(book.chapters.flatMap(chapter=>chapter.lessons).filter(lesson=>lesson.name==='Luyện tập chung')).toHaveLength(10);
  expect(book.chapters[2].lessons.map(lesson=>lesson.id)).toEqual(['toan-9-b07','toan-9-b08','toan-9-b09','toan-9-c03-ltc','toan-9-b10']);
  expect(book.chapters[5].lessons.map(lesson=>lesson.id)).toEqual(['toan-9-b16','toan-9-b17','toan-9-b18','toan-9-c06-ltc','toan-9-b19']);
  expect(book.chapters[5].lessons[0].name).toContain('y = ax² (a ≠ 0)');
});

it.each([false,true])('seeds independent lesson topics without publishing questions or granting enrollments (postgres=%s)',async postgres=>{
  const writes=[];
  const result=await seedSecondaryCatalog(async(sql,params)=>writes.push({sql,params}),{postgres});
  expect(result).toEqual({courses:4,chapters:10,lessons:39});
  expect(writes).toHaveLength(92);
  expect(writes.every(write=>write.sql.startsWith('INSERT '))).toBe(true);
  expect(writes.some(write=>/questions|course_enrollments/.test(write.sql))).toBe(false);
  const courses=writes.filter(write=>write.sql.includes('INTO courses '));
  expect(courses.map(write=>write.params[0])).toEqual(['grade-6','grade-7','grade-8','grade-9']);
  expect(courses.every(write=>!write.sql.includes('price_vnd'))).toBe(true);
  const topics=writes.filter(write=>write.sql.includes('INTO topics '));
  const lessons=writes.filter(write=>write.sql.includes('INTO curriculum_lessons '));
  expect(topics.map(write=>write.params[0])).toEqual(lessons.map(write=>write.params[2]));
  expect(topics.map(write=>write.params[5])).toEqual(Array.from({length:39},(_,i)=>i+1));
  expect(lessons.every(write=>write.params[0]===write.params[2])).toBe(true);
  expect(writes.every(write=>postgres?write.sql.endsWith('ON CONFLICT DO NOTHING'):write.sql.startsWith('INSERT IGNORE'))).toBe(true);
});
