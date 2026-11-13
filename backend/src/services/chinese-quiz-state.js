import {badRequest} from '../utils/errors.js';
import {chineseQuestionPrompt} from '../../../frontend/assets/js/chinese-question-prompt.js';
const json=value=>typeof value==='string'?JSON.parse(value):value;
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
function version(item){
 const {vocabulary_id,approved,...data}=item.data||{};if(data.prompt)data.prompt=chineseQuestionPrompt(data.prompt);
 if(['choice','listening'].includes(data.type))data.options=[...(data.options||[])].sort();if(data.accepted)data.accepted=[...data.accepted].sort();
 return JSON.stringify(stable(data));
}
export const quizVersions=questions=>new Map(questions.map(item=>[item.id,version(item)]));
export function sequentialQuestions(items,block){
 if(!Number.isInteger(block)||block<0||block>=Math.ceil(items.length/20))throw badRequest('Chặng luyện không tồn tại.');
 const start=Math.min(block*20,Math.max(0,items.length-20));return items.slice(start,start+20);
}
export function compatibleQuiz(snapshot,questions,versions=quizVersions(questions)){
 const items=snapshot?.items;if(!Array.isArray(items)||!items.length||new Set(items.map(i=>i.id)).size!==items.length)return false;
 if(!items.every(item=>versions.has(item.id)&&versions.get(item.id)===version(item)))return false;
 if(snapshot.selection==='sequential'){
  if(!Number.isInteger(snapshot.block)||snapshot.block<0||snapshot.block>=Math.ceil(questions.length/20))return false;
  const expected=sequentialQuestions(questions,snapshot.block),ids=new Set(items.map(item=>item.id));if(expected.length!==items.length||!expected.every(item=>ids.has(item.id)))return false;
 }
 return true;
}
export function journeyProgress(questions,attempts){
 const count=questions.length>=20?Math.ceil(questions.length/20):0,versions=quizVersions(questions),blocks=Array.from({length:count},(_,block)=>({block,completed:false,score:null}));
 for(const row of attempts){
  const snapshot=json(row.snapshot);if(row.abandoned_at||!row.finished_at||snapshot.selection!=='sequential'||!blocks[snapshot.block]||!compatibleQuiz(snapshot,questions,versions))continue;
  const answers=json(row.answers||{});if(!snapshot.items.every(item=>answers[item.id]?.locked&&String(answers[item.id].value??'').trim()))continue;
  const target=blocks[snapshot.block];target.completed=true;target.score=Math.max(target.score??0,Number(row.score)||0);
 }
 const next=blocks.findIndex(block=>!block.completed);return blocks.map(block=>({...block,unlocked:block.completed||next===-1||block.block===next}));
}
export function currentQuizProgress(questions,attempts){
 const versions=quizVersions(questions),blocks=journeyProgress(questions,attempts),locked=new Set(),states=new Map(),valid=[];
 for(const row of attempts){
  const snapshot=json(row.snapshot);if(row.abandoned_at||!compatibleQuiz(snapshot,questions,versions))continue;
  if(snapshot.selection==='sequential'&&!blocks[snapshot.block]?.unlocked)continue;
  valid.push(row);const answers=json(row.answers||{});
  for(const item of snapshot.items){const answer=answers[item.id];if(!answer?.locked||!String(answer.value??'').trim())continue;locked.add(item.id);if(!states.has(item.id))states.set(item.id,{correct:!!answer.correct});}
 }
 return {blocks,locked,states,valid};
}
export function attemptsForSet(attempts,setId){
 return attempts.flatMap(row=>{const snapshot=json(row.snapshot),items=snapshot.items.filter(item=>(item.set_id||row.set_id)===setId);return items.length?[{...row,snapshot:{...snapshot,items}}]:[];});
}
