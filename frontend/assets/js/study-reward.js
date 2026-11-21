import {api,el} from './api.js';
import {syncDiamondTotal} from './ui-core.js';

export function rewardText(reward){return reward?.earned>0?'💎 +'+reward.earned+' kim cương · Đã lưu vào tài khoản.':reward?.reason==='already_rewarded'?'Đã nhận thưởng phần này hôm nay.':reward?.reason==='daily_limit'?'Đã nhận đủ 20 kim cương tự luyện hôm nay.':'';}
export function rewardNotice(reward){const node=el('p',{class:'study-reward-status',role:'status',text:rewardText(reward)});if(reward&&reward.reason!=='preview')syncDiamondTotal();return node;}
export function studyReward({activity,sourceId,unit='all',required=10}){
 const enabled=document.body.dataset.role==='student'&&Boolean(sourceId),items=new Map(),actions=new Set(),pending=new Map();let session,starting,finishing,receipt,extra={},saving;
 const node=el('div',{class:'study-reward-status',role:'status','aria-live':'polite'});
 const rewardLine=el('span'),progressLine=el('span',{class:'study-progress-status'});node.append(rewardLine,progressLine);
 if(enabled)rewardLine.textContent='💎 Hoàn thành lượt học để nhận +1 kim cương · Mỗi phần/bài chỉ thưởng một lần mỗi ngày.';
 async function begin(){
  if(!enabled)return null;if(session)return session;if(starting)return starting;
  starting=api('/api/v1/experience/study-sessions',{method:'POST',keepalive:true,body:{activity,source_id:sourceId,unit:String(unit)}}).then(({data})=>{if(!data?.id)throw Error('Chưa lưu được lượt học.');session=data;required=data.required;return data;}).finally(()=>{starting=null;});return starting;
 }
 function flush(){
  if(!enabled||saving||!pending.size)return saving;let failed=false;
  saving=(async()=>{let retried=false;while(pending.size){
   const batch=[...pending.values()].slice(0,5),started=await begin();
   try{await api('/api/v1/experience/study-sessions/'+started.id+'/progress',{method:'POST',keepalive:true,body:{items:batch,...(extra.duration?{duration:extra.duration}:{})}});}
   catch(error){if(error.code==='STUDY_SESSION_EXPIRED'&&!retried){retried=true;session=null;continue;}throw error;}
   for(const row of batch)if(pending.get(row.id)===row)pending.delete(row.id);progressLine.replaceChildren();
   window.dispatchEvent(new CustomEvent('ttnava:study-progress',{detail:{sourceId,activity}}));
  }})().catch(error=>{failed=true;progressLine.replaceChildren(el('span',{text:' Chưa lưu được tiến độ: '+error.message+' '}),el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Thử lưu tiến độ',onclick:flush}));}).finally(()=>{saving=null;if(!failed&&pending.size)flush();});return saving;
 }
 function track(id,answer){if(!enabled)return;pending.set(String(id),{id:String(id),...(answer===undefined?{}:{answer:String(answer)})});return flush();}
 async function finish(){
  if(!enabled||receipt)return receipt;if(finishing)return finishing;
  finishing=(async()=>{
   try{const started=await begin();if(!started)return;const body={...extra,...(items.size?{items:[...items.values()]}:{}),...(actions.size?{actions:[...actions]}:{})};
    const {data}=await api('/api/v1/experience/study-sessions/'+started.id+'/finish',{method:'POST',body});receipt=data.reward;rewardLine.textContent=rewardText(receipt);window.dispatchEvent(new CustomEvent('ttnava:study-progress',{detail:{sourceId,activity}}));await syncDiamondTotal();return receipt;
   }catch(error){rewardLine.replaceChildren(el('span',{text:error.message+' '}),el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Thử lưu thưởng',onclick:()=>finish()}));}
  })().finally(()=>{finishing=null;});return finishing;
 }
 function item(id,answer){if(!enabled)return;track(id,answer);if(receipt)return;items.set(String(id),{id:String(id),...(answer===undefined?{}:{answer:String(answer)})});begin().catch(()=>{});if(items.size>=required)finish();else rewardLine.textContent=`💎 Đã học ${items.size}/${required} mục · Hoàn thành để nhận +1 kim cương.`;}
 function action(key){if(!enabled||receipt)return;actions.add(String(key).slice(0,150));begin().catch(()=>{});if(actions.size>=required)finish();}
 window.addEventListener('pagehide',flush,{once:true});
 return {node,begin:()=>begin().catch(()=>null),item,track,action,finish,evidence(value){extra=value;},get awarded(){return receipt;}};
}
