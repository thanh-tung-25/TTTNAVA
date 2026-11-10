import fs from 'node:fs/promises';

export const secondaryCourses = [6,7,8,9].map(level => ({
  id: `grade-${level}`, kind: 'secondary', level, title: `Lớp ${level}`,
  description: level === 9
    ? 'Toán 9 theo tập, chương và bài học; luyện tập, thi thử và thách đấu.'
    : `Chương trình THCS lớp ${level}. Nội dung đang được bổ sung.`,
}));

export function validateSecondaryBook(book) {
  const lessons=book.chapters.flatMap(chapter=>chapter.lessons);
  const numbered=lessons.filter(lesson=>/^toan-9-b\d{2}$/.test(lesson.id));
  if(book.grade!==9 || book.chapters.length!==10 || lessons.length!==39
      || new Set(book.chapters.map(chapter=>chapter.id)).size!==10
      || new Set(lessons.map(lesson=>lesson.id)).size!==39
      || numbered.map(lesson=>lesson.id).join(',')!==Array.from({length:29},(_,i)=>`toan-9-b${String(i+1).padStart(2,'0')}`).join(',')) {
    throw new Error('Mục lục Toán 9 phải có 10 chương, 29 bài và 10 mục Luyện tập chung.');
  }
  for(const [index,chapter] of book.chapters.entries()) {
    const volume=book.volumes.find(item=>item.id===chapter.volumeId);
    if(!volume || chapter.semester!==(index<5?'hk1':'hk2') || volume.semester!==chapter.semester
        || chapter.lessons.filter(lesson=>lesson.name==='Luyện tập chung').length!==1
        || chapter.lessons.some((lesson,i)=>lesson.sortOrder!==i+1 || lesson.name.length>120)
        || chapter.name.length>160 || `${book.book} · ${volume.name}`.length>160) {
      throw new Error(`Chương Toán 9 không hợp lệ: ${chapter.id}`);
    }
  }
  return book;
}

export async function loadSecondaryBook() {
  return validateSecondaryBook(JSON.parse(await fs.readFile(new URL('../../seed-data/math-grade9.json',import.meta.url),'utf8')));
}

// run(sql, params) may be a MySQL connection or the shared database query wrapper.
// The caller owns the transaction. Existing names, fees and authored content survive reruns.
export async function seedSecondaryCatalog(run,{postgres=false,book}={}) {
  book=validateSecondaryBook(book || await loadSecondaryBook());
  const insert=async(table,columns,values)=>{
    const sql=`INSERT ${postgres?'':'IGNORE '}INTO ${table} (${columns.join(',')}) VALUES (${values.map(()=>'?').join(',')})${postgres?' ON CONFLICT DO NOTHING':''}`;
    await run(sql,values);
  };
  for(const course of secondaryCourses) {
    await insert('courses',['id','kind','level','title','description','payment_instructions'],
      [course.id,course.kind,course.level,course.title,course.description,'']);
  }
  let topicOrder=0;
  for(const chapter of book.chapters) {
    const volume=book.volumes.find(item=>item.id===chapter.volumeId);
    await insert('curriculum_chapters',
      ['id','school_year_id','grade','semester','subject_id','name','slug','sort_order','book_label'],
      [chapter.id,book.yearId,book.grade,chapter.semester,'toan',chapter.name,chapter.id,chapter.sortOrder,`${book.book} · ${volume.name}`]);
    for(const lesson of chapter.lessons) {
      await insert('topics',['id','subject_id','grade','name','slug','sort_order'],
        [lesson.id,'toan',book.grade,lesson.name,lesson.id,++topicOrder]);
      await insert('curriculum_lessons',['id','chapter_id','topic_id','name','sort_order'],
        [lesson.id,chapter.id,lesson.id,lesson.name,lesson.sortOrder]);
    }
  }
  return {courses:secondaryCourses.length,chapters:book.chapters.length,lessons:book.chapters.reduce((n,chapter)=>n+chapter.lessons.length,0)};
}
