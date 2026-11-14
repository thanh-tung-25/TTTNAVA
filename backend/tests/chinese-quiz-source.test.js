import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {q1QuizVocabulary,q1VocabularySource} from '../src/data/chinese-q1-quiz-vocabulary.js';
import {q1QuizApplication} from '../src/data/chinese-q1-quiz-application.js';
import {planSourceQuiz} from '../src/services/chinese-quiz-source.js';
import {segmentLearnedChinese} from '../src/services/chinese-quiz-language.js';
import {issues} from '../src/validators/chinese.js';
import {sequentialQuestions} from '../src/services/chinese-quiz-state.js';

function bank(source){
 const words=source.words.map((w,n)=>({id:randomUUID(),kind:'vocabulary',position:n+1,active:1,data:{hanzi:w.hanzi,pinyin:'old pronunciation',meaning:'old meaning'}}));
 const extra={id:randomUUID(),kind:'vocabulary',position:500,active:1,data:{hanzi:'课文',pinyin:'kèwén',meaning:'bài khóa'}};
 const questions=[...words,extra].map((w,n)=>({id:randomUUID(),kind:'question',position:600+n,active:1,data:{type:'choice',prompt:`Trong bài học, “${w.data.hanzi}” có nghĩa là gì?`,accepted:[w.data.meaning],options:[w.data.meaning,'đáp án ngoài bài'],explanation:`${w.data.hanzi} đọc là ${w.data.pinyin}, nghĩa là ${w.data.meaning}.`,approved:true}}));
 return [...words,extra,...questions];
}
it('keeps every term, compound, number and name from the latest user list',()=>{
 expect(q1QuizVocabulary.map(s=>s.number)).toEqual([1,2,3,4,5,6,7,8,9,10]);
 expect(q1QuizVocabulary.map(l=>l.words.length)).toEqual([28,48,42,49,72,67,66,86,55,56]);
 expect(q1QuizVocabulary.reduce((n,l)=>n+l.entries.length,0)).toBe(570);
 expect(q1QuizVocabulary.reduce((n,l)=>n+l.words.length,0)).toBe(569);
 expect(q1VocabularySource.sha256).toMatch(/^[a-f0-9]{64}$/);
 for(const source of q1QuizVocabulary){
  for(const entry of source.entries){const word=source.words.find(w=>w.hanzi===entry.hanzi);expect(word.pinyin).toBe(entry.pinyin);expect(word.meaning).toContain(entry.meaning);}
  expect(source.words.every(w=>w.hanzi&&w.pinyin&&w.meaning&&w.source_line>0)).toBe(true);
  for(const heading of ['课文','语法','生词','绕口令'])expect(source.words.map(w=>w.hanzi)).not.toContain(heading);
 }
 const one=q1QuizVocabulary[0].words;
 expect(one.find(w=>w.hanzi==='男').meaning).toBe('Nam');expect(one.find(w=>w.hanzi==='难').meaning).toBe('Khó');
 expect(q1QuizVocabulary[1].words.filter(w=>w.group==='numbers')).toHaveLength(11);
 const reading=q1QuizVocabulary[5].words.find(w=>w.hanzi==='读');expect(reading.source_lines).toHaveLength(2);expect(reading.meaning).toContain('Học');expect(reading.meaning).toContain('Đọc');
});
it('teaches every listed word in order before complete application stages, for all ten lessons',()=>{
 for(const source of q1QuizVocabulary){
  const items=bank(source),before=structuredClone(items),plan=planSourceQuiz({number:source.number,setId:randomUUID(),items});
  const vocabulary=plan.questions.filter(q=>q.phase==='vocabulary'),application=plan.questions.filter(q=>q.phase==='application');
  expect(issues(plan.questions)).toEqual([]);expect(application).toHaveLength(40);expect(vocabulary.length%20).toBe(0);
  expect(plan.questions.indexOf(application[0])).toBe(vocabulary.length);
  expect(vocabulary.filter(q=>q.form==='meaning').map(q=>q.source_word)).toEqual(source.words.map(w=>w.hanzi));
  const pools={meaning:new Set(source.words.map(w=>w.meaning)),hanzi:new Set(source.words.map(w=>w.hanzi)),pinyin:new Set(source.words.map(w=>w.pinyin))};
  for(const q of vocabulary){expect(q.data.options.every(v=>pools[q.form].has(v))).toBe(true);expect(q.data.explanation).toContain('dòng '+q.source_line);}
  for(const q of application){expect(q.cumulative_through).toBe(source.number);if(q.form==='translation')for(const option of q.data.options)expect(()=>segmentLearnedChinese(option,source.number)).not.toThrow();}
  for(let block=0;block<plan.report.stages;block++){const chosen=sequentialQuestions(plan.questions,block);expect(chosen).toHaveLength(20);expect(new Set(chosen.map(q=>q.phase)).size).toBe(1);}
  expect(plan.hidden.some(q=>q.data.explanation.startsWith('课文 đọc là'))).toBe(true);expect(items).toEqual(before);
 }
});
it('uses only learned cumulative Chinese in every application prompt and distractor',()=>{
 for(const [number,rows]of Object.entries(q1QuizApplication)){
  expect(rows).toHaveLength(20);for(const row of rows)expect(segmentLearnedChinese(row.hanzi,Number(number)).length).toBeGreaterThan(0);
 }
 expect(()=>segmentLearnedChinese('你是哪国人？',1)).toThrow('chưa học');expect(()=>segmentLearnedChinese('你是哪国人？',2)).not.toThrow();
 expect(()=>segmentLearnedChinese('我有名片。',2)).toThrow('chưa học');expect(()=>segmentLearnedChinese('我有名片。',3)).not.toThrow();
 expect(()=>segmentLearnedChinese('我想喝茶。',4)).toThrow('chưa học');expect(()=>segmentLearnedChinese('我想喝茶。',5)).not.toThrow();
 expect(()=>segmentLearnedChinese('我坐地铁去学校。',8)).toThrow('chưa học');expect(()=>segmentLearnedChinese('我坐地铁去学校。',9)).not.toThrow();
 expect(()=>segmentLearnedChinese('我正在洗衣服。',6)).toThrow('chưa học');expect(()=>segmentLearnedChinese('我正在洗衣服。',10)).not.toThrow();
});
it('preserves matching meaning-question IDs but uses the user-supplied definitions',()=>{
 const source=q1QuizVocabulary[0],items=bank(source),plan=planSourceQuiz({number:1,setId:randomUUID(),items:items.toReversed()});
 expect(plan.questions.filter(q=>q.phase==='vocabulary'&&q.form==='meaning').map(q=>q.id)).toEqual(items.filter(i=>i.kind==='question'&&!i.data.explanation.startsWith('课文')).map(i=>i.id));
 expect(plan.questions.some(q=>q.data.accepted.includes('old meaning'))).toBe(false);
});
it('is idempotent and can supply source words missing from the old bank',()=>{
 const source=q1QuizVocabulary[0],items=bank(source),setId=randomUUID(),plan=planSourceQuiz({number:1,setId,items});
 const hidden=new Set(plan.hidden.map(q=>q.id)),chosen=new Map(plan.questions.map(q=>[q.id,q]));
 const after=items.map(i=>chosen.get(i.id)||{...i,active:hidden.has(i.id)?0:i.active});after.push(...plan.questions.filter(q=>!items.some(i=>i.id===q.id)));
 const rerun=planSourceQuiz({number:1,setId,items:after}),persisted=p=>p.questions.map(({id,position,data})=>({id,position,data}));
 expect(persisted(rerun)).toEqual(persisted(plan));expect(rerun.hidden).toHaveLength(0);expect(rerun.report.added).toBe(0);
 const empty=planSourceQuiz({number:1,setId:randomUUID(),items:[]});expect(empty.words).toHaveLength(28);expect(issues(empty.questions)).toEqual([]);
 expect(()=>planSourceQuiz({number:11,setId,items:[]})).toThrow('Chưa có danh sách');
});
