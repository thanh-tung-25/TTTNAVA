import {randomUUID} from 'node:crypto';
import {afterEach,expect,it} from 'vitest';
import {query,withTransaction} from '../src/config/db.js';
import {json} from '../src/repositories/chinese.js';
import {detail} from '../src/services/chinese.js';
import {speakingLessonBanks} from '../src/data/chinese-speaking-lessons-1-6.js';
import {planSpeakingQuestionBank,replaceSpeakingQuestionBank} from '../src/services/chinese-speaking-question-bank.js';
import {createTestUser} from './helpers/index.js';

const fixtures=[],users=[];
const spoken=(n,selected=n<4)=>({id:randomUUID(),kind:'dialogue',position:n+10,active:1,data:{practice:'speaking',text:'旧问题'+n+'？',speaking_selected:selected,pinyin:'old pinyin',answer_reference:'old answer'}});
async function fixture(items=[],settings=null){
 const lesson=randomUUID(),set=randomUUID();fixtures.push({lesson,set});
 await query("INSERT INTO chinese_lessons(id,level_id,title,status) VALUES (?,1,'Oral bank fixture','published')",[lesson]);
 await query("INSERT INTO chinese_sets(id,lesson_id,title,status,processing_status,speaking_settings) VALUES (?,?,'Mixed source','published','ready',?)",[set,lesson,settings?JSON.stringify(settings):null]);
 for(const [n,item]of items.entries())await query('INSERT INTO chinese_items(id,set_id,kind,position,data,active) VALUES (?,?,?,?,?,?)',[item.id||randomUUID(),set,item.kind,item.position??n+1,JSON.stringify(item.data),item.active??1]);
 return set;
}
const rows=async set=>(await query('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id',[set])).map(i=>({...i,data:json(i.data)}));
afterEach(async()=>{
 for(const user of users.splice(0))await query('DELETE FROM profiles WHERE id=?',[user.id]);
 for(const f of fixtures.splice(0)){await query('DELETE FROM chinese_items WHERE set_id=?',[f.set]);await query('DELETE FROM chinese_sets WHERE id=?',[f.set]);await query('DELETE FROM chinese_lessons WHERE id=?',[f.lesson]);}
});

it('provides 60 real Chinese questions with teacher references, without answer cues in the spoken prompts',()=>{
 expect(speakingLessonBanks.map(p=>p.lesson)).toEqual([1,2,3,4,5,6]);
 for(const pack of speakingLessonBanks){
  const plan=planSpeakingQuestionBank([],pack,null);expect(plan.total).toBe(10);expect(plan.assigned).toBe(3);
  expect(plan.settings).toEqual({duration_seconds:90,order:'sequential',ai_assessment:true});
  expect(new Set(pack.questions.map(q=>q.text)).size).toBe(10);
  for(const q of pack.questions){expect(q.text).toMatch(/^[\p{Script=Han}\p{Punctuation}\s]+？$/u);expect(q.text).not.toMatch(/拼音|答案|提示|回答是/u);expect(q.assessment_notes).toContain('khác ví dụ');}
 }
});

it('keeps teacher selection, duration and an explicit AI opt-out while replacing old question content',()=>{
 const original=[spoken(0,true),spoken(1,false),{...spoken(2),active:0}],before=structuredClone(original);
 const plan=planSpeakingQuestionBank(original,speakingLessonBanks[0],{duration_seconds:120,order:'free',ai_assessment:false});
 expect(plan.bank[0].id).toBe(original[0].id);expect(plan.bank[1].id).toBe(original[1].id);
 expect(plan.assigned).toBe(1);expect(plan.settings).toEqual({duration_seconds:120,order:'free',ai_assessment:false});
 expect(plan.bank.some(q=>q.id===original[2].id)).toBe(false);expect(plan.bank[0].data).not.toHaveProperty('pinyin');expect(original).toEqual(before);
});

