import {query,closePool} from '../src/config/db.js';
import {adminActivities,saveActivities} from '../src/services/chinese-activities.js';
import {activityTemplate} from '../../frontend/assets/js/chinese-activity-templates.js';
try{
 for(const lesson of await query('SELECT * FROM chinese_lessons WHERE level_id=1')){
  const template=activityTemplate(lesson);if(!template)continue;
  const pack=await adminActivities(lesson.id);
  const tasks=[...pack.tasks];
  // Preserve existing editorial changes; add only missing sentences for each type.
  for(const item of template.tasks)if(!tasks.some(t=>t.type===item.type&&(item.type==='fill'?t.prompt===item.prompt:t.answer===item.answer)))tasks.push(item);
  if(tasks.length>100)throw Error('Too many activities: '+lesson.id);
  await saveActivities(lesson.id,{...pack,topic:pack.topic||template.topic,tasks});
  console.log(JSON.stringify({title:lesson.title,counts:Object.fromEntries(['order','fix','fill','dialogue'].map(type=>[type,tasks.filter(t=>t.type===type).length]))}));
 }
}finally{await closePool();}
