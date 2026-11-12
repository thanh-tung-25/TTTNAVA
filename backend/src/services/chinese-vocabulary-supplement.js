import {randomUUID} from 'node:crypto';
import {withTransaction} from '../config/db.js';
import {json} from '../repositories/chinese.js';
import {issues} from '../validators/chinese.js';
import {chineseQuestionPrompt} from '../../../frontend/assets/js/chinese-question-prompt.js';

const clean=value=>String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ');

// Recover only explicit definitions from reviewed meaning questions. Contextual
// explanations and distractor options are never treated as vocabulary sources.
export function planVocabularySupplement(items){
 const words=new Map();
 for(const item of items){
  if(item.kind!=='question'||item.active===0||item.active===false||!item.data.approved)continue;
  const data=item.data;
  const prompt=chineseQuestionPrompt(clean(data.prompt)).match(/^Trong bài học, [“"]([\p{Script=Han}·]+)[”"] có nghĩa là gì\?$/u);
  if(!prompt)continue;
  const definition=clean(data.explanation).match(/^([\p{Script=Han}·]+) đọc là ([\p{Script=Latin}\p{M}\s/'’0-5]+), nghĩa là (.+?)\.?$/u);
  if(!definition||definition[1]!==prompt[1]||definition[3].includes('đọc là'))throw Error(`Chưa xác định được từ vựng nguồn: ${prompt[1]}`);
  const word={hanzi:definition[1],pinyin:clean(definition[2]),meaning:clean(definition[3])};
  if(!(data.accepted||[]).some(answer=>clean(answer)===word.meaning))throw Error(`Nghĩa không khớp đáp án đã duyệt: ${word.hanzi}`);
  const previous=words.get(word.hanzi);
  if(previous&&JSON.stringify(previous)!==JSON.stringify(word))throw Error(`Định nghĩa nguồn mâu thuẫn: ${word.hanzi}`);
  words.set(word.hanzi,word);
 }
 // Include inactive vocabulary: a teacher's removal must not be undone by reruns.
 const existing=new Set(items.filter(i=>i.kind==='vocabulary').map(i=>clean(i.data.hanzi)));
 const additions=[...words.values()].filter(word=>!existing.has(word.hanzi)).map(data=>({kind:'vocabulary',data}));
 const errors=additions.length?issues(additions):[];
 if(errors.length)throw Error(JSON.stringify(errors));
 return {source_count:words.size,existing_count:words.size-additions.length,additions};
}

// Append without changing question IDs, positions, answers, published status,
// attempts, progress, or any vocabulary a teacher has already edited.
export async function supplementVocabulary(setId,{apply=false,expectedCount}={},connection){
 const supplement=async activeConnection=>{
  const run=async(sql,params=[]) => (await activeConnection.query(sql,params))[0];
  const [set]=await run('SELECT id FROM chinese_sets WHERE id=? FOR UPDATE',[setId]);
  if(!set)throw Error('Không tìm thấy tài liệu cần bổ sung từ vựng');
  const items=(await run('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id',[setId])).map(item=>({...item,data:json(item.data)}));
  const plan=planVocabularySupplement(items);
  if(expectedCount!==undefined&&plan.source_count!==expectedCount)throw Error(`Số từ nguồn đã thay đổi: cần ${expectedCount}, tìm thấy ${plan.source_count}. Hãy kiểm tra lại tài liệu.`);
  let position=items.reduce((max,item)=>Math.max(max,Number(item.position)),0);
  if(apply)for(const item of plan.additions)await run('INSERT INTO chinese_items (id,set_id,kind,position,data) VALUES (?,?,?,?,?)',[randomUUID(),setId,item.kind,++position,JSON.stringify(item.data)]);
  return {set_id:setId,source_count:plan.source_count,existing_count:plan.existing_count,missing_count:plan.additions.length,added:apply?plan.additions.length:0};
 };
 return connection?supplement(connection):withTransaction(supplement);
}
