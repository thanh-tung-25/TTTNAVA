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
export function journeyProgress(questions,attempts){
 const count=questions.length>=20?Math.ceil(questions.length/20):0;
 const blocks=Array.from({length:count},(_,block)=>({block,completed:false,score:null}));
 for(const row of attempts){
  const snapshot=json(row.snapshot);
  if(!row.finished_at||snapshot.selection!=='sequential'||!Number.isInteger(snapshot.block)||!blocks[snapshot.block])continue;
  const answers=json(row.answers||{});
  if(!snapshot.items.every(i=>answers[i.id]?.locked&&String(answers[i.id].value??'').trim()))continue;
  // An edited source must not unlock a different set of questions by old position alone.
  const expected=sequentialQuestions(questions,snapshot.block),ids=new Set(snapshot.items.map(i=>i.id));
  if(expected.length!==ids.size||!expected.every(i=>ids.has(i.id)))continue;
  const target=blocks[snapshot.block];target.completed=true;
  target.score=Math.max(target.score??0,Number(row.score)||0);
 }
 const next=blocks.findIndex(b=>!b.completed);
 return blocks.map(b=>({...b,unlocked:b.completed||next===-1||b.block===next}));
}
export async function quizPlan(user,id){
 await getSet(id);const items=await getItems(id),questions=items.filter(i=>i.kind==='question'&&i.data.approved),seen=await reviewedQuestions(user,id);
 const attempts=await query('SELECT id,snapshot,answers,score,finished_at,ends_at FROM chinese_attempts WHERE student_id=? AND set_id=? AND abandoned_at IS NULL ORDER BY started_at DESC LIMIT 1000',[user,id]);
 const active=attempts.find(a=>!a.finished_at&&(!a.ends_at||new Date(a.ends_at)>new Date()));
 return {total:questions.length,review_count:questions.filter(i=>seen.has(i.id)).length,active:active?{id:active.id,block:json(active.snapshot).selection==='sequential'?json(active.snapshot).block:null}:null,blocks:journeyProgress(questions,attempts).map(progress=>{const chosen=sequentialQuestions(questions,progress.block);return {...progress,from:questions.indexOf(chosen[0])+1,to:questions.indexOf(chosen.at(-1))+1,questions:chosen.map(publicItem)};})};
}
