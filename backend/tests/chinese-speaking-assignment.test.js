import {it,expect} from 'vitest';
import {issues} from '../src/validators/chinese.js';
import {speakingQuestions,speakingSettings,speakingTime} from '../../frontend/assets/js/chinese-speaking-data.js';
import {modeCounts} from '../../frontend/assets/js/chinese-learning-modes.js';
const item=(n,selected)=>({kind:'dialogue',data:{practice:'speaking',text:`你有${n}个朋友吗？`,...(selected===undefined?{}:{speaking_selected:selected})}});
it('defaults to three questions and ninety seconds and respects explicit selection and authored order',()=>{
 const items=Array.from({length:6},(_,n)=>item(n));expect(speakingQuestions(null,items).map(i=>i.text)).toEqual(items.slice(0,3).map(i=>i.data.text));expect(speakingSettings({})).toEqual({duration_seconds:90,order:'sequential'});
 const chosen=[item(5,true),item(2,false),item(1,true),item(4,true),item(3,true)];expect(speakingQuestions(null,chosen).map(q=>q.text)).toEqual([5,1,4,3].map(n=>item(n).data.text));
 expect(speakingSettings({speaking_settings:'{"duration_seconds":120,"order":"free"}'})).toEqual({duration_seconds:120,order:'free'});expect(speakingTime(90)).toBe('01:30');
});
it('does not turn unassigned speaking questions into reading progress or show them as reading content',()=>{
 expect(modeCounts({id:'set',speaking_count:2},[{set_id:'set',kind:'dialogue',total:8,speaking_total:8}])).toMatchObject({read:0,speak:2});
});
it('requires one to twenty selected questions and still reviews invalid source rows',()=>{
 expect(issues([item(1,false)]).some(e=>e.message.includes('1 đến 20'))).toBe(true);
 expect(issues(Array.from({length:21},(_,n)=>item(n,true))).some(e=>e.message.includes('1 đến 20'))).toBe(true);
 expect(issues(Array.from({length:30},(_,n)=>item(n)))).toEqual([]);
 expect(issues([{kind:'dialogue',data:{practice:'speaking',text:'không phải chữ Hán',speaking_selected:false}},item(1,true)]).some(e=>e.message.includes('tiếng Trung'))).toBe(true);
});
