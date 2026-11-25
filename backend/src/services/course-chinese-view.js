import { listCourses, requireCourse } from './course-service.js';
import { query } from '../config/db.js';
import * as chinese from './chinese.js';

async function levelsFor(user,selected) {
 const courses=(await listCourses(user)).filter(c=>c.kind==='chinese'&&c.unlocked);
 if(selected){const course=await requireCourse(user,selected);return course.kind==='chinese'?[Number(course.level)]:[];}
 return courses.map(c=>Number(c.level));
}
export async function studentCatalog(user,selected) {
 const allowed=await levelsFor(user,selected),data=await chinese.catalog(false,user);
 data.levels=data.levels.filter(l=>allowed.includes(l.id));data.lessons=data.lessons.filter(l=>allowed.includes(l.level_id));
 data.sets=data.sets.filter(s=>allowed.includes(s.level_id));const ids=new Set(data.sets.map(s=>s.id));
 for(const key of ['counts','progress','completion'])data[key]=data[key].filter(r=>ids.has(r.set_id));
 data.lesson_progress=(data.lesson_progress||[]).filter(row=>data.lessons.some(lesson=>lesson.id===row.lessonId));
 return data;
}
export async function studentNotebook(user,filters,selected) {
 const allowed=await levelsFor(user,selected);
 return (await chinese.notebook(user,filters)).filter(row=>allowed.includes(row.level_id));
}
export async function studentTests(user,selected) {
 const allowed=await levelsFor(user,selected);if(!allowed.length)return [];
 const sets=await query(`SELECT s.id FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id WHERE s.status='published' AND l.status='published' AND l.level_id IN (${allowed.map(()=>'?').join(',')})`,allowed);
 const ids=new Set(sets.map(s=>s.id));
 return (await chinese.tests(false)).filter(test=>test.set_ids.every(id=>ids.has(id)));
}
