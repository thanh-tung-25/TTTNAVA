import {el} from './api.js';

// The canvas collects pen strokes only in memory. No upload or analytics calls.
export function createChineseHandwriting(onSelect,onClear=()=>{},{characters=()=>[]}={}){
 let strokes=[],current=null,pointer=null,worker=null,loaded=false,timer,timeout,loadTimeout,version=0,paused=false,near=false,busyId=null,queued=null;
 const node=el('section',{class:'dictionary-handwriting','aria-label':'Viết tay để tra chữ'});
 const canvas=el('canvas',{class:'handwriting-canvas',width:768,height:768,tabindex:0,'aria-label':'Ô viết một chữ Hán bằng ngón tay, bút hoặc chuột'}),ctx=canvas.getContext('2d');
 const status=el('p',{class:'handwriting-status',role:'status','aria-live':'polite',text:'Viết một chữ vào ô bên dưới.'});
 const candidates=el('div',{class:'handwriting-candidates','aria-label':'Chọn chữ giống nét bạn viết'});
 const count=el('span',{class:'handwriting-count',text:'0 nét'});
 const undo=el('button',{type:'button',class:'handwriting-tool',text:'↶ Hoàn tác'});
 const clear=el('button',{type:'button',class:'handwriting-tool',text:'Xóa ô viết'});
 const retry=el('button',{type:'button',class:'handwriting-tool handwriting-retry',text:'Thử lại',hidden:true});
 const another=el('button',{type:'button',class:'handwriting-new',text:'Tra từ khác',onclick:()=>{reset();onClear();canvas.focus({preventScroll:true});}});
 node.append(el('div',{class:'handwriting-heading'},[el('div',{},[el('strong',{text:'Viết 1 chữ bạn nhớ'}),el('p',{text:'Nhấc bút để xem gợi ý. Chọn chữ rồi viết tiếp để ghép từ.'})]),el('div',{class:'handwriting-heading-actions'},[count,another])]),el('div',{class:'handwriting-pad'},[canvas]),el('div',{class:'handwriting-tools'},[undo,clear,retry]),status,candidates,el('p',{class:'handwriting-note',text:'Tự nhận trên thiết bị sau mỗi lần nhấc bút.'}));
 function invalidate(){clearTimeout(timer);version++;queued=null;near=false;retry.hidden=true;status.classList.remove('is-selection');candidates.replaceChildren();}
 function controls(){count.textContent=strokes.length+' nét';undo.disabled=clear.disabled=!strokes.length&&!current;retry.disabled=Boolean(current)||busyId!==null;}
 function paint(){
  ctx.setTransform(canvas.width/256,0,0,canvas.height/256,0,0);ctx.clearRect(0,0,256,256);
  ctx.strokeStyle='#e6dbea';ctx.lineWidth=.8;ctx.setLineDash([3,4]);
  ctx.beginPath();ctx.moveTo(128,0);ctx.lineTo(128,256);ctx.moveTo(0,128);ctx.lineTo(256,128);ctx.moveTo(0,0);ctx.lineTo(256,256);ctx.moveTo(256,0);ctx.lineTo(0,256);ctx.stroke();
  ctx.setLineDash([]);ctx.strokeStyle=ctx.fillStyle='#614277';ctx.lineWidth=4;ctx.lineCap=ctx.lineJoin='round';
  for(const stroke of [...strokes,...(current?[current]:[])]){
   if(stroke.length===1){ctx.beginPath();ctx.arc(stroke[0][0],stroke[0][1],2,0,Math.PI*2);ctx.fill();continue;}
   ctx.beginPath();ctx.moveTo(...stroke[0]);for(const point of stroke.slice(1))ctx.lineTo(...point);ctx.stroke();
  }
  controls();
 }
 function point(event){const box=canvas.getBoundingClientRect();return [Math.max(0,Math.min(256,(event.clientX-box.left)*256/box.width)),Math.max(0,Math.min(256,(event.clientY-box.top)*256/box.height))];}
 function release(){const id=pointer;pointer=null;current=null;if(id!=null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
 function reset(){invalidate();release();strokes=[];paint();status.textContent='Viết chữ tiếp theo để ghép thành từ, hoặc tra chữ khác.';}
 function stopWorker(){clearTimeout(timeout);clearTimeout(loadTimeout);worker?.terminate();worker=null;loaded=false;busyId=null;queued=null;}
 function fail(){
  const active=busyId===null||busyId===version;stopWorker();
  if(paused||current)return;
  if(!active){if(strokes.length)schedule();return;}
  status.textContent='Chưa nhận dạng được lúc này. Nét viết vẫn giữ nguyên; bạn bấm Thử lại nhé.';retry.hidden=false;controls();
 }
 function start(){
  if(worker||paused)return;
  if(!window.Worker){status.textContent='Trình duyệt chưa hỗ trợ viết tay. Bạn vẫn có thể nhập chữ, pinyin hoặc tiếng Việt để tra.';return;}
  try{
   const workerUrl=new URL('/assets/js/chinese-handwriting-worker.js',import.meta.url),release=new URL(import.meta.url).searchParams.get('release');
   workerUrl.searchParams.set('v','20261119-dtw');if(release)workerUrl.searchParams.set('release',release);
   const instance=new Worker(workerUrl,{type:'module'});worker=instance;
   instance.onerror=instance.onmessageerror=()=>{if(worker===instance)fail();};
   instance.onmessage=({data})=>{
    if(worker!==instance||paused)return;
    if(data.type==='ready'){clearTimeout(loadTimeout);loaded=true;retry.hidden=true;if(!strokes.length&&!current)status.textContent='Sẵn sàng. Viết một chữ vào ô để nhận gợi ý.';return;}
    if(data.type==='error'&&data.id===-1){fail();return;}
    if(data.id===busyId){
     clearTimeout(timeout);busyId=null;const next=queued;queued=null;
     if(next&&next.id===version&&!current)send(next);
    }
    if(data.id!==version||paused||current)return;
    if(data.type==='error'){fail();return;}
    loaded=true;
    const matches=[...new Map((data.matches||[]).map(match=>[match.hanzi,match])).values()];near=Boolean(data.near);
    const n=data.inputStrokes||strokes.length,neighborCounts=[n-1,n+1].filter(count=>count>0).join(' / ');
    status.textContent=matches.length?(near?'Các chữ lệch 1 nét so với '+n+' nét bạn viết:':'Gợi ý chữ có đúng '+n+' nét. Chọn chữ giống nét bạn viết:'):'Chưa tìm được chữ phù hợp với '+n+' nét. Bạn có thể xem nhóm lệch 1 nét.';
    const choice=match=>el('button',{type:'button',class:'handwriting-candidate',lang:'zh-CN','aria-label':'Chọn chữ '+match.hanzi+', '+match.strokes+' nét',onclick:()=>{const selected=onSelect(match.hanzi);reset();if(selected){status.textContent=selected;status.classList.add('is-selection');}canvas.focus({preventScroll:true});}},[el('span',{text:match.hanzi}),el('small',{lang:'vi',text:match.strokes+' nét'})]);
    const show=amount=>{
     candidates.replaceChildren(...matches.slice(0,amount).map(choice));
     if(matches.length>amount)candidates.append(el('button',{type:'button',class:'handwriting-more',text:'Xem thêm chữ '+(near?neighborCounts:n)+' nét',onclick:()=>show(matches.length)}));
     candidates.append(el('button',{type:'button',class:'handwriting-count-mode',text:near?'Quay lại chữ đúng '+n+' nét':'Thử nhóm '+neighborCounts+' nét',onclick:()=>{near=!near;lookup();}}));
    };show(8);
   };
   worker.postMessage({type:'init',id:-1});
   loadTimeout=setTimeout(()=>{if(worker===instance&&!loaded)fail();},15000);
  }catch{fail();}
 }
 function send(request){
  if(!worker||paused)return;
  busyId=request.id;retry.hidden=true;controls();
  try{worker.postMessage(request);}catch{fail();return;}
  timeout=setTimeout(()=>{if(busyId===request.id)fail();},15000);
 }
 function lookup(){
  if(paused||current||!strokes.length)return;
  clearTimeout(timer);
  start();if(!worker)return;
  const id=++version;retry.hidden=true;candidates.replaceChildren();
  status.textContent=loaded?'Đang nhận dạng chữ…':'Đang mở bộ nhận dạng trên thiết bị…';
  const request={type:'recognize',id,strokes:strokes.map(stroke=>stroke.map(point=>[...point])),characters:characters(),near,evidence:true};
  if(busyId!==null)queued=request;else send(request);
 }
 function schedule(){clearTimeout(timer);if(!paused&&strokes.length)timer=setTimeout(lookup,150);else if(!current)status.textContent='Viết một chữ để nhận gợi ý.';}
 canvas.addEventListener('pointerdown',event=>{
  if(paused||pointer!=null||!event.isPrimary||event.button!==0)return;
  if(strokes.length>=45){status.textContent='Ô viết đã đủ 45 nét. Hãy xóa ô và viết từng chữ nhé.';return;}
  event.preventDefault();invalidate();pointer=event.pointerId;current=[point(event)];canvas.setPointerCapture(pointer);status.textContent='Đang viết…';paint();
 });
 canvas.addEventListener('pointermove',event=>{
  if(event.pointerId!==pointer||!current)return;event.preventDefault();
  const combined=event.getCoalescedEvents?.();
  for(const item of combined?.length?combined:[event]){
   const next=point(item),previous=current[current.length-1];
   if(Math.hypot(next[0]-previous[0],next[1]-previous[1])>=.65){if(current.length>=400)current=current.filter((_point,index)=>index%2===0);current.push(next);}
  }
  paint();
 });
 canvas.addEventListener('pointerup',event=>{
  if(event.pointerId!==pointer||!current)return;event.preventDefault();
  const end=point(event);if(current.length<400&&Math.hypot(end[0]-current.at(-1)[0],end[1]-current.at(-1)[1])>.1)current.push(end);
  strokes.push(current);release();paint();schedule();
 });
 for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(event.pointerId===pointer){release();paint();schedule();}});
 undo.onclick=()=>{invalidate();release();strokes.pop();paint();schedule();};clear.onclick=reset;retry.onclick=()=>{retry.hidden=true;if(strokes.length)lookup();else{status.textContent='Đang mở bộ nhận dạng trên thiết bị…';start();}};
 canvas.addEventListener('keydown',event=>{if(event.key==='Escape')return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undo.click();}});
 paint();
 return {node,resume(){paused=false;start();if(strokes.length)schedule();},pause(){paused=true;invalidate();release();stopWorker();paint();},focus(){canvas.focus({preventScroll:true});}};
}
