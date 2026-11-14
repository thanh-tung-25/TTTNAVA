import {curriculumStreet} from '../services/chinese-curriculum.js';
export const streetMissionBank=Array.from({length:10},(_,n)=>({number:n+1,...curriculumStreet(n+1)}));
export function streetLessonNumber(lesson){
 if(Number(lesson.level_id)!==1)return null;
 const match=String(lesson.title).match(/Bài\s*(\d+)/iu),number=match?Number(match[1]):Number(lesson.position);
 return streetMissionBank.some(l=>l.number===number)?number:null;
}
export function defaultStreetLesson(lesson){
 const bank=streetMissionBank.find(l=>l.number===streetLessonNumber(lesson));
 return bank?structuredClone({enabled:true,place_id:bank.place_id,missions:bank.missions}):null;
}
