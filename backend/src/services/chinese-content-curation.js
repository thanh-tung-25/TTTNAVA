import {createHash} from 'node:crypto';
import {chineseQuestionPrompt} from '../../../frontend/assets/js/chinese-question-prompt.js';
import {studyText,mixStudy,activityConcept} from '../../../frontend/assets/js/chinese-study-variety.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
function seeded(seed){let state=parseInt(digest(seed).slice(0,8),16);return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
const active=item=>item.active!==0&&item.active!==false;
const sentence=value=>studyText(value).replace(/[\p{P}\p{Z}\s]/gu,'');

// Recognize only the three generated definition templates. A contextual sentence
// containing 我 or an answer of 吗 is not a duplicate vocabulary definition.
export function basicVocabularyQuestion(item,words){
 if(item.kind!=='question')return null;const d=item.data,prompt=chineseQuestionPrompt(studyText(d.prompt));let form,hanzi;
 const meaning=prompt.match(/^Trong bài học, [“"]([^”"]+)[”"] có nghĩa là gì\?$/u),pinyin=prompt.match(/^Chọn phiên âm đúng của [“"]([^”"]+)[”"](?: trong bài học| với nghĩa [“"].+[”"])?\.$/u);
 if(meaning){form='meaning';hanzi=meaning[1];}
 else if(pinyin){form='pinyin';hanzi=pinyin[1];}
 else if(/^Chọn (?:Hán tự có phiên âm [“"].+[”"] và nghĩa|chữ Hán có nghĩa) [“"].+[”"]\.$/u.test(prompt)&&d.accepted?.length===1){form='hanzi';hanzi=d.accepted[0];}
 const word=words.find(w=>studyText(w.data.hanzi)===hanzi);
 if(!word||!studyText(d.explanation).startsWith(hanzi+' đọc là '))return null;
 return {word,form};
}
export function curateChineseLesson({number,items,activities,seenWords=new Set()}){
 const enabled=items.filter(active),kept=[],removed=[],wordByKey=new Map(),words=[];
 for(const item of enabled.filter(i=>i.kind==='vocabulary')){
  const key=[item.data.hanzi,item.data.pinyin,item.data.meaning].map(studyText).join('\0');
  if(wordByKey.has(key)){removed.push({item,reason:'duplicate-word'});continue;}wordByKey.set(key,item);words.push(item);
 }
 const groups=new Map(),context=[],exact=new Set(),ambiguous=new Set(),prompts=new Map();
 for(const item of enabled.filter(i=>i.kind==='question')){
  const basic=basicVocabularyQuestion(item,words);
  if(!basic){context.push(item);continue;}
  const key=studyText(basic.word.data.hanzi);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...basic,item});
  const p=chineseQuestionPrompt(studyText(item.data.prompt));if(prompts.has(p)&&prompts.get(p)!==key)ambiguous.add(p);prompts.set(p,key);
 }
 const questions=[];
 for(const [hanzi,rows]of groups){
  const variants=new Map();for(const row of rows){if(variants.has(row.form))removed.push({item:row.item,reason:'duplicate-definition-form'});else variants.set(row.form,row);}
  const chosen=[variants.get('meaning')||[...variants.values()][0]],newWord=!seenWords.has(hanzi);
  if(newWord&&variants.size>1){const alternate=digest(number+':'+hanzi).charCodeAt(0)%2?'hanzi':'pinyin';let second=variants.get(alternate)||[...variants.values()].find(row=>row!==chosen[0]);if(second&&ambiguous.has(chineseQuestionPrompt(studyText(second.item.data.prompt))))second=variants.get('pinyin');if(second&&second!==chosen[0])chosen.push(second);}
  for(const row of variants.values()){
   if(!chosen.includes(row)){removed.push({item:row.item,reason:newWord?'same-word-over-two':'word-reviewed-in-earlier-lesson'});continue;}
   questions.push({...row.item,data:{...row.item.data,prompt:chineseQuestionPrompt(row.item.data.prompt),vocabulary_id:row.word.id}});
  }
 }
 for(const item of context){
  const key=JSON.stringify([chineseQuestionPrompt(studyText(item.data.prompt)),(item.data.accepted||[]).map(studyText).sort()]);
  if(exact.has(key)){removed.push({item,reason:'duplicate-context-question'});continue;}exact.add(key);questions.push({...item,data:{...item.data,prompt:chineseQuestionPrompt(item.data.prompt)}});
 }
 const others=enabled.filter(i=>!['vocabulary','question'].includes(i.kind)),otherKeys=new Set();
 for(const item of others){const key=JSON.stringify([item.kind,item.data.practice||'',sentence(item.data.text)]);if(otherKeys.has(key))removed.push({item,reason:'duplicate-reading-or-speaking'});else{otherKeys.add(key);kept.push(item);}}
 const canonical=rows=>[...rows].sort((a,b)=>JSON.stringify([a.kind||a.type,a.data?.hanzi||a.data?.prompt||a.prompt,a.data?.accepted||a.answer]).localeCompare(JSON.stringify([b.kind||b.type,b.data?.hanzi||b.data?.prompt||b.prompt,b.data?.accepted||b.answer])));
 const ordered=[...mixStudy(canonical(words),{random:seeded('words:'+number)}),...mixStudy(canonical(questions),{random:seeded('questions:'+number)}),...kept].map((item,index)=>({...item,position:index+1}));
 const taskGroups=new Map(),taskRemovals=[];
 for(const task of activities?.tasks||[]){const key=activityConcept(task);if(!taskGroups.has(key))taskGroups.set(key,[]);taskGroups.get(key).push(task);}
 const pairs=[['order','dialogue'],['fix','fill'],['order','fix'],['fill','dialogue']],tasks=[];
 let index=0;for(const [,rows]of [...taskGroups].sort(([a],[b])=>a.localeCompare(b))){
  const unique=[];for(const row of rows){if(unique.some(t=>t.type===row.type))taskRemovals.push(row);else unique.push(row);}
  const wanted=pairs[index++%pairs.length],selected=[...unique.filter(t=>wanted.includes(t.type)),...unique.filter(t=>!wanted.includes(t.type))].slice(0,2);tasks.push(...selected);taskRemovals.push(...unique.filter(t=>!selected.includes(t)));
 }
 const nextActivities=activities?{...activities,tasks:mixStudy(canonical(tasks),{random:seeded('activities:'+number),key:activityConcept,gap:9})}:null;
 words.forEach(word=>seenWords.add(studyText(word.data.hanzi)));
 const concepts=new Map();for(const item of ordered.filter(i=>i.kind==='question'&&i.data.vocabulary_id)){const key=item.data.vocabulary_id;concepts.set(key,(concepts.get(key)||0)+1);}
 if([...concepts.values()].some(count=>count>2))throw Error('Một từ còn quá hai câu định nghĩa.');
 return {items:ordered,removed,activities:nextActivities,taskRemovals,report:{lesson:number,before:{words:enabled.filter(i=>i.kind==='vocabulary').length,questions:enabled.filter(i=>i.kind==='question').length,activities:activities?.tasks.length||0},after:{words:words.length,questions:questions.length,activities:tasks.length},definition_words:groups.size,context_questions:context.length,max_questions_per_word:Math.max(0,...concepts.values()),removed:removed.length,removed_tasks:taskRemovals.length,activity_types:Object.fromEntries(['order','fix','fill','dialogue'].map(type=>[type,tasks.filter(t=>t.type===type).length]))}};
}
