import {createHash} from 'node:crypto';
import {q1QuizVocabulary} from '../data/chinese-q1-quiz-vocabulary.js';
import {q1QuizApplication} from '../data/chinese-q1-quiz-application.js';
import {basicVocabularyQuestion} from './chinese-content-curation.js';
import {segmentLearnedChinese} from './chinese-quiz-language.js';

const clean=value=>String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ');
const digest=value=>createHash('sha256').update(value).digest('hex');
function stableId(seed){const s=digest(seed);return `${s.slice(0,8)}-${s.slice(8,12)}-4${s.slice(13,16)}-a${s.slice(17,20)}-${s.slice(20,32)}`;}
const enabled=item=>item.active!==0&&item.active!==false;
const optionsFor=(target,pool,seed)=>{
 const wrong=[...new Set(pool)].filter(v=>v!==target).sort((a,b)=>digest(seed+':'+a).localeCompare(digest(seed+':'+b))).slice(0,3);
 if(wrong.length!==3)throw Error('Chưa đủ đáp án phân biệt trong danh sách nguồn.');
 return [target,...wrong].sort((a,b)=>digest(seed+':options:'+a).localeCompare(digest(seed+':options:'+b)));
};

export function planSourceQuiz({number,setId,items}){
 const source=q1QuizVocabulary.find(s=>s.number===number),sentences=q1QuizApplication[number];
 if(!source||!setId||!sentences)throw Error('Chưa có danh sách từ nguồn đã đối chiếu.');
 const original=items.map(i=>({...i,data:typeof i.data==='string'?JSON.parse(i.data):i.data}));
 const words=source.words.map(word=>{
  if(!word.pinyin||!word.meaning)throw Error(`Thiếu định nghĩa nguồn: ${word.hanzi}`);
  const old=original.find(i=>i.kind==='vocabulary'&&enabled(i)&&clean(i.data.hanzi)===word.hanzi);
  return {...word,id:old?.id,data:{hanzi:word.hanzi,pinyin:word.pinyin,meaning:word.meaning}};
 });
 const recognized=new Map(),allQuestions=original.filter(i=>i.kind==='question');
 for(const item of allQuestions){const match=basicVocabularyQuestion(item,words);if(match)recognized.set(item.id,match);}
 const used=new Set(),questions=[],base=Math.max(0,...original.filter(i=>i.kind!=='question').map(i=>Number(i.position)||0));
 function add(id,data,meta){
  const old=allQuestions.find(q=>q.id===id);used.add(id);
  questions.push({id,set_id:setId,kind:'question',active:1,position:base+questions.length+1,data,existing:Boolean(old),...meta});
 }
 function vocabularyQuestion(word,form){
  const candidates=allQuestions.filter(q=>!used.has(q.id)&&recognized.get(q.id)?.word===word);
  const previous=candidates.find(q=>enabled(q)&&recognized.get(q.id).form===form)||candidates.find(q=>recognized.get(q.id).form===form);
  const id=previous?.id||stableId(`${setId}:user-vocabulary-v2:${word.hanzi}:${form}`),target=word.data[form];
  const pool=words.filter(other=>other.hanzi!==word.hanzi&&other.data.meaning!==word.data.meaning).map(other=>other.data[form]);
  const prompt=form==='meaning'?`Trong bài học, “${word.hanzi}” có nghĩa là gì?`:form==='hanzi'?`Chọn Hán tự có phiên âm “${word.pinyin}” và nghĩa “${word.meaning}”.`:`Chọn phiên âm đúng của “${word.hanzi}” với nghĩa “${word.meaning}”.`;
  add(id,{type:'choice',title:`Từ mới bài ${number}`,prompt,options:optionsFor(target,pool,id),accepted:[target],explanation:`${word.hanzi} đọc là ${word.pinyin}, nghĩa là ${word.meaning}. Nguồn: danh sách đầy đủ người dùng gửi, bài ${number}, dòng ${word.source_line}.`,difficulty:'easy',approved:true,...(word.id?{vocabulary_id:word.id}:{})},{phase:'vocabulary',source_word:word.hanzi,source_line:word.source_line,form});
 }
 // Finish every word in the user's order before starting sentence practice.
 for(const word of words)for(const form of ['meaning','hanzi'])vocabularyQuestion(word,form);
 // Keep whole 20-question stages on each side of the phase boundary. Complete
// the last vocabulary stage with pronunciation review, never future sentences.
 const padding=(20-questions.length%20)%20;
 for(const word of words.slice(-padding||words.length))if(padding&&questions.length%20)vocabularyQuestion(word,'pinyin');
 const vocabularyQuestions=questions.length;
 if(sentences.length!==20||new Set(sentences.map(s=>s.hanzi)).size!==20||new Set(sentences.map(s=>s.meaning)).size!==20)throw Error('Cần 20 tình huống khác nhau cho mỗi bài.');
 for(const [index,sentence]of sentences.entries()){
  const segments=segmentLearnedChinese(sentence.hanzi,number);
  if(!segments.length||!sentence.meaning)throw Error('Thiếu câu vận dụng hoặc bản dịch.');
  for(const form of ['meaning','translation']){
   const id=stableId(`${setId}:cumulative-application-v2:${sentence.hanzi}:${form}`),target=form==='meaning'?sentence.meaning:sentence.hanzi;
   const pool=sentences.map(s=>form==='meaning'?s.meaning:s.hanzi),options=optionsFor(target,pool,id);
   // Validate every Chinese distractor, not only the correct sentence.
   if(form==='translation')for(const option of options)segmentLearnedChinese(option,number);
   add(id,{type:'choice',title:`Vận dụng từ bài 1–${number}`,prompt:form==='meaning'?`Vận dụng: Câu “${sentence.hanzi}” có nghĩa là gì?`:`Vận dụng: Chọn câu tiếng Trung phù hợp với nghĩa “${sentence.meaning}”.`,options,accepted:[target],explanation:`${sentence.hanzi} — ${sentence.meaning} Câu dùng từ trong danh sách bài ${number===1?'1':`1–${number}`}.`,difficulty:'medium',approved:true},{phase:'application',source_word:null,form,application_index:index,cumulative_through:number});
  }
 }
 const hidden=allQuestions.filter(q=>enabled(q)&&!used.has(q.id));
 return {number,set_id:setId,source:source.source,sha256:source.sha256,words,questions,hidden,
  report:{lesson:number,entries:source.entries.length,words:words.length,questions_before:allQuestions.filter(enabled).length,questions_after:questions.length,vocabulary_questions:vocabularyQuestions,vocabulary_stages:vocabularyQuestions/20,application_questions:questions.length-vocabularyQuestions,application_stages:(questions.length-vocabularyQuestions)/20,stages:questions.length/20,hidden:hidden.length,added:questions.filter(q=>!q.existing).length},
 };
}
