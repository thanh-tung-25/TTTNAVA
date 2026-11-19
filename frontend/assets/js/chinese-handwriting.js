import {el} from './api.js';

// The canvas collects pen strokes only in memory. No upload or analytics calls.
export function createChineseHandwriting(onSelect,onClear=()=>{},{characters=()=>[]}={}){
 let strokes=[],current=null,pointer=null,worker=null,loaded=false,timer,timeout,version=0,paused=false,near=false;
 const node=el('section',{class:'dictionary-handwriting','aria-label':'Viết tay để tra chữ'});
 const canvas=el('canvas',{class:'handwriting-canvas',width:768,height:768,tabindex:0,'aria-label':'Ô viết một chữ Hán bằng ngón tay, bút hoặc chuột'}),ctx=canvas.getContext('2d');
 const status=el('p',{class:'handwriting-status',role:'status','aria-live':'polite',text:'Viết một chữ vào ô bên dưới.'});
 const candidates=el('div',{class:'handwriting-candidates','aria-label':'Chọn chữ giống nét bạn viết'});
 const count=el('span',{class:'handwriting-count',text:'0 nét'});
 const undo=el('button',{type:'button',class:'handwriting-tool',text:'↶ Hoàn tác'});
 const clear=el('button',{type:'button',class:'handwriting-tool',text:'Xóa ô viết'});
 const recognize=el('button',{type:'button',class:'handwriting-recognize',text:'Nhận dạng'});
 const another=el('button',{type:'button',class:'handwriting-new',text:'Tra từ khác',onclick:()=>{reset();onClear();canvas.focus({preventScroll:true});}});
 node.append(el('div',{class:'handwriting-heading'},[el('div',{},[el('strong',{text:'Viết 1 chữ bạn nhớ'}),el('p',{text:'Chọn chữ gợi ý, rồi viết tiếp để ghép thành từ.'})]),el('div',{class:'handwriting-heading-actions'},[count,another])]),el('div',{class:'handwriting-pad'},[canvas]),el('div',{class:'handwriting-tools'},[undo,clear,recognize]),status,candidates,el('p',{class:'handwriting-note',text:'Nhận dạng ngay trên thiết bị của bạn.'}));
 function invalidate(){clearTimeout(timer);clearTimeout(timeout);version++;near=false;status.classList.remove('is-selection');candidates.replaceChildren();}
 function controls(){count.textContent=strokes.length+' nét';undo.disabled=clear.disabled=!strokes.length&&!current;recognize.disabled=!strokes.length||Boolean(current);}
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
 function fail(){clearTimeout(timeout);worker?.terminate();worker=null;loaded=false;status.textContent='Chưa mở được bộ nhận dạng. Bấm Nhận dạng để thử lại.';}
 function start(){
  if(worker||paused)return;
  if(!window.Worker){status.textContent='Trình duyệt chưa hỗ trợ viết tay. Bạn vẫn có thể nhập chữ, pinyin hoặc tiếng Việt để tra.';return;}
  try{
   const instance=new Worker('/assets/js/chinese-handwriting-worker.js?v=20261119-stroke-evidence',{type:'module'});worker=instance;
   instance.onerror=instance.onmessageerror=()=>{if(worker===instance)fail();};
   instance.onmessage=({data})=>{
    if(worker!==instance||paused)return;
    if(data.type==='ready'){loaded=true;if(!strokes.length&&!current)status.textContent='Sẵn sàng. Viết một chữ vào ô để nhận gợi ý.';return;}
    if(data.type==='error'&&data.id===-1){fail();return;}
    if(data.id!==version||paused)return;
    clearTimeout(timeout);
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
  }catch{fail();}
 }
 function lookup(){
  if(paused||current||!strokes.length)return;
  start();if(!worker)return;
  clearTimeout(timeout);const id=++version;
  status.textContent=loaded?'Đang nhận dạng chữ…':'Đang mở bộ nhận dạng trên thiết bị…';
  worker.postMessage({type:'recognize',id,strokes,characters:characters(),near,evidence:true});
  timeout=setTimeout(()=>{if(id===version)fail();},15000);
 }
 function schedule(){clearTimeout(timer);if(strokes.length)timer=setTimeout(lookup,350);else status.textContent='Viết một chữ để nhận gợi ý.';}
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
 undo.onclick=()=>{invalidate();release();strokes.pop();paint();schedule();};clear.onclick=reset;recognize.onclick=lookup;
 canvas.addEventListener('keydown',event=>{if(event.key==='Escape')return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undo.click();}});
 paint();
 return {node,resume(){paused=false;start();if(strokes.length)schedule();},pause(){paused=true;invalidate();release();worker?.terminate();worker=null;loaded=false;paint();},focus(){canvas.focus({preventScroll:true});}};
}
