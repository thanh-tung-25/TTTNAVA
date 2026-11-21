import {createHash} from 'node:crypto';
import {chineseQuestionPrompt} from '../../../frontend/assets/js/chinese-question-prompt.js';
import {speakingQuestions} from '../../../frontend/assets/js/chinese-speaking-data.js';
import {defaultChatSettings,CHAT_PRACTICE_TURNS} from '../../../frontend/assets/js/chinese-ai-chat-data.js';
import {defaultStreetLesson} from '../data/chinese-street-missions.js';

const json=(value,fallback={})=>{try{return typeof value==='string'?JSON.parse(value):value??fallback;}catch{return fallback;}};
const text=value=>String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const wordProgressKey=item=>hash(['word',text(item.data?.hanzi),text(item.data?.pinyin),text(item.data?.meaning)]);
export const quizProgressKey=item=>{const d=item.data||{};return hash(['quiz',d.type,text(chineseQuestionPrompt(d.prompt)),[...(d.accepted||[])].map(text).sort()]);};
export const activityProgressKey=task=>hash(['application',task.type,text(chineseQuestionPrompt(task.prompt)),text(task.speech),text(task.answer)]);
const readKey=item=>hash(['reading',item.kind,text(item.data?.text)]);
const spokenKey=value=>text(chineseQuestionPrompt(value));
const active=item=>item.active!==0&&item.active!==false;
const percent=(done,total)=>total?done>=total?100:Math.floor(done*100/total):null;
// Old receipts store a count, not identities. Keep the provable lower bound;
// repeated sessions and duplicate source rows can never inflate it.
export function legacyCoverage(keys,completed){
 const valid=keys.filter(Boolean),remaining=Math.max(0,Math.min(keys.length,Number(completed)||0)-(keys.length-valid.length)),counts=new Map();
 for(const key of valid)counts.set(key,(counts.get(key)||0)+1);
 let covered=0,distinct=0;for(const count of [...counts.values()].sort((a,b)=>b-a)){if(covered>=remaining)break;covered+=count;distinct++;}return distinct;
}
const mode=(id,title,total,done,available=total>0,extra={})=>({id,title,total,done:Math.min(total,done),available:Boolean(available),percent:available?percent(Math.min(total,done),total):null,...extra});
const fraction=node=>node.total?node.done/node.total:0;
function group(id,title,modes,shared=false){const opened=modes.filter(m=>m.available),ratio=shared?opened.length?fraction(opened[0]):0:opened.length?opened.reduce((n,m)=>n+fraction(m),0)/opened.length:0;return {id,title,available:opened.length>0,percent:opened.length?ratio>=1?100:Math.floor(ratio*100):null,ratio,modes};}

