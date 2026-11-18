import {curriculumActivities} from './chinese-curriculum.js';

// Replace the requested activity types without regenerating the other exercises
// or changing any lesson, vocabulary, quiz or student records.
export function repairCurriculumPractice(number,activities){
 if(!Array.isArray(activities?.tasks))throw Error(`Bài ${number}: thiếu hoạt động hiện có.`);
 const source=curriculumActivities(number).tasks;
 const replacements=new Map(['fill','dialogue'].map(type=>[type,source.filter(t=>t.type===type)]));
 const tasks=activities.tasks.flatMap(t=>replacements.has(t.type)?replacements.get(t.type).splice(0,1):[t]);
 for(const remaining of replacements.values())tasks.push(...remaining);
 return {...activities,tasks};
}
