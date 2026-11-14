import {api,el,avatarUrl} from './api.js';

const request=async(path='',method='GET',body)=>(await api('/api/v1/chat/calls'+path,{method,body})).data;
const paths={phone:'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z',video:'m23 7-7 5 7 5V7ZM1 5h15v14H1V5Z',mic:'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-7 8v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8',end:'M3 15c5-5 13-5 18 0v4h-5v-4M3 15v4h5v-4'};
function icon(kind){return el('span',{class:'chat-icon','aria-hidden':'true',html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[kind]||paths.phone}"/></svg>`});}
const outcomes={hangup:'Cuộc gọi đã kết thúc',declined:'Cuộc gọi đã bị từ chối',missed:'Chưa có người trả lời',failed:'Không kết nối được cuộc gọi',disconnected:'Cuộc gọi bị ngắt do mất kết nối',unavailable:'Cuộc gọi không còn khả dụng',limit:'Đã hết thời lượng cuộc gọi'};

export function setupChatCalls({notice}){
 const clientId=crypto.randomUUID(),controls=el('div',{class:'chat-call-shortcuts'});
 controls.hidden=true;
 let cfg={enabled:false},room=null,current=null,pc=null,local=null,remote=null,working=false,polling=false,closed=false,operation=0,lastSync=Date.now(),lastIncoming=0,ending=false;
 let dialog=null,ui=null,timer=null,previousFocus=null;
 let deviceId;try{deviceId=localStorage.getItem('ttnava-chat-device');if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem('ttnava-chat-device',deviceId);}}catch{deviceId=crypto.randomUUID();}
 const btn=(label,fn,cls='')=>el('button',{type:'button',class:'chat-call-button '+cls,text:label,onclick:()=>void act(fn)});
 async function act(fn){try{await fn();}catch(e){if(ui)ui.message.textContent=errorText(e);else notice(errorText(e));}}
 function errorText(e){return e.name==='NotAllowedError'?'Chưa có quyền camera/micro. Con cấp quyền trong cài đặt trình duyệt rồi thử lại nhé.':e.name==='NotFoundError'?'Không tìm thấy camera hoặc micro trên thiết bị này.':e.name==='NotReadableError'?'Camera hoặc micro đang được ứng dụng khác sử dụng.':e.message||'Chưa thực hiện được cuộc gọi.';}
 const ready=request('/config').then(data=>{cfg=data||{};renderControls();}).catch(()=>{});
 function renderControls(){
  controls.replaceChildren();controls.hidden=!cfg.enabled||!room||room.kind!=='direct'||room.blocked||room.can_message===false||room.friendship!=='friend';
  if(controls.hidden)return;
  for(const [media,label,kind] of [['audio','Gọi thoại','phone'],['video','Gọi video','video']]){
   const b=btn('',()=>start(room,media),'chat-icon-button');b.setAttribute('aria-label',label);b.title=label;b.append(icon(kind));b.disabled=!!current&&current.state!=='ended';controls.append(b);
  }
 }
 function stopMedia(){
  operation++;pc?.close();pc=null;
  local?.getTracks().forEach(t=>t.stop());remote?.getTracks().forEach(t=>t.stop());local=remote=null;
  if(ui){ui.local.srcObject=null;ui.remote.srcObject=null;ui.audio.srcObject=null;}
 }
 function closeDialog(){
  if(current&&current.state!=='ended')return;
  stopMedia();dialog?.close();dialog?.remove();dialog=null;ui=null;current=null;renderControls();previousFocus?.focus?.();
 }
 function show(row){
  current=row;previousFocus=document.activeElement;
   dialog=el('dialog',{class:'chat-call-dialog','aria-label':row.media==='video'?'Cuộc gọi video':'Cuộc gọi thoại'});
  const peerName=el('h2',{text:row.peer.display_name}),status=el('p',{class:'chat-call-status',role:'status','aria-live':'polite'}),message=el('p',{class:'chat-call-message',role:'alert'});
  const portrait=el('div',{class:'chat-call-portrait'},[el('img',{src:avatarUrl(row.peer.avatar_key),alt:''}),peerName]);
  const localVideo=el('video',{class:'chat-call-local',autoplay:'',playsinline:'','aria-label':'Camera của con'});localVideo.muted=true;
  const remoteVideo=el('video',{class:'chat-call-remote',autoplay:'',playsinline:'','aria-label':'Video của bạn'});
  const audio=el('audio',{autoplay:''});
  const stage=el('div',{class:'chat-call-stage'},[portrait,remoteVideo,localVideo]);
  const actions=el('div',{class:'chat-call-actions'}),sound=btn('Bật âm thanh cuộc gọi',async()=>{await (current.media==='video'?remoteVideo:audio).play();sound.hidden=true;},'chat-call-sound');sound.hidden=true;
  dialog.append(el('div',{class:'chat-call-top'},[el('span',{text:row.media==='video'?'Gọi video cùng bạn':'Gọi thoại cùng bạn'}),el('span',{class:'chat-call-private',text:'Không ghi âm / ghi hình'})]),stage,status,message,sound,actions,audio);
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(current.state==='ended')closeDialog();else void act(()=>hangup(current.caller||current.state==='accepted'?'hangup':'declined'));});
  document.body.append(dialog);dialog.showModal();ui={status,message,portrait,stage,local:localVideo,remote:remoteVideo,audio,actions,sound};
  remoteVideo.hidden=localVideo.hidden=true;paint();renderControls();
 }
 function paint(){
  if(!ui||!current)return;
  const incoming=current.state==='ringing'&&!current.caller;
  ui.status.textContent=current.state==='ended'?(outcomes[current.outcome]||'Cuộc gọi đã kết thúc'):incoming?'Bạn đang gọi đến…':current.state==='ringing'?'Đang gọi cho bạn…':pc?.connectionState==='connected'?'Đã kết nối':'Đang kết nối…';
  const buttons=[];
  if(incoming){buttons.push(btn('Từ chối',()=>hangup('declined'),'chat-call-decline'),btn('Nhận cuộc gọi',accept,'chat-call-accept'));}
  else if(current.state!=='ended'){
   const mic=btn('Tắt micro',()=>{if(!local)return;const enabled=!local.getAudioTracks()[0]?.enabled;local.getAudioTracks().forEach(t=>t.enabled=enabled);mic.textContent=enabled?'Tắt micro':'Bật micro';mic.setAttribute('aria-pressed',String(!enabled));});mic.prepend(icon('mic'));mic.disabled=!local;buttons.push(mic);
   if(current.media==='video'){
    const camera=btn('Tắt camera',()=>{if(!local)return;const enabled=!local.getVideoTracks()[0]?.enabled;local.getVideoTracks().forEach(t=>t.enabled=enabled);camera.textContent=enabled?'Tắt camera':'Bật camera';camera.setAttribute('aria-pressed',String(!enabled));});camera.prepend(icon('video'));camera.disabled=!local;buttons.push(camera);
   }
   const end=btn(current.state==='ringing'?'Hủy cuộc gọi':'Kết thúc',()=>hangup('hangup'),'chat-call-decline');end.prepend(icon('end'));buttons.push(end);
  }else{
   buttons.push(btn('Báo cáo cuộc gọi',async()=>{const reason=prompt('Vì sao con báo cáo cuộc gọi này?');if(!reason?.trim())return;await request('/'+current.id+'/report','POST',{reason:reason.trim()});ui.message.textContent='Đã gửi báo cáo cho quản trị viên.';}),btn('Đóng',closeDialog,'chat-call-accept'));
  }
  ui.actions.replaceChildren(...buttons);tick();
 }
 function tick(){
  if(!current||!ui||current.state==='ended')return;
  if(Date.now()>=new Date(current.deadline_at).getTime()||current.state==='ringing'&&Date.now()>=new Date(current.ring_until).getTime()){
   void act(()=>hangup(current.state==='ringing'&&!current.caller?'declined':'hangup'));return;
  }
  if(pc?.connectionState==='connected'){
   const seconds=Math.max(0,Math.floor((Date.now()-new Date(current.accepted_at).getTime())/1000)),left=Math.max(0,Math.ceil((new Date(current.deadline_at).getTime()-Date.now())/1000));
   ui.status.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · Còn ${Math.ceil(left/60)} phút`;
  }
 }
 async function media(token,video){
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Gọi thoại/video cần trình duyệt hỗ trợ và kết nối HTTPS.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:video?{width:{ideal:640,max:640},height:{ideal:480,max:480},frameRate:{ideal:15,max:20},facingMode:'user'}:false});
  if(token!==operation||!current||current.state==='ended'||closed){stream.getTracks().forEach(t=>t.stop());throw Error('Cuộc gọi đã kết thúc.');}
  local=stream;ui.local.srcObject=stream;ui.local.hidden=!video;await ui.local.play().catch(()=>{});return stream;
 }
 async function peer(row,token){
  const ice=await request('/'+row.id+'/credentials','POST',{client_id:clientId});
  if(token!==operation||current?.id!==row.id||current.state==='ended')throw Error('Cuộc gọi đã kết thúc.');
  const connection=new RTCPeerConnection({...ice,iceTransportPolicy:'relay',bundlePolicy:'max-bundle'});pc=connection;remote=new MediaStream();
  // Attach remote audio to exactly one element to avoid double playback/echo.
  if(row.media==='video')ui.remote.srcObject=remote;else ui.audio.srcObject=remote;
  for(const track of local.getTracks())connection.addTrack(track,local);
  connection.ontrack=e=>{
   if(pc!==connection||!ui)return;remote.addTrack(e.track);
   const target=row.media==='video'?ui.remote:ui.audio;
   if(e.track.kind==='video'){ui.remote.hidden=false;ui.portrait.hidden=true;}
   void target.play().then(()=>{if(ui)ui.sound.hidden=true;}).catch(()=>{if(ui)ui.sound.hidden=false;});
  };
  connection.onconnectionstatechange=()=>{
   if(pc!==connection)return;
   if(connection.connectionState==='failed')void act(()=>fail(Error('Kết nối bị gián đoạn. Con gọi lại nhé.')));
   else if(connection.connectionState==='connected'){paint();void tick();}
  };
  return connection;
 }
 async function gathered(connection){
  if(connection.iceGatheringState!=='complete')await new Promise((resolve,reject)=>{
   const done=()=>{clearTimeout(timeout);connection.removeEventListener('icegatheringstatechange',changed);resolve();};
   const changed=()=>{if(connection.iceGatheringState==='complete')done();};
   const timeout=setTimeout(()=>{connection.removeEventListener('icegatheringstatechange',changed);reject(Error('Chưa tìm được đường truyền cuộc gọi. Con thử lại nhé.'));},12000);
   connection.addEventListener('icegatheringstatechange',changed);
  });
  if(!connection.localDescription?.sdp.includes(' typ relay'))throw Error('Chưa kết nối được dịch vụ chuyển tiếp cuộc gọi.');
  return connection.localDescription.sdp;
 }
 async function start(target,kind){
  await ready;if(working||current&&current.state!=='ended')throw Error('Con đang có một cuộc gọi khác.');
  if(current)closeDialog();working=true;
  try{
   const row=await request('','POST',{room_id:target.id,client_id:clientId,media:kind});show(row);lastSync=Date.now();
   const token=++operation;await media(token,kind==='video');const connection=await peer(row,token);paint();
   await connection.setLocalDescription(await connection.createOffer());const sdp=await gathered(connection);
   if(pc!==connection||current?.state==='ended')return;
   await request('/'+row.id+'/signal','PUT',{client_id:clientId,type:'offer',sdp});
  }catch(e){if(current&&current.state!=='ended')await fail(e);else throw e;}
  finally{working=false;}
 }
 async function accept(){
  if(working||current?.state!=='ringing'||current.caller)return;working=true;
  const row=current,token=++operation;
  try{
   // Permission is requested only after this explicit acceptance gesture.
   await media(token,row.media==='video');
   const accepted=await request('/'+row.id+'/accept','PUT',{client_id:clientId});
   if(token!==operation||current?.state==='ended'){
    await request('/'+row.id+'/end','POST',{client_id:clientId,reason:'hangup'}).catch(()=>{});return;
   }
   current=accepted;
   const connection=await peer(current,token);paint();
   await connection.setRemoteDescription({type:'offer',sdp:current.offer_sdp});
   await connection.setLocalDescription(await connection.createAnswer());const sdp=await gathered(connection);
   if(pc!==connection||current?.state==='ended')return;
   await request('/'+row.id+'/signal','PUT',{client_id:clientId,type:'answer',sdp});lastSync=Date.now();
  }catch(e){await fail(e);}
  finally{working=false;}
 }
 async function fail(error){
  const text=errorText(error);await hangup('failed').catch(()=>{});if(ui)ui.message.textContent=text;else notice(text);
 }
 async function hangup(reason){
  if(!current||current.state==='ended'||ending)return;ending=true;
  const row=current,unclaimed=!row.caller&&row.state==='ringing';stopMedia();
  current={...row,state:'ended',outcome:reason};paint();renderControls();
  try{await request('/'+row.id+'/end','POST',{client_id:clientId,reason:unclaimed?'declined':reason});}
  finally{ending=false;}
 }
 async function sync(){
  if(closed||!cfg.enabled||polling)return;polling=true;
  try{
   if(current&&current.state!=='ended'){
    const id=current.id,row=await request('/'+id+'/poll','POST',{client_id:clientId});lastSync=Date.now();
    if(current?.id!==id||current.state==='ended')return;
    if(current.state==='accepted'&&row.state==='ringing')return;
    if(row.claimed===false&&(row.caller||row.state==='accepted')){stopMedia();current={...row,state:'ended',outcome:'unavailable'};paint();return;}
    const oldState=current.state;current=row;
    if(row.state==='ended'){stopMedia();paint();renderControls();}
    else if(row.caller&&row.answer_sdp&&pc&&!pc.remoteDescription){await pc.setRemoteDescription({type:'answer',sdp:row.answer_sdp});}
    if(oldState!==row.state)paint();
   }else if(!document.hidden&&(!dialog||!dialog.open)&&Date.now()-lastIncoming>=4000){
    lastIncoming=Date.now();const row=await request('/incoming');
    if(row&&!current&&!working)show(row);
   }
  }catch(e){
   if(current&&current.state!=='ended'&&(e.status===401||e.status===403||e.status===404||e.code==='CALLS_DISABLED'||Date.now()-lastSync>20000))await fail(e);
  }finally{polling=false;}
 }
 function cleanup(){
  closed=true;clearInterval(timer);
  const row=current;stopMedia();
  if(row&&row.state!=='ended')void fetch('/api/v1/chat/calls/'+row.id+'/end',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:clientId,reason:!row.caller&&row.state==='ringing'?'declined':'hangup'})}).catch(()=>{});
 }
 window.addEventListener('pagehide',cleanup);window.addEventListener('ttnava:logout',cleanup);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});
 navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='incoming-call'){lastIncoming=0;void sync();}});
 timer=setInterval(()=>{tick();void sync();},1500);void ready.then(()=>sync());

 async function notificationSettings(){
  if(!cfg.push_enabled)throw Error('Thông báo ngoài website chưa được bật. Con vẫn nhận cuộc gọi khi đang mở TTNAVA.');
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Trình duyệt này chưa hỗ trợ thông báo. Trên iPhone, thêm TTNAVA vào Màn hình chính rồi mở lại.');
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('Chưa được cấp quyền thông báo. Con có thể bật lại trong cài đặt trình duyệt.');
  const registration=await navigator.serviceWorker.register('/chat-sw.js',{scope:'/'});await navigator.serviceWorker.ready;
  const existing=await registration.pushManager.getSubscription();
  const raw=atob(cfg.push_public_key.replaceAll('-','+').replaceAll('_','/')),key=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const sub=existing||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await request('/push','POST',{device_id:deviceId,subscription:sub.toJSON()});notice('Đã bật thông báo cuộc gọi trên thiết bị này.');
 }
 async function settings(){
  await ready;const box=el('section',{class:'chat-call-settings'},[el('strong',{text:'Cuộc gọi cùng bạn'})]);
  if(!cfg.enabled){box.append(el('p',{text:'Gọi thoại/video đang được chuẩn bị. Con vẫn có thể nhắn tin.'}));return box;}
  const toggle=btn(cfg.receiving?'Tắt nhận cuộc gọi':'Bật nhận cuộc gọi',async()=>{const data=await request('/preferences','PUT',{enabled:!cfg.receiving});cfg.receiving=data.receiving;toggle.textContent=cfg.receiving?'Tắt nhận cuộc gọi':'Bật nhận cuộc gọi';if(!cfg.receiving&&current&&!current.caller&&current.state!=='ended')await hangup('hangup');});
  box.append(el('p',{text:'Chỉ bạn bè đã được chấp nhận mới gọi được. Không ghi âm hoặc ghi hình.'}),toggle);
  if(cfg.push_enabled)box.append(btn('Bật thông báo cuộc gọi',notificationSettings),btn('Tắt thông báo trên thiết bị này',async()=>{
   await request('/push','DELETE',{device_id:deviceId});const reg=await navigator.serviceWorker?.getRegistration('/');const sub=await reg?.pushManager.getSubscription();await sub?.unsubscribe();notice('Đã tắt thông báo cuộc gọi trên thiết bị này.');
  }));
  return box;
 }
 async function history(roomId){
  const rows=await request('/history?room_id='+encodeURIComponent(roomId));
  const box=el('div',{class:'chat-call-history'});
  if(!rows.length)box.append(el('p',{text:'Chưa có cuộc gọi nào.'}));
  for(const row of rows)box.append(el('article',{},[el('strong',{text:(row.media==='video'?'Video':'Gọi thoại')+' · '+(row.caller?'Gọi đi':'Gọi đến')}),el('small',{text:new Date(row.created_at).toLocaleString('vi-VN')}),el('p',{text:outcomes[row.outcome]||'Đã kết thúc'}),btn('Báo cáo',async()=>{const reason=prompt('Vì sao con báo cáo cuộc gọi này?');if(reason?.trim()){await request('/'+row.id+'/report','POST',{reason:reason.trim()});notice('Đã gửi báo cáo cho quản trị viên.');}})]));
  return box;
 }
 async function moderation(){
  const rows=await request('/reports'),box=el('div');
  if(!rows.length)box.append(el('p',{text:'Không có báo cáo cuộc gọi đang chờ.'}));
  for(const row of rows)box.append(el('article',{class:'chat-report'},[el('strong',{text:row.caller+' → '+row.callee}),el('p',{text:'Báo cáo bởi '+row.reporter+': '+row.reason}),btn('Đã xử lý',async()=>{await request('/reports/'+row.id,'PUT',{});box.replaceWith(await moderation());})]));
  return box;
 }
 return {controls,setRoom:r=>{room=r;renderControls();},settings,history,moderation,enabled:()=>!!cfg.enabled};
}
