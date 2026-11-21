import {chineseQuestionPrompt} from './chinese-question-prompt.js';

const exact=value=>String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('zh');
// A fill exercise checks the missing word, rather than keyboard spacing or
// sentence-final punctuation. Internal characters and word order still matter.
const fillKey=value=>String(value??'').normalize('NFKC').replace(/[\s\u200b-\u200d\u2060\ufeff]/gu,'').replace(/[.!?。！？]+$/gu,'').toLocaleLowerCase('zh');
function completedSentence(task){
 let prompt=chineseQuestionPrompt(task.prompt).normalize('NFKC').trim();
 // Remove only a trailing translation/note containing Latin text. The actual
 // Chinese sentence, including negation and other fixed words, stays intact.
 prompt=prompt.replace(/\s*\(([^()]*)\)\s*$/u,(match,note)=>/\p{Script=Latin}/u.test(note)?'':match);
 if(/\p{Script=Latin}/u.test(prompt)||(prompt.match(/_{2,}/gu)||[]).length!==1)return null;
 return prompt.replace(/_{2,}/u,()=>String(task.answer??''));
}
export function chineseActivityMatches(task,value){
 if(task.type!=='fill')return exact(value)===exact(task.answer);
 const answer=fillKey(task.answer),entered=fillKey(value);if(!answer||!entered)return false;
 if(entered===answer)return true;
 const sentence=completedSentence(task);return sentence!==null&&entered===fillKey(sentence);
}