it('preserves quiz, vocabulary, reviews, progress and historical results, and reruns without changes',async()=>{
 const quiz={id:randomUUID(),kind:'question',data:{type:'choice',prompt:'你好 nghĩa là gì?',options:['xin chào','tạm biệt'],accepted:['xin chào'],explanation:'Lời chào.',approved:true}},word={id:randomUUID(),kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'xin chào'}},reading={id:randomUUID(),kind:'dialogue',data:{text:'你好！'}};
 const speech=Array.from({length:12},(_,n)=>spoken(n)),inactive={...spoken(20),active:0};
 const set=await fixture([quiz,word,reading,...speech,inactive],{duration_seconds:120,order:'free',ai_assessment:true});
 const student=await createTestUser({grade:null});users.push(student);
 await query('INSERT INTO chinese_progress(student_id,set_id,last_item,read_items) VALUES (?,?,?,?)',[student.id,set,word.id,JSON.stringify([reading.id])]);
 await query("INSERT INTO chinese_reviews(student_id,item_id,memory,favorite) VALUES (?,?,'remembered',1)",[student.id,word.id]);
 await query('INSERT INTO chinese_attempts(id,student_id,set_id,snapshot,answers) VALUES (?,?,?,?,?)',[randomUUID(),student.id,set,JSON.stringify({items:[quiz]}),JSON.stringify({[quiz.id]:{value:'xin chào',locked:true}})]);
 await query('INSERT INTO chinese_speaking_submissions(id,student_id,set_id,recording_id,recording_code,level_id,lesson_title,set_title,snapshot,result,recorded_at) VALUES (?,?,?,?,?,1,?,?,?,?,?)',[randomUUID(),student.id,set,randomUUID(),'HISTORY1','Old lesson','Old oral assignment',JSON.stringify({questions:[{question:speech[0].data.text}]}),JSON.stringify({overall_score:80}),new Date()]);
 const history=async()=>({progress:await query('SELECT * FROM chinese_progress WHERE set_id=?',[set]),reviews:await query('SELECT * FROM chinese_reviews WHERE student_id=?',[student.id]),attempts:await query('SELECT * FROM chinese_attempts WHERE set_id=?',[set]),speaking:await query('SELECT * FROM chinese_speaking_submissions WHERE set_id=?',[set])});
 const before=await rows(set),savedHistory=await history();
 expect((await replaceSpeakingQuestionBank(set,{pack:speakingLessonBanks[0]})).changes).toBeGreaterThan(0);expect(await rows(set)).toEqual(before);
 const applied=await replaceSpeakingQuestionBank(set,{pack:speakingLessonBanks[0],apply:true});expect(applied).toMatchObject({questions:10,assigned:4,updated:10,added:0,retired:2});
 const after=await rows(set);expect(after.filter(i=>[quiz.id,word.id,reading.id,inactive.id].includes(i.id))).toEqual(before.filter(i=>[quiz.id,word.id,reading.id,inactive.id].includes(i.id)));
 expect(after.filter(i=>i.active&&i.data.practice==='speaking').map(i=>i.id)).toEqual(speech.slice(0,10).map(i=>i.id));expect(await history()).toEqual(savedHistory);
 expect((await replaceSpeakingQuestionBank(set,{pack:speakingLessonBanks[0],apply:true})).changes).toBe(0);expect(await rows(set)).toEqual(after);
 const learner=await detail(set,false,student.id),teacher=await detail(set,true);
 expect(learner.items.filter(i=>i.data.practice==='speaking')).toHaveLength(4);
 expect(learner.items.filter(i=>i.data.practice==='speaking').every(i=>!('meaning'in i.data)&&!('answer_reference'in i.data)&&!('assessment_notes'in i.data))).toBe(true);
 expect(teacher.items.filter(i=>i.data.practice==='speaking')).toHaveLength(10);
});

it('adds the new speaking section without editing existing study items',async()=>{
 const item={id:randomUUID(),kind:'vocabulary',data:{hanzi:'吃',meaning:'ăn'}},set=await fixture([item]);const before=await rows(set);
 expect(await replaceSpeakingQuestionBank(set,{pack:speakingLessonBanks[4],apply:true})).toMatchObject({added:10,assigned:3});
 expect((await rows(set)).find(i=>i.id===item.id)).toEqual(before[0]);
 expect((await replaceSpeakingQuestionBank(set,{pack:speakingLessonBanks[4],apply:true})).changes).toBe(0);
});

it('rolls back earlier lesson changes if another teacher edits a later source after the preview',async()=>{
 const first=await fixture([spoken(0)]),second=await fixture([spoken(1)]),before=await rows(first);
 const firstPlan=await replaceSpeakingQuestionBank(first,{pack:speakingLessonBanks[0]}),secondPlan=await replaceSpeakingQuestionBank(second,{pack:speakingLessonBanks[1]});
 await query('UPDATE chinese_sets SET speaking_settings=? WHERE id=?',[JSON.stringify({duration_seconds:180,order:'free',ai_assessment:false}),second]);
 await expect(withTransaction(async c=>{
  await replaceSpeakingQuestionBank(first,{pack:speakingLessonBanks[0],apply:true,expectedFingerprint:firstPlan.fingerprint},c);
  await replaceSpeakingQuestionBank(second,{pack:speakingLessonBanks[1],apply:true,expectedFingerprint:secondPlan.fingerprint},c);
 })).rejects.toThrow('Nội dung đã thay đổi');
 expect(await rows(first)).toEqual(before);
});
