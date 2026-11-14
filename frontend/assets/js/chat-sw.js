// Push only: deliberately no fetch handler and no caching of private pages or APIs.
self.addEventListener('push',event=>{
 let payload;try{payload=event.data?.json();}catch{return;}
 if(payload?.type!=='incoming-call'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(payload.call_id||''))return;
 event.waitUntil(self.registration.showNotification('TTNAVA',{
  body:'Bạn có cuộc gọi đến. Mở TTNAVA để xem và trả lời.',icon:'/assets/icons/icon-192.png',badge:'/assets/icons/icon-192.png',
  tag:'ttnava-incoming-call',renotify:true,data:{call_id:payload.call_id},
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const callId=event.notification.data?.call_id;
 if(!/^[a-f0-9-]{36}$/i.test(callId||''))return;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(c=>new URL(c.url).origin===self.location.origin);
  if(existing){await existing.focus();existing.postMessage({type:'incoming-call',call_id:callId});return;}
  await self.clients.openWindow('/?incoming_call='+encodeURIComponent(callId));
 })());
});
