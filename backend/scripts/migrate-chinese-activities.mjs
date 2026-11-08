// Preserve the existing Q1 activities when moving from hardcoded UI to admin data.
// Never overwrites an edited pack; all new content remains admin-managed.
import {activityTemplate} from '../../frontend/assets/js/chinese-activity-templates.js';
import {query,closePool} from '../src/config/db.js';
import {saveActivities} from '../src/services/chinese-activities.js';
try{
 let count=0;
 const rows=await query('SELECT l.* FROM chinese_lessons l LEFT JOIN chinese_activities a ON a.lesson_id=l.id WHERE a.lesson_id IS NULL');
 for(const lesson of rows){
  const template=activityTemplate(lesson);if(!template)continue;
  await saveActivities(lesson.id,{...template,revision:0,status:lesson.status==='published'?'published':'draft'});count++;
 }
 console.log(`Migrated ${count} Q1 activity packs; existing packs were preserved.`);
}finally{await closePool();}
