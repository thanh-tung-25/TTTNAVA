// Both the bubble and window can be moved; positions belong to this browser/user.
export function movableChat(bubble,panel,handle,userId){
 const key='ttnava-chat-position:'+userId;let saved={};
 try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
 const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const viewport=()=>({w:window.visualViewport?.width||innerWidth,h:window.visualViewport?.height||innerHeight});
 const clamp=(node,p)=>{const {w,h}=viewport(),bottom=node===bubble&&w<1100?94:8;return {x:Math.max(8,Math.min(p.x,w-node.offsetWidth-8)),y:Math.max(8,Math.min(p.y,h-node.offsetHeight-bottom))};};
 const place=(node,p)=>{const next=clamp(node,p);Object.assign(node.style,{left:next.x+'px',top:next.y+'px',right:'auto',bottom:'auto'});return next;};
 function save(){try{localStorage.setItem(key,JSON.stringify(saved));}catch{}}
 function fit(){
  const {w,h}=viewport();saved.bubble=place(bubble,valid(saved.bubble)?saved.bubble:{x:w-80,y:h-(w<640?154:80)});
  if(!panel.hidden){const b=bubble.getBoundingClientRect();saved.panel=place(panel,valid(saved.panel)?saved.panel:{x:b.right-panel.offsetWidth,y:b.top>panel.offsetHeight+12?b.top-panel.offsetHeight-12:b.bottom+12});}
 }
 function drag(grip,node,name){
  let start=null,suppressUntil=0;
  grip.addEventListener('pointerdown',e=>{
   if(node===bubble&&getComputedStyle(bubble).position==='static')return;
   if(e.button!==0||(grip!==bubble&&e.target.closest('button,details,input,textarea,a')))return;
   suppressUntil=0;
   const r=node.getBoundingClientRect();start={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};
   grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointermove',e=>{
   if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;
   if(!start.moved&&Math.hypot(dx,dy)<6)return;start.moved=true;grip.classList.add('chat-dragging');
   saved[name]=place(node,{x:start.left+dx,y:start.top+dy});
  });
  const end=e=>{if(!start||e.pointerId!==start.id)return;if(start.moved){suppressUntil=Date.now()+400;save();}start=null;grip.classList.remove('chat-dragging');};
  grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  grip.addEventListener('click',e=>{if(e.detail>0&&Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 }
 drag(bubble,bubble,'bubble');drag(handle,panel,'panel');
 const resize=()=>{fit();};window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);fit();
 return {opened:fit,reset:()=>{saved={};fit();save();}};
}
