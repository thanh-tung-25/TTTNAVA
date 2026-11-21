import {api,el} from './api.js';

// Read markers contain report IDs and versions only, never reply text.
export function createFeedbackInbox(profile,trigger,onChange=()=>{}){
 const key='ttnava-feedback-seen:'+profile.id;let seen={},rows=[],pending=false,lastLoad=0;
 const read=()=>{try{const value=JSON.parse(localStorage.getItem(key)||'{}');seen=value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{seen={};}};read();
 const version=row=>row.reply_version||String(row.updated_at||row.created_at)+':'+row.reply.length;
 const badge=el('span',{class:'feedback-reply-badge','aria-hidden':'true',hidden:true});trigger.append(badge);
 const unread=()=>rows.filter(row=>row.reply?.trim()&&seen[row.id]!==version(row));
 function update(){const count=unread().length;badge.hidden=!count;badge.textContent=count>9?'9+':String(count);trigger.dataset.hasReply=String(count>0);trigger.title=count?'Có '+count+' phản hồi mới từ quản trị viên':'Góp ý / Báo lỗi';trigger.setAttribute('aria-label',trigger.title);}
 async function load(force=false){
  if(pending)return pending;if(!force&&Date.now()-lastLoad<15000)return rows;
  pending=(async()=>{const {data}=await api('/api/v1/feedback',{cache:'no-store'});rows=Array.isArray(data)?data:[];lastLoad=Date.now();update();onChange(rows);return rows;})().finally(()=>{pending=false;});return pending;
 }
 function markRead(visible){for(const row of visible)if(row.reply?.trim())seen[row.id]=version(row);try{localStorage.setItem(key,JSON.stringify(seen));}catch{}update();}
 const refresh=()=>{if(document.visibilityState!=='hidden')load().catch(()=>{});},storage=event=>{if(event.key===key){read();update();}};
 const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',refresh);
 window.addEventListener('pagehide',()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',refresh);},{once:true});
 refresh();return {load,markRead,get hasNew(){return unread().length>0;}};
}
