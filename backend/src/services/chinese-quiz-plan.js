import {query} from '../config/db.js';
import {getItems,getSet,json,publicItem} from '../repositories/chinese.js';
import {currentQuizProgress,sequentialQuestions} from './chinese-quiz-state.js';
export {sequentialQuestions,journeyProgress} from './chinese-quiz-state.js';

export async function reviewedQuestions(user,set,questions){
 const rows=await query('SELECT snapshot,answers,finished_at,score FROM chinese_attempts WHERE student_id=? AND set_id=? AND abandoned_at IS NULL ORDER BY started_at DESC LIMIT 1000',[user,set]);
 return currentQuizProgress(questions,rows).states;
}
export async function quizPlan(user,id){
 await getSet(id);const items=await getItems(id),questions=items.filter(i=>i.kind==='question'&&i.data.approved);
 const attempts=await query('SELECT id,snapshot,answers,score,finished_at,ends_at FROM chinese_attempts WHERE student_id=? AND set_id=? AND abandoned_at IS NULL ORDER BY started_at DESC LIMIT 1000',[user,id]);
 const progress=currentQuizProgress(questions,attempts),active=progress.valid.find(a=>!a.finished_at&&(!a.ends_at||new Date(a.ends_at)>new Date()));
 return {total:questions.length,review_count:progress.locked.size,active:active?{id:active.id,selection:json(active.snapshot).selection||'mixed',block:json(active.snapshot).selection==='sequential'?json(active.snapshot).block:null}:null,blocks:progress.blocks.map(block=>{const chosen=sequentialQuestions(questions,block.block);return {...block,from:questions.indexOf(chosen[0])+1,to:questions.indexOf(chosen.at(-1))+1,questions:chosen.map(publicItem)};})};
}
