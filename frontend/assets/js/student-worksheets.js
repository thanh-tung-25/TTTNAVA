import {api,el,formatDate} from './api.js';
import {initPage} from './ui-core.js';
import {renderItem,resultBlock} from './worksheet-player.js';
import {animalPath} from './animal-path.js';
const base='/api/v1/worksheets',root=document.querySelector('#ws-content'),notice=document.querySelector('#ws-notice');
let current,index=0,timer,queue=Promise.resolve(),profile;
const button=(text,fn,ghost=false)=>el('button',{type:'button',class:'btn'+(ghost?' btn-ghost':''),text,onclick:async event=>{const b=event.currentTarget;b.disabled=true;try{await fn();}catch(e){notice.textContent=e.message;}finally{b.disabled=false;}}});
function schedule(){clearTimeout(timer);timer=setTimeout(()=>save().catch(e=>notice.textContent=e.message),700);}
function save(){
 clearTimeout(timer);timer=null;if(!current||current.status!=='in_progress')return queue;
 const id=current.id,answers=structuredClone(current.answers);
 queue=queue.catch(()=>{}).then(()=>api(base+'/attempts/'+id,{method:'PUT',body:{answers}}));return queue;
}
async function catalog(){
 current=null;clearTimeout(timer);notice.textContent='';
 history.replaceState(null,'',location.pathname);
 const [catalog,historyData]=await Promise.all([api(base),api(base+'/history')]);
 const grid=el('div',{class:'worksheet-student-grid'});
 function draw(){grid.replaceChildren();for(const sheet of catalog.data.filter(s=>(!semester.value||s.semester===semester.value)&&(!topic.value||s.chapter_id===topic.value)))grid.append(el('article',{class:'card'},[el('img',{src:'/assets/images/mascot-owl.svg',alt:'',width:70,height:76}),el('h2',{text:sheet.title}),...(sheet.lesson_name?[el('p',{class:'muted',text:(sheet.semester==='hk1'?'Học kì 1':'Học kì 2')+' · '+sheet.chapter_name+' · '+sheet.lesson_name})]:[]),el('p',{class:'muted',text:sheet.item_count+' câu · '+({toan:'Toán','tieng-viet':'Tiếng Việt','tieng-anh':'Tiếng Anh'}[sheet.subject_id])}),button(sheet.active_attempt?'Tiếp tục':'Bắt đầu',()=>open(sheet.id,sheet.active_attempt))]));
 if(!grid.children.length)grid.append(el('section',{class:'card'},[el('h2',{text:'Cô giáo đang chuẩn bị bài'}),el('p',{text:'Khi bài tập được đăng cho lớp của con, bài sẽ xuất hiện ở đây.'})]));
 animalPath(grid,{selector:':scope > article',title:'Luyện bài tập',hint:'Chọn bộ bài phù hợp với nội dung đã học. Bài đang làm có thể tiếp tục.'});
 }
 const semester=el('select',{class:'select','aria-label':'Học kì'},[el('option',{value:'',text:'Cả năm học'}),el('option',{value:'hk1',text:'Học kì 1'}),el('option',{value:'hk2',text:'Học kì 2'})]);
 const topic=el('select',{class:'select','aria-label':'Chủ đề'});
 function topics(){const selected=topic.value;topic.replaceChildren(el('option',{value:'',text:'Tất cả chủ đề'}));const chapters=new Map(catalog.data.filter(s=>s.chapter_id&&(!semester.value||s.semester===semester.value)).map(s=>[s.chapter_id,s.chapter_name]));for(const [value,text]of chapters)topic.append(el('option',{value,text}));if(chapters.has(selected))topic.value=selected;draw();}
 semester.onchange=topics;topic.onchange=draw;topics();
 root.replaceChildren(el('div',{class:'worksheet-toolbar'},[semester,topic]),grid);
 const attempts=historyData.data.filter(a=>a.grade===profile.grade);
 if(attempts.length)root.append(el('section',{class:'card',style:'margin-top:28px'},[el('h2',{text:'Bài làm của con'}),...attempts.map(a=>el('div',{class:'worksheet-history-row'},[el('div',{},[el('strong',{text:a.title}),el('p',{text:formatDate(a.started_at)+' · '+(a.status==='pending_review'?'Chờ giáo viên chấm':a.status==='in_progress'?'Chưa nộp':a.score+'/100')})]),button(a.status==='in_progress'?'Tiếp tục':'Xem bài',()=>open(null,a.id),true)]))]));
}
async function open(sheetId,attemptId){
 notice.textContent='';current=(await api(attemptId?base+'/attempts/'+attemptId:base+'/'+sheetId+'/start',{method:attemptId?'GET':'POST'})).data;index=0;
 history.replaceState(null,'','?attempt='+current.id);render();
}
function render(){
 const item=current.items[index],finished=current.status!=='in_progress';
 const heading=el('div',{class:'card'},[el('h2',{text:current.title}),el('p',{class:'muted',text:'Câu '+(index+1)+' / '+current.items.length}),el('progress',{class:'worksheet-progress',max:current.items.length,value:index+1,'aria-label':'Tiến độ bài tập'})]);
 if(finished)heading.append(el('p',{class:'worksheet-score',text:current.status==='pending_review'?'Chờ giáo viên chấm':current.score+'/100'}));
 const question=renderItem({...item,subjectId:current.subject_id||current.subjectId},current.answers[item.id],value=>{if(finished)return;current.answers[item.id]=value;schedule();});
 if(finished){question.querySelectorAll('input,textarea,select,button:not(.question-audio button)').forEach(e=>e.disabled=true);question.querySelectorAll('canvas').forEach(e=>e.style.pointerEvents='none');}
 const card=el('section',{class:'card'},[question]);const result=current.results?.find(r=>r.id===item.id);if(result)card.append(resultBlock(result));
 const back=button('← Câu trước',async()=>{await save();index--;render();},true);back.disabled=index===0;
 const controls=el('div',{class:'worksheet-footer'},[back]);
 if(index<current.items.length-1)controls.append(button('Câu tiếp theo →',async()=>{await save();index++;render();}));
 else if(!finished)controls.append(button('Nộp bài',async()=>{
  if(!confirm('Nộp bài để xem kết quả? Câu chưa làm sẽ được tính là chưa đúng.'))return;
  await save();current=(await api(base+'/attempts/'+current.id+'/submit',{method:'POST',body:{answers:current.answers}})).data;render();
 }));
 controls.append(button('Danh sách bài',async()=>{await save();await catalog();},true));
 root.replaceChildren(heading,card,controls);
}
initPage('student','worksheets').then(async user=>{
 profile=user;if(user.course?.kind!=='primary'){root.replaceChildren(el('div',{class:'worksheet-locked'},[el('p',{text:'Chọn một khóa Tiểu học để làm bài tập này nhé.'}),el('a',{class:'btn',href:'/pages/student/courses/?program=primary',text:'Chọn khóa Tiểu học'})]));return;}
 document.querySelector('#ws-grade').textContent='Bài tập của khóa Lớp '+user.grade+' · Bài làm được tự động lưu.';
 const id=new URLSearchParams(location.search).get('attempt');if(id)await open(null,id);else await catalog();
}).catch(e=>{notice.textContent=e.message;root.replaceChildren();});
window.addEventListener('beforeunload',e=>{if(timer&&current?.status==='in_progress'){e.preventDefault();e.returnValue='';}});
