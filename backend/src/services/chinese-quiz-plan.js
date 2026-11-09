import {query} from '../config/db.js';
import {getItems,getSet,json,publicItem} from '../repositories/chinese.js';
import {badRequest} from '../utils/errors.js';

export async function reviewedQuestions(user,set){
 const rows=await query('SELECT snapshot,answers FROM chinese_attempts WHERE student_id=? AND set_id=? AND abandoned_at IS NULL ORDER BY started_at DESC LIMIT 500',[user,set]);
 const states=new Map();for(const row of rows){const answers=json(row.answers);for(const item of json(row.snapshot).items){const answer=answers[item.id];if(answer?.locked&&!states.has(item.id))states.set(item.id,{correct:!!answer.correct});}}
 return states;
}
export function sequentialQuestions(items,block){
 const sections=Math.ceil(items.length/20);
 if(block>=sections)throw badRequest('Phần luyện không tồn tại.');
 // The final section overlaps the previous one to keep twenty unique questions.
 const start=Math.min(block*20,Math.max(0,items.length-20));
 return items.slice(start,start+20);
}
export async function quizPlan(user,id){
 await getSet(id);const items=await getItems(id),questions=items.filter(i=>i.kind==='question'&&i.data.approved),seen=await reviewedQuestions(user,id);
 return {total:questions.length,review_count:questions.filter(i=>seen.has(i.id)).length,blocks:Array.from({length:questions.length>=20?Math.ceil(questions.length/20):0},(_,block)=>{const chosen=sequentialQuestions(questions,block);return {block,from:questions.indexOf(chosen[0])+1,to:questions.indexOf(chosen.at(-1))+1,questions:chosen.map(publicItem)};})};
}
