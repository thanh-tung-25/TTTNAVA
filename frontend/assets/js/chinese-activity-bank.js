import {curriculumTemplates} from './chinese-curriculum-templates.js';
const normalize=value=>String(value).normalize('NFC').toLocaleLowerCase('vi').replace(/[\s？?！!。.,，:：–—-]/gu,'');
export function activitySource(title){
 const text=normalize(title);
 return [...curriculumTemplates].sort((a,b)=>b.aliases[0].length-a.aliases[0].length).find(l=>l.aliases.some(alias=>text.includes(normalize(alias))))||null;
}
export function expandedActivities(title){return structuredClone(activitySource(title)?.activities.tasks||[]);}
