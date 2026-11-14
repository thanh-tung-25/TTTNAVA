import {activitySource} from './chinese-activity-bank.js';
export function activityTemplate(set){
 if(Number(set.level_id)!==1)return null;
 const source=activitySource(set.lesson_title||set.title||'');
 return source?structuredClone(source.activities):null;
}
