import { listCourses, requireCourse } from './course-service.js';
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
 return data;
}
export async function studentNotebook(user,filters,selected) {
 const allowed=await levelsFor(user,selected);
 return (await chinese.notebook(user,filters)).filter(row=>allowed.includes(row.level_id));
}
export async function studentTests(user,selected) {
 const allowed=await levelsFor(user,selected),catalog=await chinese.catalog(false,user);
 const ids=new Set(catalog.sets.filter(s=>allowed.includes(s.level_id)).map(s=>s.id));
 return (await chinese.tests(false)).filter(test=>test.set_ids.every(id=>ids.has(id)));
}
