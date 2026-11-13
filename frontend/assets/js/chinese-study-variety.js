export const studyText=value=>String(value||'').normalize('NFC').trim().replace(/\s+/gu,' ');
export function shuffleStudy(items,random=Math.random){
 const copy=[...items];for(let n=copy.length-1;n>0;n--){const j=Math.floor(random()*(n+1));[copy[n],copy[j]]=[copy[j],copy[n]];}return copy;
}
export function studyConcept(item){
 const data=item.data||item;
 if(item.kind==='vocabulary')return 'word:'+(item.id||studyText(data.hanzi));
 if(data.vocabulary_id)return 'word:'+data.vocabulary_id;
 return 'content:'+studyText(data.prompt||data.hanzi||data.text||data.answer);
}
// Prefer a different concept from the last twenty, with a safe fallback for
// small banks. Input is never mutated; persisted attempt snapshots stay stable.
export function mixStudy(items,{random=Math.random,key=studyConcept,gap=19}={}){
 const pool=shuffleStudy(items,random),output=[],recent=[];
 while(pool.length){let at=pool.findIndex(item=>!recent.includes(key(item)));if(at<0)at=pool.findIndex(item=>key(item)!==recent.at(-1));if(at<0)at=0;const [item]=pool.splice(at,1);output.push(item);recent.push(key(item));if(recent.length>gap)recent.shift();}
 return output;
}
export function uniqueStudyWords(words){
 const seen=new Set();return words.filter(item=>{const d=item.data,key=[d.hanzi,d.pinyin,d.meaning].map(studyText).join('\0');if(seen.has(key))return false;seen.add(key);return true;});
}
export function sessionStudyDeck(items,key,{reshuffle=false}={}){
 let storage;try{storage=globalThis.sessionStorage;const ids=JSON.parse(storage?.getItem('ttnava-study-deck:'+key)||'null'),byId=new Map(items.map(item=>[item.id,item]));
  if(!reshuffle&&Array.isArray(ids)&&ids.length===byId.size&&new Set(ids).size===ids.length&&ids.every(id=>byId.has(id)))return ids.map(id=>byId.get(id));
 }catch{}
 const deck=mixStudy(items);try{storage?.setItem('ttnava-study-deck:'+key,JSON.stringify(deck.map(item=>item.id)));}catch{}return deck;
}
export function activityConcept(task){
 const sentence=task.type==='fill'?(task.prompt||'').replace(/[（(][^()（）]*\p{Script=Latin}[^()（）]*[)）]/gu,'').replace(/_{2,}|＿{2,}/u,task.answer):task.answer;
 return studyText(sentence).replace(/[\p{P}\p{Z}\s]/gu,'');
}