export function buildChineseLessonProgress({lesson,sets=[],items=[],activities=[],reviews=[],progress=[],attempts=[],studies=[],submissions=[],clips=[],chats=[],chatSettings=[],streetSettings=[],streetProgress=[],runs=[],aiAvailable=false}){
 const sourceSets=sets.filter(set=>set.lesson_id===lesson.id),ownSets=sourceSets.filter(set=>set.status==='published'),setIds=new Set(ownSets.map(set=>set.id)),sourceSetIds=new Set(sourceSets.map(set=>set.id)),all=items.filter(item=>sourceSetIds.has(item.set_id)).map(item=>({...item,data:json(item.data)})),current=all.filter(item=>setIds.has(item.set_id)&&active(item)),byId=new Map(all.map(item=>[item.id,item]));
 const vocabulary=current.filter(item=>item.kind==='vocabulary'&&item.data.hanzi&&item.data.meaning),words=new Set(vocabulary.map(wordProgressKey)),vocabIds=new Map(vocabulary.map(item=>[item.id,wordProgressKey(item)])),learnedWords=new Set(),listened=new Set();
 const questions=current.filter(item=>item.kind==='question'&&item.data.approved),quizKeys=new Set(questions.map(quizProgressKey)),qById=new Map(questions.map(item=>[item.id,item])),quizDone=new Set();
 const reads=current.filter(item=>['reading','grammar','dialogue'].includes(item.kind)&&item.data.practice!=='speaking'),readKeys=new Set(reads.map(readKey)),readDone=new Set();
 const activityRow=activities.find(row=>row.lesson_id===lesson.id&&row.status==='published'),tasks=json(activityRow?.data).tasks||[],taskMap=new Map(tasks.map(task=>[activityProgressKey(task),task])),applied=new Set(),legacyTypes=new Map(),legacyMixed={count:0};
 const speaking=new Map();for(const set of ownSets)for(const q of speakingQuestions({tasks},current.filter(item=>item.set_id===set.id)))speaking.set(spokenKey(q.text),q.text);const spoken=new Set();
 let oldWords=0,oldReads=0,legacy=false,unmapped=false,updatedAt=null;
 const touch=row=>{for(const key of ['updated_at','completed_at','finished_at','last_review','created_at'])if(row[key]&&(!updatedAt||new Date(row[key])>new Date(updatedAt)))updatedAt=row[key];};
 function wordFromId(id,answer){const item=byId.get(id);if(!item||item.kind!=='vocabulary'||answer!==undefined&&text(item.data.meaning)!==text(answer))return null;const key=wordProgressKey(item);return words.has(key)?key:null;}
 function markQuestion(item){const key=quizProgressKey(item);if(!quizKeys.has(key)){unmapped=true;return;}quizDone.add(key);const currentQuestion=qById.get(item.id)||questions.find(q=>quizProgressKey(q)===key),word=vocabIds.get(currentQuestion?.data.vocabulary_id);if(word)learnedWords.add(word);}
 for(const review of reviews)if(Number(review.review_count)>0){const key=wordFromId(review.item_id);if(key){learnedWords.add(key);touch(review);}}
 for(const row of progress)if(sourceSetIds.has(row.set_id)){for(const id of json(row.read_items,[])){const item=byId.get(id);if(item&&readKeys.has(readKey(item)))readDone.add(readKey(item));}touch(row);}
 for(const attempt of attempts){
  const snapshot=json(attempt.snapshot),answers=json(attempt.answers);for(const item of snapshot.items||[]){
   if(!sourceSetIds.has(item.set_id||attempt.set_id))continue;const answer=answers[item.id];if(!answer?.locked||!String(answer.value??'').trim())continue;
   markQuestion({...item,data:json(item.data)});touch(attempt);
  }
 }
 for(const run of runs)if(run.course_id==='hsk-'+lesson.level_id){const answers=json(run.answers_json);for(const item of json(run.items_json,[]))if(answers[item.id]){
  const word=wordFromId(item.id);if(word){learnedWords.add(word);touch(run);continue;}
  const question=byId.get(item.id);if(question?.kind==='question'&&text(chineseQuestionPrompt(question.data.prompt))===text(chineseQuestionPrompt(item.prompt))){markQuestion(question);touch(run);}
 }}
 for(const row of studies){
  if(!sourceSetIds.has(row.source_id)||row.course_id!=='hsk-'+lesson.level_id)continue;
  const snapshot=json(row.snapshot),result=json(row.result),source=snapshot.items||[],known=new Set(result.studied_items||[]),completed=Boolean(row.completed_at),legacyRow=completed&&(!Object.hasOwn(result,'studied_items')||Number(result.legacy_completed)>0),legacyCount=result.legacy_completed??result.completed;
  if(known.size||completed)touch(row);
  if(['words','cards'].includes(row.activity)){
   const keys=source.map(item=>wordFromId(item.id));for(const [n,item]of source.entries())if(known.has(item.id)&&keys[n])learnedWords.add(keys[n]);
   if(legacyRow){oldWords=Math.max(oldWords,legacyCoverage(keys,legacyCount));legacy=true;}
  }else if(row.activity==='listening'){
   for(const item of source)if(known.has(item.id)||completed&&Number(result.completed)>=source.length){const key=wordFromId(item.id,item.answer);if(key)listened.add(key);else unmapped=true;}
  }else if(row.activity==='reading'){
   const keys=source.map(item=>{const original=byId.get(item.id);return original&&readKeys.has(readKey(original))?readKey(original):null;});
   for(const [n,item]of source.entries())if(keys[n]&&(known.has(item.id)||completed&&Number(result.completed)>=source.length))readDone.add(keys[n]);
   if(legacyRow){oldReads=Math.max(oldReads,legacyCoverage(keys,legacyCount));legacy=true;}
  }else if(row.activity==='application'){
   const keys=source.map(item=>{const key=activityProgressKey(item.data||{});return taskMap.has(key)?key:null;});
   for(const [n,item]of source.entries())if(known.has(item.id)&&keys[n])applied.add(keys[n]);
   if(legacyRow){const count=legacyCoverage(keys,legacyCount),type=['order','fix','fill','dialogue'].includes(row.unit_key)&&source.every(item=>item.data?.type===row.unit_key)?row.unit_key:null;if(type)legacyTypes.set(type,Math.max(legacyTypes.get(type)||0,count));else legacyMixed.count=Math.max(legacyMixed.count,count);legacy=true;}
  }else if(row.activity==='recording'){
   for(const item of source)if(known.has(item.id)&&speaking.has(spokenKey(item.text)))spoken.add(spokenKey(item.text));
   if(legacyRow)legacy=true;
  }
 }
 for(const row of submissions){if(!sourceSetIds.has(row.set_id))continue;const snapshot=json(row.snapshot),result=json(row.result);
  for(const answer of result.questions||[])if(answer.transcript?.trim()&&speaking.has(spokenKey(answer.question)))spoken.add(spokenKey(answer.question));
  for(const clip of clips)if(clip.submission_id===row.id&&clip.status==='completed'&&json(clip.result).transcript?.trim()){const question=snapshot.questions?.[Number(clip.question_index)-1];if(question&&speaking.has(spokenKey(question.question)))spoken.add(spokenKey(question.question));}
  if(row.completed_at)touch(row);
 }
 const appChildren=['order','fix','fill','dialogue'].map((type,n)=>{const pool=[...taskMap].filter(([,task])=>task.type===type),count=Math.max(pool.filter(([key])=>applied.has(key)).length,legacyTypes.get(type)||0);return mode(type,['Xếp câu','Sửa lỗi','Điền từ','Hội thoại'][n],pool.length,count);});
 const applicationDone=Math.min(taskMap.size,Math.max(appChildren.reduce((n,m)=>n+m.done,0),legacyMixed.count));
 const wordDone=Math.min(words.size,Math.max(learnedWords.size,oldWords)),knownWords=vocabulary.filter(item=>learnedWords.has(wordProgressKey(item))).map(item=>item.id);
 const chatConfig=json(chatSettings.find(row=>row.lesson_id===lesson.id)?.data,defaultChatSettings(lesson));
 const chatRows=chats.filter(row=>row.lesson_id===lesson.id&&!row.is_preview),turns=Math.max(0,...chatRows.map(row=>Number(row.turn_count)||0));for(const row of chatRows)if(Number(row.turn_count)>0)touch(row);
 const streetConfig=json(streetSettings.find(row=>row.lesson_id===lesson.id)?.data,defaultStreetLesson(lesson)),missions=streetConfig?.missions||[],streetDone=missions.filter(task=>streetProgress.some(row=>row.lesson_id===lesson.id&&row.mission_id===task.id&&row.content_hash===hash(task)&&row.completed_at));for(const row of streetProgress)if(row.lesson_id===lesson.id&&row.completed_at)touch(row);
 const groups=[group('exercises','Bài tập',[
  mode('quiz','Quiz',quizKeys.size,quizDone.size,quizKeys.size>=20),mode('listening','Luyện nghe',words.size,listened.size,new Set(vocabulary.map(item=>text(item.data.meaning))).size>=2),mode('application','Luyện vận dụng',taskMap.size,applicationDone,taskMap.size>0,{children:appChildren}),mode('reading','Bài đọc',readKeys.size,Math.max(readDone.size,oldReads))
 ]),group('characters','Nhận mặt chữ',[
  mode('words','Từ mới',words.size,wordDone),mode('cards','Thẻ lật',words.size,wordDone)
 ],true),group('speaking','Luyện nói',[
  mode('speaking','Luyện nói theo bài',speaking.size,spoken.size),mode('ai-chat','Giao tiếp với AI',CHAT_PRACTICE_TURNS,Math.min(CHAT_PRACTICE_TURNS,turns),Boolean(aiAvailable&&chatConfig?.enabled)),mode('street','Phố tiếng Trung',missions.length,streetDone.length,Boolean(streetConfig?.enabled&&missions.length))
 ])];
 const available=groups.filter(g=>g.available),ratio=available.length?available.reduce((n,g)=>n+g.ratio,0)/available.length:0;
 return {lessonId:lesson.id,title:lesson.title,percent:available.length?ratio>=1?100:Math.floor(ratio*100):null,groups:groups.map(({ratio,...g})=>g),studiedWordIds:knownWords,legacyIncluded:legacy,olderContent:unmapped,updatedAt:updatedAt?new Date(updatedAt).toISOString():null};
}
