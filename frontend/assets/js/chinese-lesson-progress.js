import {api,el} from './api.js';

let activeDialog;
const label=node=>node.available&&node.percent!==null?node.percent+'%':'Chưa mở';
function meter(node,className=''){
 return el('progress',{class:'chinese-progress-meter '+className,max:100,value:node.percent||0,'aria-label':node.title,'aria-valuetext':label(node)});
}
function modeRow(node){
 const row=el('div',{class:'chinese-progress-mode'+(node.available?'':' is-unavailable')},[
  el('div',{class:'chinese-progress-label'},[el('span',{text:node.title}),el('strong',{text:label(node)})]),
  ...(node.available?[meter(node)]:[]),
 ]);
 if(node.children?.some(child=>child.available)){
  row.append(el('div',{class:'chinese-progress-children'},node.children.map(child=>el('div',{class:'chinese-progress-child'},[
   el('span',{text:child.title}),el('span',{text:label(child)}),
  ]))));
 }
 return row;
}

export function openChineseLessonProgress({lesson,initial,trigger,onUpdate}){
 activeDialog?.close();
 const scrollY=window.scrollY,controller=new AbortController();let busy=false,closed=false;
 const close=el('button',{type:'button',class:'chinese-progress-close',text:'×','aria-label':'Đóng tiến độ'});
 const status=el('p',{class:'chinese-progress-sync',role:'status','aria-live':'polite'}),body=el('div',{class:'chinese-progress-content'});
 const dialog=el('dialog',{class:'chinese-progress-dialog','aria-labelledby':'chinese-progress-title'},[
  el('header',{class:'chinese-progress-header'},[
   el('img',{src:'/assets/images/mascot-panda.svg',width:50,height:56,alt:''}),
   el('div',{},[el('span',{class:'chinese-progress-eyebrow',text:'TIẾN ĐỘ BÀI HỌC'}),el('h2',{id:'chinese-progress-title',text:lesson.title})]),close,
  ]),body,status,
  el('footer',{class:'chinese-progress-footer',text:'Phần trăm thể hiện nội dung đã học, không phải điểm số. Học lại một mục không cộng trùng. Phần chưa mở không tính vào tiến độ chung.'}),
 ]);
 function render(model,confirmed=false){
  const overall={title:'Tiến độ chung của bài',available:model.percent!==null,percent:model.percent};
  body.replaceChildren(el('section',{class:'chinese-progress-overall'},[
   el('div',{},[el('span',{text:'Tiến độ chung'}),el('strong',{text:label(overall)})]),
   ...(overall.available?[meter(overall)]:[]),
  ]),...model.groups.map(group=>el('section',{class:'chinese-progress-group','data-group':group.id},[
   el('div',{class:'chinese-progress-group-heading'},[el('h3',{text:group.title}),el('strong',{text:label(group)})]),
   ...group.modes.map(modeRow),
   ...(group.id==='characters'&&group.available?[el('p',{class:'chinese-progress-hint',text:'Từ mới và thẻ lật dùng chung tiến độ từ vựng.'})]:[]),
  ])),...(model.olderContent?[el('p',{class:'chinese-progress-hint',text:'Bài học đã được cập nhật. Lịch sử học nội dung cũ vẫn được giữ.'})]:[]));
  status.textContent=confirmed?'Đã đồng bộ với tài khoản.':'Đang đồng bộ tiến độ…';
 }
 async function refresh(){
  if(closed||busy||document.visibilityState==='hidden')return;busy=true;
  if(!body.childElementCount)status.textContent='Đang đồng bộ tiến độ…';
  try{
   const {data}=await api('/api/v1/chinese/lessons/'+encodeURIComponent(lesson.id)+'/learning-progress',{cache:'no-store',signal:controller.signal});
   if(closed)return;render(data,true);onUpdate?.(data);
  }catch(error){
   if(closed||error.name==='AbortError')return;
   status.replaceChildren(el('span',{text:'Chưa đồng bộ được tiến độ mới. '}),el('button',{type:'button',class:'chinese-progress-retry',text:'Thử lại',onclick:refresh}));
  }finally{busy=false;}
 }
 const visibility=()=>{if(document.visibilityState==='visible')refresh();};
 close.onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{
  closed=true;controller.abort();clearInterval(poll);window.removeEventListener('focus',refresh);window.removeEventListener('ttnava:study-progress',refresh);document.removeEventListener('visibilitychange',visibility);
  document.body.classList.remove('chinese-progress-open');dialog.remove();if(activeDialog===dialog)activeDialog=null;trigger?.focus({preventScroll:true});
 },{once:true});
 document.body.append(dialog);document.body.classList.add('chinese-progress-open');activeDialog=dialog;
 if(initial)render(initial);dialog.showModal();window.scrollTo({top:scrollY,behavior:'instant'});
 window.addEventListener('focus',refresh);window.addEventListener('ttnava:study-progress',refresh);document.addEventListener('visibilitychange',visibility);
 const poll=setInterval(refresh,15000);refresh();
}

export function lessonProgressButton(lesson,catalog){
 const trigger=el('button',{type:'button',class:'chinese-lesson-progress-button','aria-haspopup':'dialog','aria-label':'Xem tiến độ '+lesson.title},[
  el('img',{class:'chinese-lesson-companion',src:'/assets/images/mascot-panda.svg',width:48,height:52,alt:'',loading:'lazy'}),el('span',{text:'Tiến độ'}),
 ]);
 trigger.onclick=()=>openChineseLessonProgress({lesson,trigger,initial:catalog.lesson_progress?.find(row=>row.lessonId===lesson.id),onUpdate:model=>{
  catalog.lesson_progress??=[];const index=catalog.lesson_progress.findIndex(row=>row.lessonId===model.lessonId);if(index<0)catalog.lesson_progress.push(model);else catalog.lesson_progress[index]=model;
 }});
 return trigger;
}
