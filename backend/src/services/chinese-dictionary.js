import {query} from '../config/db.js';
import {json} from '../repositories/chinese.js';
import {requireCourse} from './course-service.js';
import {badRequest} from '../utils/errors.js';

// A lookup bank of published vocabulary only. Never return quiz answers,
// unpublished lessons or vocabulary from a course the learner cannot access.
export async function chineseDictionary(user,courseId){
 const course=await requireCourse(user,courseId);if(course.kind!=='chinese')throw badRequest('Chọn khóa tiếng Trung để tra từ.');
 const rows=await query("SELECT i.id,i.data,i.set_id,l.id AS lesson_id,l.title AS lesson_title,r.favorite FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id LEFT JOIN chinese_reviews r ON r.item_id=i.id AND r.student_id=? WHERE i.kind='vocabulary' AND i.active=1 AND s.status='published' AND l.status='published' AND l.level_id=? ORDER BY l.position,s.position,i.position,i.id",[user,course.level]);
 const words=new Map();
 for(const row of rows){
  const data=json(row.data);if(!data.hanzi||!data.meaning)continue;
  const key=[data.hanzi,data.pinyin||'',data.meaning].map(s=>String(s).normalize('NFC').trim()).join('\0');
  const lesson={id:row.lesson_id,title:row.lesson_title,set_id:row.set_id,word_id:row.id};
  if(words.has(key)){const word=words.get(key);word.favorite||=Boolean(Number(row.favorite));if(!word.lessons.some(l=>l.id===lesson.id))word.lessons.push(lesson);continue;}
  words.set(key,{id:row.id,hanzi:data.hanzi,pinyin:data.pinyin||'',meaning:data.meaning,example:data.example||'',example_pinyin:data.example_pinyin||'',example_meaning:data.example_meaning||'',favorite:Boolean(Number(row.favorite)),lessons:[lesson]});
 }
 return {course:{id:course.id,title:course.title,level:course.level},count:words.size,words:[...words.values()]};
}
