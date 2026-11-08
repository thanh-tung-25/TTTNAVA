import {api,el,avatarUrl} from './api.js';
import {movableChat} from './chat-position.js';
const paths={chat:'M7 18l-3 3v-6a8 8 0 1 1 3 3Z',back:'m14 6-6 6 6 6',close:'M6 12h12',send:'m3 3 18 9-18 9 4-9-4-9Zm4 9h14',more:'M5 12h.01M12 12h.01M19 12h.01',people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',plus:'M12 5v14M5 12h14'};
const icon=name=>el('span',{class:'chat-icon','aria-hidden':'true',html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.chat}"/></svg>`});
const call=async(path='',method='GET',body)=>(await api('/api/v1/chat'+path,{method,body})).data;
export function setupChat(profile){
 if(document.getElementById('chat-widget'))return;
 const admin=profile.role==='admin';
 const css=el('link',{rel:'stylesheet',href:'/assets/css/chat.css'});document.head.append(css);
 const toggle=el('button',{type:'button',class:'chat-launcher','aria-label':admin?'Báo cáo trò chuyện':'Mở trò chuyện','aria-expanded':'false',title:'Trò chuyện · Kéo để di chuyển'},[icon('chat'),el('span',{class:'chat-badge',hidden:true})]);
 const panel=el('section',{class:'chat-panel',hidden:true,role:'dialog','aria-label':admin?'Quản lý báo cáo trò chuyện':'Trò chuyện học tập'}),heading=el('strong'),subtitle=el('small',{text:'Góc nhỏ cùng học'}),headerAvatar=el('img',{class:'chat-avatar',src:'/assets/images/mascot-panda.svg',alt:''}),body=el('div',{class:'chat-body'}),notice=el('p',{class:'chat-notice',role:'status','aria-live':'polite'});
 const btn=(text,fn,cls='')=>el('button',{type:'button',class:'chat-button '+cls,text,onclick:async()=>{try{await fn();}catch(e){notice.textContent=e.message;}}});
 const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();};
 const iconButton=(label,kind,fn)=>{const b=btn('',fn,'chat-icon-button');b.setAttribute('aria-label',label);b.title=label;b.append(icon(kind));return b;};
 const tools=el('details',{class:'chat-tools'},[el('summary',{'aria-label':'Tùy chọn trò chuyện',title:'Tùy chọn'},[icon('more')])]),toolItems=el('div',{class:'chat-menu'});tools.append(toolItems);
 const back=iconButton('← Danh sách','back',()=>list());
 const header=el('header',{class:'chat-header',title:'Kéo thanh này để di chuyển khung trò chuyện'},[back,el('div',{class:'chat-identity'},[headerAvatar,el('div',{},[heading,subtitle])]),tools,iconButton('Đóng','close',close)]);
 panel.append(header,notice,body);
 const widget=el('div',{id:'chat-widget'},[toggle,panel]);document.body.append(widget);
 const position=movableChat(toggle,panel,header,profile.id);
 let rooms=[],room=null,mode='list',messages=[],hasMore=false,polling=false,readable=true,stopped=false;
 const drafts=new Map();let input,thread,sendButton,sending=false,pending=null;
 const roomTitle=r=>r.kind==='group'?r.title:r.peer?.display_name||'Bạn học';
 const avatar=u=>el('img',{class:'chat-avatar',src:avatarUrl(u?.avatar_key||u?.avatarKey),alt:'',loading:'lazy'});
 function headerMode(detail=false){back.hidden=!detail;headerAvatar.src=detail&&room?.kind==='direct'?avatarUrl(room.peer?.avatar_key):'/assets/images/mascot-panda.svg';subtitle.textContent=detail?(room?.kind==='group'?room.members.length+' bạn cùng học':'Cùng nhau tiến bộ'):'Góc nhỏ cùng học';tools.open=false;toolItems.replaceChildren(btn('Đưa khung về vị trí mặc định',()=>position.reset()));}
 const badge=toggle.querySelector('.chat-badge');
 const run=async fn=>{try{await fn();}catch(e){notice.textContent=e.message;}};
 async function fetchRooms(){rooms=await call('/rooms');const total=rooms.reduce((s,r)=>s+r.unread,0);badge.hidden=!total;badge.textContent=total>99?'99+':String(total);}
 function list(){mode='list';room=null;heading.textContent='Trò chuyện';headerMode();toolItems.prepend(btn('Người đã chặn',blocked));
  const direct=btn('Nhắn riêng',()=>compose(false),'chat-new');direct.prepend(icon('plus'));const group=btn('Tạo nhóm học',()=>compose(true),'chat-new');group.prepend(icon('people'));
  body.replaceChildren(el('div',{class:'chat-actions chat-start'},[direct,group]));
  const rows=el('div',{class:'chat-rooms'});for(const r of rooms){const b=btn('',()=>openRoom(r.id),'chat-room');b.setAttribute('aria-label',roomTitle(r)+(r.unread?' · '+r.unread+' tin mới':''));b.append(r.kind==='group'?el('span',{class:'chat-group-avatar'},[icon('people')]):avatar(r.peer),el('span',{class:'chat-room-copy'},[el('strong',{text:roomTitle(r)}),el('small',{text:r.blocked?'Đã tạm dừng trò chuyện':r.kind==='group'?r.members.length+' thành viên':'Nhắn một lời chào nhé'})]),...(r.unread?[el('span',{class:'chat-count',text:String(r.unread)})]:[]));rows.append(b);}
  if(!rooms.length)rows.append(el('div',{class:'chat-empty'},[el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:100,height:100}),el('strong',{text:'Cùng học vui hơn!'}),el('p',{text:'Tìm một người bạn để bắt đầu trò chuyện.'})]));body.append(rows);
 }
 async function openRoom(id){
  if(input&&room)drafts.set(room.id,input.value);await fetchRooms();room=rooms.find(r=>r.id===id);if(!room){list();return;}
  mode='room';messages=[];notice.textContent='';heading.textContent=roomTitle(room);headerMode(true);
  toolItems.prepend(...(room.kind==='group'?[btn('Thành viên',members)]:[btn(room.blocked?'Thông tin chặn':'Chặn bạn này',async()=>{if(room.blocked){await blocked();return;}if(!confirm('Chặn bạn này? Hai người sẽ không thể nhắn riêng cho nhau.'))return;await call('/blocks/'+room.peer.id,'PUT');await openRoom(id);})]));body.replaceChildren();
  thread=el('div',{class:'chat-thread','aria-label':'Tin nhắn',role:'log','aria-live':'off'});
  input=el('textarea',{class:'chat-input',rows:1,maxlength:2000,placeholder:'Viết lời nhắn…','aria-label':'Tin nhắn'});input.value=drafts.get(id)||'';
  input.oninput=()=>drafts.set(id,input.value);
  input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();void run(send);}};
  sendButton=iconButton('Gửi','send',send);sendButton.classList.add('chat-send');input.disabled=sendButton.disabled=room.blocked;
  body.append(thread,el('form',{class:'chat-composer',onsubmit:e=>e.preventDefault()},[input,sendButton]));
  await refreshMessages(true,id);
 }
 function paintMessages(scroll=false){
  if(!thread||mode!=='room')return;
  const nearBottom=thread.scrollHeight-thread.scrollTop-thread.clientHeight<70,oldHeight=thread.scrollHeight,oldTop=thread.scrollTop;
  const nodes=[];if(hasMore)nodes.push(btn('Tin nhắn trước đó',older));
  for(const m of messages){
   const own=m.sender_id===profile.id,actions=[];
   if(!m.hidden)actions.push(own?btn('Gỡ',async()=>{if(!confirm('Gỡ tin nhắn này?'))return;await call('/messages/'+m.id,'DELETE');await refreshMessages();}):btn('Báo cáo',async()=>{const reason=prompt('Vì sao con báo cáo tin nhắn này?');if(!reason?.trim())return;await call('/messages/'+m.id+'/report','POST',{reason:reason.trim()});notice.textContent='Đã gửi báo cáo cho quản trị viên.';}));
   const menu=el('details',{class:'chat-message-menu'},[el('summary',{'aria-label':'Tùy chọn tin nhắn'},[icon('more')]),el('div',{class:'chat-menu'},actions)]);
   nodes.push(el('article',{class:'chat-message'+(own?' own':'')},[...(!own?[avatar(m)]:[]),el('div',{class:'chat-bubble'},[...(!own?[el('strong',{text:m.display_name})]:[]),el('p',{text:m.body}),el('footer',{},[el('time',{text:new Date(m.created_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}),...(actions.length?[menu]:[])])])]));
  }
  if(!messages.length)nodes.push(el('p',{class:'chat-empty',text:'Bắt đầu bằng một lời chào nhé!'}));
  thread.replaceChildren(...nodes);
  if(scroll||nearBottom)thread.scrollTop=thread.scrollHeight;else thread.scrollTop=oldTop+Math.max(0,thread.scrollHeight-oldHeight);
  readable=scroll||nearBottom;
 }
 async function refreshMessages(scroll=false,id=room?.id){
  if(!id)return;const data=await call('/rooms/'+id+'/messages');if(mode!=='room'||room?.id!==id)return;
  const old=messages,latest=new Map(data.items.map(m=>[m.id,m]));messages=[...old.filter(m=>!latest.has(m.id)&&data.has_more),...data.items];if(old.length<=data.items.length)hasMore=data.has_more;
  // A block removes all previously loaded content from that peer on next room open.
  if(scroll||JSON.stringify(old)!==JSON.stringify(messages))paintMessages(scroll);else if(thread)readable=thread.scrollHeight-thread.scrollTop-thread.clientHeight<70;
  if(readable&&!panel.hidden&&!document.hidden)await call('/rooms/'+id+'/read','PUT');
 }
 async function older(){const id=room.id,before=messages[0]?.id;if(!before)return;const data=await call('/rooms/'+id+'/messages?before='+before);if(room?.id!==id||mode!=='room')return;messages=[...data.items,...messages];hasMore=data.has_more;paintMessages();}
 async function send(){
  if(sending||mode!=='room'||room.blocked||!input.value.trim())return;
  const id=room.id,text=input.value.trim();if(!pending||pending.room!==id||pending.text!==text)pending={room:id,text,client_id:crypto.randomUUID()};
  sending=true;sendButton.disabled=true;
  try{await call('/rooms/'+id+'/messages','POST',{text,client_id:pending.client_id});pending=null;drafts.delete(id);if(room?.id===id&&mode==='room'){input.value='';await refreshMessages(true,id);}await fetchRooms();}
  finally{sending=false;if(sendButton)sendButton.disabled=!!room?.blocked;}
 }
 async function compose(group,adding=false){
  const current=adding?room:null;mode='compose';headerMode();back.hidden=false;heading.textContent=adding?'Thêm thành viên':group?'Tạo nhóm học':'Nhắn riêng';
  const name=el('input',{class:'chat-input',placeholder:'Tên nhóm học','aria-label':'Tên nhóm',maxlength:100}),search=el('input',{class:'chat-input',placeholder:'Tên hoặc tên đăng nhập (ít nhất 2 ký tự)','aria-label':'Tìm bạn',maxlength:60}),results=el('div'),selected=new Map(),selection=el('p',{class:'chat-tip'});
  const form=el('form',{class:'chat-search'},[search,el('button',{type:'submit',class:'chat-button',text:'Tìm bạn'})]);let searchVersion=0;
  form.onsubmit=async e=>{e.preventDefault();const version=++searchVersion;await run(async()=>{const found=await call('/students?q='+encodeURIComponent(search.value.trim()));if(version!==searchVersion||mode!=='compose')return;results.replaceChildren(...found.filter(u=>!current?.members.some(m=>m.id===u.id)).map(u=>btn(u.display_name+' (@'+u.username+')',async()=>{
   if(!group){const created=await call('/rooms','POST',{kind:'direct',members:[u.id]});await openRoom(created.id);return;}
   if(selected.has(u.id))selected.delete(u.id);else selected.set(u.id,u);selection.textContent='Đã chọn: '+[...selected.values()].map(p=>p.display_name).join(', ');
  })) );results.querySelectorAll('button').forEach((b,index)=>{const u=found.filter(u=>!current?.members.some(m=>m.id===u.id))[index];b.classList.add('chat-search-person');b.prepend(avatar(u));});if(!results.children.length)results.append(el('p',{text:'Không tìm thấy bạn phù hợp.'}));});};
  body.replaceChildren(btn('← Quay lại',()=>current?openRoom(current.id):list()),...(group&&!adding?[name]:[]),form,selection,results);
  if(group)body.append(btn(adding?'Thêm vào nhóm':'Tạo nhóm',async()=>{
   if(!selected.size)throw Error('Chọn ít nhất một bạn.');
   if(adding){for(const id of selected.keys())await call('/rooms/'+current.id+'/members','PUT',{action:'add',student_id:id});await openRoom(current.id);}
   else{const created=await call('/rooms','POST',{kind:'group',title:name.value.trim(),members:[...selected.keys()]});await openRoom(created.id);}
  }));search.focus();
 }
 async function members(){mode='members';tools.open=false;heading.textContent='Thành viên nhóm';const r=room;
  body.replaceChildren(btn('← Tin nhắn',()=>openRoom(r.id)),el('p',{text:r.title+' · '+r.members.length+'/20 người'}));
  for(const u of r.members)body.append(el('div',{class:'chat-member'},[avatar(u),el('span',{text:u.display_name+(u.id===r.owner_id?' · Trưởng nhóm':'')}),...(r.owner_id===profile.id&&u.id!==profile.id?[btn('Bỏ khỏi nhóm',async()=>{if(!confirm('Bỏ bạn này khỏi nhóm?'))return;await call('/rooms/'+r.id+'/members','PUT',{action:'remove',student_id:u.id});await fetchRooms();room=rooms.find(x=>x.id===r.id);await members();})]:[])]));
  if(r.owner_id===profile.id)body.append(btn('Thêm bạn',()=>compose(true,true)),btn('Đổi tên nhóm',async()=>{const title=prompt('Tên nhóm mới',r.title);if(!title?.trim())return;await call('/rooms/'+r.id+'/members','PUT',{action:'rename',title});await openRoom(r.id);}));
  body.append(btn('Rời nhóm',async()=>{if(!confirm('Rời nhóm học này? Nếu con là trưởng nhóm, quyền trưởng nhóm sẽ chuyển cho một thành viên còn lại.'))return;await call('/rooms/'+r.id+'/members','PUT',{action:'leave'});await fetchRooms();list();}));
 }
 async function blocked(){mode='blocks';heading.textContent='Người đã chặn';const rows=await call('/blocks');body.replaceChildren(btn('← Danh sách',list),...rows.map(u=>el('div',{class:'chat-member'},[el('span',{text:u.display_name}),btn('Bỏ chặn',async()=>{await call('/blocks/'+u.id,'DELETE');await blocked();})])));if(!rows.length)body.append(el('p',{text:'Con chưa chặn ai.'}));}
 async function reports(){heading.textContent='Báo cáo trò chuyện';const rows=await call('/reports');badge.hidden=!rows.length;badge.textContent=String(rows.length);body.replaceChildren(...rows.map(r=>el('article',{class:'chat-report'},[el('strong',{text:r.sender+' · báo cáo bởi '+r.reporter}),el('p',{text:r.body}),el('p',{text:'Lý do: '+r.reason}),el('div',{class:'chat-actions'},[btn('Gỡ tin và xử lý',async()=>{await call('/reports/'+r.id,'PUT',{action:'hide'});await reports();}),btn('Đánh dấu đã xử lý',async()=>{await call('/reports/'+r.id,'PUT',{action:'resolve'});await reports();})])])));if(!rows.length)body.append(el('p',{text:'Không có báo cáo đang chờ.'}));}
 toggle.onclick=()=>run(async()=>{if(!panel.hidden){close();return;}panel.hidden=false;position.opened();toggle.setAttribute('aria-expanded','true');notice.textContent='';if(admin){headerMode();await reports();}else{await fetchRooms();if(mode==='room'&&room)await openRoom(room.id);else list();}panel.querySelector('button:not([hidden])')?.focus();});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
 async function poll(){if(stopped||document.hidden||polling)return;polling=true;try{if(admin){if(!panel.hidden)await reports();}else{await fetchRooms();if(!panel.hidden){if(mode==='list')list();else if(mode==='room'&&room){const fresh=rooms.find(r=>r.id===room.id);if(!fresh){list();return;}if(fresh.blocked!==room.blocked){await openRoom(fresh.id);return;}room=fresh;await refreshMessages();}}}}catch(e){if(!panel.hidden)notice.textContent='Chưa cập nhật được trò chuyện. Hệ thống sẽ thử lại.';}finally{polling=false;}}
 let idleTicks=0;const timer=setInterval(()=>{if(panel.hidden&&++idleTicks%3!==0)return;void poll();},4000);window.addEventListener('pagehide',()=>{stopped=true;clearInterval(timer);});void poll();
}
