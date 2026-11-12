import {randomUUID} from 'node:crypto';
import {afterEach,it,expect} from 'vitest';
import {query,withTransaction} from '../src/config/db.js';
import {planVocabularySupplement,supplementVocabulary} from '../src/services/chinese-vocabulary-supplement.js';
import {catalog,detail} from '../src/services/chinese.js';
import {createTestUser} from './helpers/index.js';

const question=(hanzi,pinyin,meaning)=>({kind:'question',data:{type:'choice',prompt:`Trong bài học, “${hanzi}” có nghĩa là gì?`,options:[meaning,'đáp án khác'],accepted:[meaning],explanation:`${hanzi} đọc là ${pinyin}, nghĩa là ${meaning}.`,approved:true}});
const fixtures=[],users=[];
async function fixture(items){
 const lesson=randomUUID(),set=randomUUID();fixtures.push({lesson,set});
 await query("INSERT INTO chinese_lessons(id,level_id,title,status) VALUES (?,1,'Vocabulary supplement test','published')",[lesson]);
 await query("INSERT INTO chinese_sets(id,lesson_id,title,status,processing_status) VALUES (?,?,'Source questions','published','ready')",[set,lesson]);
 for(const [position,item]of items.entries())await query('INSERT INTO chinese_items(id,set_id,kind,position,data,active) VALUES (?,?,?,?,?,?)',[item.id||randomUUID(),set,item.kind,position+1,JSON.stringify(item.data),item.active??1]);
 return set;
}
afterEach(async()=>{
 for(const user of users.splice(0))await query('DELETE FROM profiles WHERE id=?',[user.id]);
 for(const {lesson,set}of fixtures.splice(0)){
  await query('DELETE FROM chinese_items WHERE set_id=?',[set]);
  await query('DELETE FROM chinese_sets WHERE id=?',[set]);
  await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);
 }
});

it('recovers explicit source definitions with Unicode, punctuation and multiple readings',()=>{
 const q=question('谁','shéi / shuí','ai (hai cách đọc)');
 q.data.prompt='Trong bài học, “谁” (shéi) có nghĩa là gì?';
 const plan=planVocabularySupplement([q,q,question('种','zhòng','trồng (trong câu 妈种麻)'),question('你','ni\u030c','bạn, anh, chị (ngôi thứ hai)')]);
 expect(plan.source_count).toBe(3);
 expect(plan.additions.map(i=>i.data)).toEqual([{hanzi:'谁',pinyin:'shéi / shuí',meaning:'ai (hai cách đọc)'},{hanzi:'种',pinyin:'zhòng',meaning:'trồng (trong câu 妈种麻)'},{hanzi:'你',pinyin:'nǐ',meaning:'bạn, anh, chị (ngôi thứ hai)'}]);
});

it('does not infer vocabulary from distractors, other exercise types or unreviewed content',()=>{
 const definition=question('你','nǐ','bạn');
 expect(planVocabularySupplement([
  {...definition,data:{...definition.data,prompt:'Chọn phiên âm đúng của “你”.'}},
  {...definition,data:{...definition.data,approved:false}},
  {...definition,active:0},
  {kind:'dialogue',data:{text:'你好'}},
 ]).additions).toEqual([]);
});

it('preserves edited vocabulary and does not restore a teacher’s removed vocabulary',()=>{
 const existing=[{kind:'vocabulary',data:{hanzi:'你',pinyin:'ní',meaning:'admin đã sửa'}},{kind:'vocabulary',active:0,data:{hanzi:'谁',meaning:'đã bỏ'}}];
 const before=structuredClone(existing);
 expect(planVocabularySupplement([...existing,question('你','nǐ','bạn'),question('谁','shéi / shuí','ai')])).toMatchObject({source_count:2,existing_count:2,additions:[]});
 expect(existing).toEqual(before);
});

it('stops on mismatched answers, malformed definitions or conflicting source meanings',()=>{
 const q=question('你','nǐ','bạn');
 for(const data of [{...q.data,accepted:['tôi']},{...q.data,explanation:'Tự suy đoán phiên âm từ đáp án.'},{...q.data,explanation:'您 đọc là nín, nghĩa là bạn.'}])expect(()=>planVocabularySupplement([{...q,data}])).toThrow();
 expect(()=>planVocabularySupplement([q,question('你','nǐ','cậu')])).toThrow('mâu thuẫn');
});

it('adds real student vocabulary idempotently while preserving questions and learning history',async()=>{
 const q=question('你','nǐ','bạn'),q2=question('谁','shéi / shuí','ai');q.id=randomUUID();q2.id=randomUUID();
 const edited={kind:'vocabulary',data:{hanzi:'你',pinyin:'nǐ',meaning:'bạn (cô giáo đã sửa)',mnemonic:'Giữ ghi chú'}};
 const set=await fixture([q,q2,edited]),student=await createTestUser();users.push(student);
 await query('INSERT INTO chinese_progress(student_id,set_id,last_item,read_items) VALUES (?,?,?,?)',[student.id,set,q.id,JSON.stringify([q.id])]);
 await query("INSERT INTO chinese_reviews(student_id,item_id,memory,favorite) VALUES (?,?,'remembered',1)",[student.id,q.id]);
 await query('INSERT INTO chinese_attempts(id,student_id,set_id,snapshot,answers) VALUES (?,?,?,?,?)',[randomUUID(),student.id,set,JSON.stringify({items:[q]}),JSON.stringify({[q.id]:'bạn'})]);
 const snapshot=async()=>({
  set:await query('SELECT * FROM chinese_sets WHERE id=?',[set]),
  old:await query('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id LIMIT 3',[set]),
  progress:await query('SELECT * FROM chinese_progress WHERE set_id=?',[set]),
  reviews:await query('SELECT * FROM chinese_reviews WHERE student_id=?',[student.id]),
  attempts:await query('SELECT * FROM chinese_attempts WHERE set_id=?',[set]),
 });
 const before=await snapshot();
 expect(await supplementVocabulary(set,{expectedCount:2})).toMatchObject({source_count:2,missing_count:1,added:0});
 expect((await query('SELECT id FROM chinese_items WHERE set_id=?',[set])).length).toBe(3);
 expect(await supplementVocabulary(set,{apply:true,expectedCount:2})).toMatchObject({added:1});
 expect(await snapshot()).toEqual(before);
 expect(await supplementVocabulary(set,{apply:true,expectedCount:2})).toMatchObject({missing_count:0,added:0});
 const published=await detail(set,false,student.id);
 expect(published.items.filter(i=>i.kind==='vocabulary').map(i=>i.data)).toEqual([edited.data,{hanzi:'谁',pinyin:'shéi / shuí',meaning:'ai'}]);
 expect(published.items.find(i=>i.id===q.id).data).not.toHaveProperty('accepted');
 const c=await catalog(false,student.id);
 expect(c.counts.find(i=>i.set_id===set&&i.kind==='vocabulary').total).toBe(2);
 expect(c.counts.find(i=>i.set_id===set&&i.kind==='question').total).toBe(2);
});

it('rolls back the whole batch if a second bank has changed',async()=>{
 const set=await fixture([question('你','nǐ','bạn')]),other=await fixture([question('叫','jiào','gọi')]);
 await expect(withTransaction(async connection=>{
  await supplementVocabulary(set,{apply:true,expectedCount:1},connection);
  await supplementVocabulary(other,{apply:true,expectedCount:2},connection);
 })).rejects.toThrow('Số từ nguồn đã thay đổi');
 expect(await query("SELECT id FROM chinese_items WHERE set_id IN (?,?) AND kind='vocabulary'",[set,other])).toEqual([]);
});
