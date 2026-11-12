import {createHash,randomUUID} from 'node:crypto';
import {withTransaction} from '../config/db.js';
import {json} from '../repositories/chinese.js';
import {issues,itemSchema,speakingSettingsSchema} from '../validators/chinese.js';
import {speakingSettings} from '../../../frontend/assets/js/chinese-speaking-data.js';

const spoken=item=>item.kind==='dialogue'&&item.data?.practice==='speaking';
const active=item=>item.active!==0&&item.active!==false;
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export const speakingBankFingerprint=(set,items)=>hash({id:set.id,title:set.title,status:set.status,settings:json(set.speaking_settings),items:items.map(({id,kind,position,active:enabled,data})=>({id,kind,position,active:enabled,data}))});

export function planSpeakingQuestionBank(items,pack,currentSettings){
 if(!pack||!Array.isArray(pack.questions)||!pack.questions.length||pack.questions.length>20)throw Error('Ngân hàng luyện nói cần 1–20 câu.');
 if(pack.questions.some(q=>!q.text.endsWith('？')||!q.meaning||!q.answer_reference||!q.assessment_notes))throw Error('Mỗi mục cần là câu hỏi và có nghĩa, đáp án tham khảo, tiêu chí cho cô.');
 const previous=items.filter(item=>active(item)&&spoken(item));
 const configured=previous.some(item=>item.data.speaking_selected!==undefined);
 let position=items.reduce((max,item)=>Math.max(max,Number(item.position)||0),0);
 const bank=pack.questions.map((question,n)=>({id:previous[n]?.id,kind:'dialogue',position:previous[n]?.position??++position,data:{practice:'speaking',...question,speaking_selected:configured?(previous[n]?previous[n].data.speaking_selected!==false:false):n<3}}));
 if(!bank.some(item=>item.data.speaking_selected))bank.slice(0,3).forEach(item=>{item.data.speaking_selected=true;});
 for(const item of bank)itemSchema.parse(item);
 const errors=issues(bank);if(errors.length)throw Error(JSON.stringify(errors));
 const updates=bank.filter((item,n)=>item.id&&hash(item.data)!==hash(previous[n].data)),additions=bank.filter(item=>!item.id),retired=previous.slice(bank.length);
 const raw=json(currentSettings),settings=speakingSettingsSchema.parse({...speakingSettings({speaking_settings:raw}),ai_assessment:raw?.ai_assessment??true});
 const settingsChanged=hash(raw)!==hash(settings);
 return {bank,updates,additions,retired,settings,settingsChanged,previous_count:previous.length,total:bank.length,assigned:bank.filter(item=>item.data.speaking_selected).length,changed:updates.length+additions.length+retired.length+(settingsChanged?1:0)};
}

// Update only the active speaking section. Keep all other content and every
// historical ID/snapshot; excess speaking rows are retired instead of deleted.
export async function replaceSpeakingQuestionBank(setId,{pack,apply=false,expectedFingerprint}={},connection){
 const work=async c=>{
  const run=async(sql,params=[]) => (await c.query(sql,params))[0];
  const [set]=await run('SELECT id,title,status,speaking_settings FROM chinese_sets WHERE id=? FOR UPDATE',[setId]);
  if(!set)throw Error('Không tìm thấy bộ cần sửa luyện nói.');
  const items=(await run('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id',[setId])).map(item=>({...item,data:json(item.data)}));
  const fingerprint=speakingBankFingerprint(set,items);
  if(expectedFingerprint&&fingerprint!==expectedFingerprint)throw Error('Nội dung đã thay đổi sau khi rà soát; dừng để tránh ghi đè cửa sổ đang soạn.');
  const plan=planSpeakingQuestionBank(items,pack,set.speaking_settings);
  if(apply){
   for(const item of plan.updates)await run('UPDATE chinese_items SET data=? WHERE id=? AND set_id=?',[JSON.stringify(item.data),item.id,setId]);
   for(const item of plan.additions)await run('INSERT INTO chinese_items(id,set_id,kind,position,data) VALUES (?,?,?,?,?)',[randomUUID(),setId,'dialogue',item.position,JSON.stringify(item.data)]);
   for(const item of plan.retired)await run('UPDATE chinese_items SET active=0 WHERE id=? AND set_id=?',[item.id,setId]);
   if(plan.settingsChanged)await run('UPDATE chinese_sets SET speaking_settings=? WHERE id=?',[JSON.stringify(plan.settings),setId]);
  }
  return {set_id:setId,previous_count:plan.previous_count,questions:plan.total,assigned:plan.assigned,updated:plan.updates.length,added:plan.additions.length,retired:plan.retired.length,settings_changed:plan.settingsChanged,changes:plan.changed,fingerprint};
 };
 return connection?work(connection):withTransaction(work);
}
