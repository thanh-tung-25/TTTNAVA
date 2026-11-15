import {api,el} from './api.js';
import {syncDiamondTotal} from './ui-core.js';

export function rewardText(reward){return reward?.earned>0?'💎 +'+reward.earned+' kim cương · Đã lưu vào tài khoản.':reward?.reason==='already_rewarded'?'Đã nhận thưởng phần này hôm nay.':reward?.reason==='daily_limit'?'Đã nhận đủ 20 kim cương tự luyện hôm nay.':'';}
export function rewardNotice(reward){const node=el('p',{class:'study-reward-status',role:'status',text:rewardText(reward)});if(reward&&reward.reason!=='preview')syncDiamondTotal();return node;}
export function studyReward({activity,sourceId,unit='all',required=10}){
 const enabled=document.body.dataset.role==='student'&&Boolean(sourceId),items=new Map(),actions=new Set();let session,starting,finishing,receipt,extra={};
 const node=el('div',{class:'study-reward-status',role:'status','aria-live':'polite'});
 if(enabled)node.textContent='💎 Hoàn thành lượt học để nhận +1 kim cương · Mỗi phần/bài chỉ thưởng một lần mỗi ngày.';
 async function begin(){
  if(!enabled)return null;if(session)return session;if(starting)return starting;
  starting=api('/api/v1/experience/study-sessions',{method:'POST',body:{activity,source_id:sourceId,unit:String(unit)}}).then(({data})=>{if(!data?.id)throw Error('Chưa lưu được lượt học.');session=data;required=data.required;return data;}).finally(()=>{starting=null;});return starting;
 }
 async function finish(){
  if(!enabled||receipt)return receipt;if(finishing)return finishing;
  finishing=(async()=>{
   try{const started=await begin();if(!started)return;const body={...extra,...(items.size?{items:[...items.values()]}:{}),...(actions.size?{actions:[...actions]}:{})};
    const {data}=await api('/api/v1/experience/study-sessions/'+started.id+'/finish',{method:'POST',body});receipt=data.reward;node.textContent=rewardText(receipt);await syncDiamondTotal();return receipt;
   }catch(error){node.replaceChildren(el('span',{text:error.message+' '}),el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Thử lưu thưởng',onclick:()=>finish()}));}
  })().finally(()=>{finishing=null;});return finishing;
 }
 function item(id,answer){if(!enabled||receipt)return;items.set(String(id),{id:String(id),...(answer===undefined?{}:{answer:String(answer)})});begin().catch(()=>{});if(items.size>=required)finish();else node.textContent=`💎 Đã học ${items.size}/${required} mục · Hoàn thành để nhận +1 kim cương.`;}
 function action(key){if(!enabled||receipt)return;actions.add(String(key).slice(0,150));begin().catch(()=>{});if(actions.size>=required)finish();}
 return {node,begin:()=>begin().catch(()=>null),item,action,finish,evidence(value){extra=value;},get awarded(){return receipt;}};
}
