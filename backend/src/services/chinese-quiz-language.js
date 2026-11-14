import {q1QuizVocabulary} from '../data/chinese-q1-quiz-vocabulary.js';

export function cumulativeVocabulary(number){
 const words=q1QuizVocabulary.filter(l=>l.number<=number).flatMap(l=>l.words.map(w=>({...w,lesson:l.number})));
 const tokens=new Set();
 for(const word of words){
  // Ellipsis entries explicitly teach a construction, e.g. 太……了 or 又……又…….
  for(const part of word.hanzi.split(/[…\.]+/u)){const token=part.replace(/[^\p{Script=Han}]/gu,'');if(token)tokens.add(token);}
 }
 return {words,tokens};
}
export function segmentLearnedChinese(text,number){
 const {tokens}=cumulativeVocabulary(number),segments=[];
 for(const run of String(text).match(/\p{Script=Han}+/gu)||[]){
  const reachable=new Map([[0,[]]]);
  for(let i=0;i<run.length;i++)if(reachable.has(i)){
   for(let end=run.length;end>i;end--){const word=run.slice(i,end);if(tokens.has(word)&&!reachable.has(end))reachable.set(end,[...reachable.get(i),word]);}
  }
  if(!reachable.has(run.length))throw Error(`Bài ${number}: câu dùng từ chưa học: ${run}`);
  segments.push(...reachable.get(run.length));
 }
 return segments;
}
