import {describe,it,expect,vi,afterEach} from 'vitest';
import {curateChineseLesson,basicVocabularyQuestion} from '../src/services/chinese-content-curation.js';
import {mixStudy,studyConcept,activityConcept,uniqueStudyWords,sessionStudyDeck} from '../../frontend/assets/js/chinese-study-variety.js';
const word=(id,hanzi='我',meaning='tôi')=>({id,kind:'vocabulary',position:1,active:1,data:{hanzi,pinyin:'wǒ',meaning}});
const definition=(w,form,n=0)=>({id:w.id+'-'+form+n,kind:'question',active:1,position:n+2,data:{type:'choice',approved:true,prompt:form==='meaning'?`Trong bài học, “${w.data.hanzi}” (wǒ) có nghĩa là gì?`:form==='pinyin'?`Chọn phiên âm đúng của “${w.data.hanzi}” trong bài học.`:`Chọn Hán tự có phiên âm “wǒ” và nghĩa “${w.data.meaning}”.`,options:[],accepted:[form==='meaning'?w.data.meaning:form==='pinyin'?'wǒ':w.data.hanzi],explanation:`${w.data.hanzi} đọc là wǒ, nghĩa là ${w.data.meaning}.`}});
const bank=words=>words.flatMap(w=>[w,...['meaning','hanzi','pinyin'].map((form,n)=>definition(w,form,n))]);
afterEach(()=>vi.unstubAllGlobals());
describe('Chinese lesson variety',()=>{
 it('caps generated definitions while preserving contextual uses of the same word and original input',()=>{
  const w=word('word'),context={id:'context',kind:'question',active:1,data:{prompt:'Điền từ: ___喜欢中国电影。',accepted:['我'],explanation:'Chọn chủ ngữ thích hợp.',approved:true}},items=[...bank([w]),context],before=structuredClone(items),plan=curateChineseLesson({number:1,items});
  expect(plan.report.after.questions).toBe(3);expect(plan.report.max_questions_per_word).toBe(2);expect(plan.items.some(i=>i.id==='context')).toBe(true);expect(plan.items.filter(i=>i.data.vocabulary_id===w.id)).toHaveLength(2);expect(items).toEqual(before);expect(basicVocabularyQuestion(context,[w])).toBeNull();
 });
 it('keeps only one definition for a word reviewed in an earlier lesson',()=>{
  const seenWords=new Set();curateChineseLesson({number:1,items:bank([word('one')]),seenWords});const plan=curateChineseLesson({number:2,items:bank([word('two')]),seenWords});expect(plan.report.after.questions).toBe(1);expect(plan.items.find(i=>i.kind==='question').data.prompt).not.toContain('wǒ');
 });
 it('avoids identical reverse-definition prompts for synonyms and never restores inactive items',()=>{
  const words=[word('a','前','phía trước'),word('b','前边','phía trước')],inactive={...word('removed','旧'),active:0},plan=curateChineseLesson({number:7,items:[...bank(words),inactive]});
  const prompts=plan.items.filter(i=>i.kind==='question').map(i=>i.data.prompt);expect(new Set(prompts).size).toBe(prompts.length);expect(plan.items.some(i=>i.id==='removed')).toBe(false);expect(plan.report.after.words).toBe(2);
 });
 it('keeps distinct word senses but removes exact duplicate word cards',()=>{
  const first=word('a','要','muốn'),copy={...first,id:'b'},second=word('c','要','cần');expect(uniqueStudyWords([first,copy,second])).toEqual([first,second]);
 });
 it('reduces four versions of a sentence to two and recognizes the translated fill version',()=>{
  const tasks=Array.from({length:10},(_,i)=>{const answer=`我有${i+1}本书。`;return [{type:'order',prompt:'Xếp câu',answer,tokens:['我','有',String(i+1),'本书','。']},{type:'fix',prompt:'Sửa câu',answer},{type:'fill',prompt:`我___${i+1}本书。 (Tôi có sách.)`,answer:'有'},{type:'dialogue',prompt:'Đáp lời',speech:'你有什么？',answer}];}).flat(),plan=curateChineseLesson({number:1,items:bank([word('word')]),activities:{topic:'Sách',tasks}});
  expect(plan.activities.tasks).toHaveLength(20);expect(plan.report.activity_types).toEqual({order:5,fix:5,fill:5,dialogue:5});const counts={};for(const t of plan.activities.tasks)counts[activityConcept(t)]=(counts[activityConcept(t)]||0)+1;expect(Object.values(counts).every(n=>n===2)).toBe(true);
  const rerun=curateChineseLesson({number:1,items:plan.items,activities:plan.activities});expect(rerun.taskRemovals).toEqual([]);expect(rerun.items).toEqual(plan.items);expect(rerun.activities).toEqual(plan.activities);
 });
 it('spreads repeated concepts out of the same twenty-question round without losing questions',()=>{
  const items=Array.from({length:60},(_,i)=>({id:String(i),kind:'question',data:{vocabulary_id:'word-'+Math.floor(i/2)}}));let n=1;const deck=mixStudy(items,{random:()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296)});expect(deck).toHaveLength(60);expect(new Set(deck.slice(0,20).map(studyConcept)).size).toBe(20);expect(new Set(deck.map(i=>i.id)).size).toBe(60);
 });
 it('retains shuffled card order on reload and rebuilds it when the teacher changes the bank',()=>{
  const stored=new Map();vi.stubGlobal('sessionStorage',{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)});const items=[word('a'),word('b','你'),word('c','她')],deck=sessionStudyDeck(items,'lesson');expect(sessionStudyDeck([...items].reverse(),'lesson')).toEqual(deck);expect(sessionStudyDeck(items.slice(1),'lesson').map(i=>i.id).sort()).toEqual(['b','c']);
 });
});
