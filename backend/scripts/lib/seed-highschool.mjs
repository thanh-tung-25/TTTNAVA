import fs from 'node:fs/promises';
import {SCHOOL_SUBJECT_IDS} from '../../src/utils/school-programs.js';
import {insertSchoolRows} from './insert-school-rows.mjs';
export const highschoolSubjects=[
 ['toan','Toán','#8b5cf6'],['tieng-viet','Tiếng Việt','#ec4899'],['tieng-anh','Tiếng Anh','#14b8a6'],
 ['vat-li','Vật lí','#2563eb'],['hoa-hoc','Hóa học','#9333ea'],['sinh-hoc','Sinh học','#16a34a'],
 ['lich-su','Lịch sử','#b45309'],['dia-li','Địa lí','#0891b2'],['kinh-te-phap-luat','Giáo dục kinh tế và pháp luật','#be185d'],
];
export function validateHighschoolCatalog(catalog){
 if(catalog.books?.length!==27||new Set(catalog.books.map(b=>`${b.grade}:${b.subjectId}`)).size!==27)throw Error('Expected 27 THPT outlines');
 const ids=new Set();let chapters=0,lessons=0;
 for(const book of catalog.books){
  if(![10,11,12].includes(book.grade)||!SCHOOL_SUBJECT_IDS.includes(book.subjectId)||!book.chapters.length)throw Error('Invalid THPT book');
  for(const chapter of book.chapters){
   if(ids.has(chapter.id)||chapter.name.length>160||!['hk1','hk2','year'].includes(chapter.semester)||!chapter.lessons.length)throw Error('Invalid THPT chapter');
   ids.add(chapter.id);chapters++;
   for(const lesson of chapter.lessons){if(ids.has(lesson.id)||lesson.id.length>60||lesson.name.length>255||!lesson.name.trim())throw Error('Invalid THPT lesson');ids.add(lesson.id);lessons++;}
  }
 }
 if(chapters!==239||lessons!==1082)throw Error('THPT source catalog is incomplete');
 return catalog;
}
export async function loadHighschoolCatalog(){return validateHighschoolCatalog(JSON.parse(await fs.readFile(new URL('../../seed-data/highschool-kntt.json',import.meta.url),'utf8')));}
export function highschoolTopicName(book,chapter,lesson){
 const name=['tieng-anh','tieng-viet'].includes(book.subjectId)?chapter.name+' · '+lesson.name:lesson.name;
 if(name.length>180)throw Error('Topic label is too long');return name;
}

// Add missing catalog rows only. Never update prices, access or existing content.
export async function seedHighschoolCatalog(run,{postgres=false,catalog,yearId}={}){
 catalog=validateHighschoolCatalog(catalog||await loadHighschoolCatalog());
 if(!yearId){const years=await run('SELECT id FROM school_years ORDER BY is_active DESC,sort_order,id LIMIT 1');yearId=years[0]?.id;}
 if(!yearId)throw Error('Create a school year before adding THPT');
 const options={postgres,ignore:true},chapters=[],topics=[],lessons=[];
 await insertSchoolRows(run,'subjects',['id','name','slug','color','sort_order'],highschoolSubjects.map(([id,name,color],index)=>[id,name,id,color,index+1]),options);
 await insertSchoolRows(run,'courses',['id','kind','level','title','description','payment_instructions'],[10,11,12].map(grade=>[`grade-${grade}`,'highschool',grade,`Lớp ${grade}`,'9 môn: Toán, Ngữ văn, Tiếng Anh Global Success, Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, Giáo dục kinh tế và pháp luật.','']),options);
 for(const book of catalog.books){let topicOrder=0;
  for(const chapter of book.chapters){
   const bookLabel=[book.book,chapter.part,chapter.semester==='year'?'Cả năm':chapter.semester==='hk1'?'Học kì 1':'Học kì 2'].filter(Boolean).join(' · ');
   if(bookLabel.length>160)throw Error('Book label too long');
   chapters.push([chapter.id,yearId,book.grade,chapter.semester,book.subjectId,chapter.name,chapter.id,chapter.sortOrder,bookLabel]);
   for(const lesson of chapter.lessons){
    topics.push([lesson.id,book.subjectId,book.grade,highschoolTopicName(book,chapter,lesson),lesson.id,++topicOrder]);
    lessons.push([lesson.id,chapter.id,lesson.id,lesson.name,lesson.sortOrder]);
   }
  }
 }
 await insertSchoolRows(run,'curriculum_chapters',['id','school_year_id','grade','semester','subject_id','name','slug','sort_order','book_label'],chapters,options);
 await insertSchoolRows(run,'topics',['id','subject_id','grade','name','slug','sort_order'],topics,options);
 await insertSchoolRows(run,'curriculum_lessons',['id','chapter_id','topic_id','name','sort_order'],lessons,options);
 return {courses:3,subjects:9,books:27,chapters:239,lessons:1082,yearId};
}
