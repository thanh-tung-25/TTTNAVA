import fs from 'node:fs/promises';

export const secondaryEnglishGrades=[6,7,8,9];
export function validateSecondaryEnglishBook(book){
 const chapters=book.chapters||[],lessons=chapters.flatMap(c=>c.lessons||[]);
 if(!secondaryEnglishGrades.includes(book.grade)||book.subjectId!=='tieng-anh'||chapters.length!==16
  ||book.volumes?.length!==2||new Set(chapters.map(c=>c.id)).size!==16
  ||new Set(lessons.map(l=>l.id)).size!==lessons.length||!book.sources?.length){
  throw Error('Mục lục Tiếng Anh THCS phải có đúng lớp, môn, 2 tập, 12 Unit, 4 Review và nguồn đối chiếu.');
 }
 for(const [index,chapter]of chapters.entries()){
  const review=(index+1)%4===0,unit=index+1-Math.floor((index+1)/4),number=review?(index+1)/4:unit;
  const expected=`gs-tieng-anh-${book.grade}-${review?'r':'u'}${String(number).padStart(2,'0')}`;
  const semester=index<8?'hk1':'hk2',volume=book.volumes.find(v=>v.id===chapter.volumeId);
  if(chapter.id!==expected||chapter.semester!==semester||volume?.semester!==semester||chapter.sortOrder!==index+1
   ||!chapter.lessons.length||!chapter.name||chapter.name.length>160
   ||`${book.book} · ${volume.name}`.length>160
   ||chapter.lessons.some((lesson,i)=>!lesson.name||lesson.name.length>120||lesson.id.length>60||lesson.sortOrder!==i+1)){
   throw Error(`Mục lục Tiếng Anh ${book.grade} không hợp lệ tại ${chapter.id}.`);
  }
 }
 return book;
}
export async function loadSecondaryEnglishBooks(){
 return Promise.all(secondaryEnglishGrades.map(async grade=>validateSecondaryEnglishBook(JSON.parse(
  await fs.readFile(new URL(`../../seed-data/english-grade${grade}-gs.json`,import.meta.url),'utf8'),
 ))));
}
export async function seedSecondaryEnglishCatalog(run,{postgres=false,books}={}){
 books=(books||await loadSecondaryEnglishBooks()).map(validateSecondaryEnglishBook);
 const ids=books.flatMap(book=>book.chapters.flatMap(c=>[c.id,...c.lessons.map(l=>l.id)]));
 if(new Set(ids).size!==ids.length||new Set(books.map(b=>b.grade)).size!==books.length)throw Error('Mã mục lục Tiếng Anh THCS bị trùng.');
 const insert=async(table,columns,values)=>run(
  `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.map(()=>'?').join(',')})${postgres?' ON CONFLICT (id) DO NOTHING':' ON DUPLICATE KEY UPDATE id=id'}`,values,
 );
 let chapters=0,lessons=0;
 for(const book of books){
  let topicOrder=0;
  for(const chapter of book.chapters){
   const volume=book.volumes.find(v=>v.id===chapter.volumeId);
   await insert('curriculum_chapters',['id','school_year_id','grade','semester','subject_id','name','slug','sort_order','book_label'],
    [chapter.id,book.yearId,book.grade,chapter.semester,book.subjectId,chapter.name,chapter.id,chapter.sortOrder,`${book.book} · ${volume.name}`]);
   chapters++;
   for(const lesson of chapter.lessons){
    await insert('topics',['id','subject_id','grade','name','slug','sort_order'],[lesson.id,book.subjectId,book.grade,lesson.name,lesson.id,++topicOrder]);
    await insert('curriculum_lessons',['id','chapter_id','topic_id','name','sort_order'],[lesson.id,chapter.id,lesson.id,lesson.name,lesson.sortOrder]);
    lessons++;
   }
  }
  const description=(book.grade===9?'Toán 9; ':'')+`Ngữ văn ${book.grade} (Kết nối tri thức), Tiếng Anh ${book.grade} (Global Success); học theo tập, bài, Unit và Review.`;
  await run('UPDATE courses SET description=? WHERE id=? AND kind=\'secondary\' AND description IN (?,?,?,?)',[
   description,`grade-${book.grade}`,`Chương trình THCS lớp ${book.grade}. Nội dung đang được bổ sung.`,
   `Ngữ văn ${book.grade} · Kết nối tri thức với cuộc sống; học theo tập, bài và từng hoạt động.`,
   'Ngữ văn 9 và Toán 9 theo tập, bài học; luyện tập, thi thử và thách đấu.',
   'Toán 9 theo tập, chương và bài học; luyện tập, thi thử và thách đấu.',
  ]);
 }
 return {books:books.length,chapters,lessons};
}
