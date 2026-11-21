import {api,el,formatDate} from './api.js';
import {initPage} from './ui-core.js';
import {renderItem,resultBlock} from './worksheet-player.js';
import {animalPath} from './animal-path.js';
import {subjectsFor,subjectName,semesterName} from './primary-subjects.js';
import {rewardNotice} from './study-reward.js';
import {syncSchoolNavigationSubject} from './school-navigation-subject.js';
const base='/api/v1/worksheets',root=document.querySelector('#ws-content'),notice=document.querySelector('#ws-notice');
let current,index=0,timer,queue=Promise.resolve(),profile,examTimer,submitting=false;
const button=(text,fn,ghost=false)=>el('button',{type:'button',class:'btn'+(ghost?' btn-ghost':''),text,onclick:async event=>{const b=event.currentTarget;b.disabled=true;try{await fn();}catch(e){notice.textContent=e.message;}finally{b.disabled=false;}}});
function schedule(){clearTimeout(timer);timer=setTimeout(()=>save().catch(e=>notice.textContent=e.message),700);}
function save(){
 clearTimeout(timer);timer=null;if(!current||current.status!=='in_progress')return queue;
 const id=current.id,answers=structuredClone(current.answers);
 queue=queue.catch(()=>{}).then(()=>api(base+'/attempts/'+id,{method:'PUT',body:{answers}}));return queue;
}
async function catalog(){
 current=null;clearTimeout(timer);clearInterval(examTimer);notice.textContent='';root.classList.remove('worksheet-exam-player');
 history.replaceState(null,'',location.pathname);
 const [catalog,historyData]=await Promise.all([api(base),api(base+'/history')]);
 const grid=el('div',{class:'worksheet-student-grid'});
 const subject=['secondary','highschool'].includes(profile.course?.kind)?el('select',{id:'worksheet-subject',class:'select','aria-label':'Môn học'},[el('option',{value:'',text:'Tất cả môn học'}),...subjectsFor(profile).map(([value,text])=>el('option',{value,text}))]):null;
 function draw(){grid.replaceChildren();for(const sheet of catalog.data.filter(s=>(!semester.value||s.semester===semester.value)&&(!subject?.value||s.subject_id===subject.value)&&(!topic.value||s.chapter_id===topic.value)))grid.append(el('article',{class:'card'},[el('img',{src:'/assets/images/mascot-lion.svg',alt:'',width:70,height:76}),el('h2',{text:sheet.title}),...(sheet.lesson_name?[el('p',{class:'muted',text:semesterName(sheet.semester)+' · '+sheet.chapter_name+' · '+sheet.lesson_name})]:[]),el('p',{class:'muted',text:sheet.item_count+' câu · '+subjectName(sheet.subject_id,profile)}),button(sheet.active_attempt?'Tiếp tục':'Bắt đầu',()=>open(sheet.id,sheet.active_attempt))]));
 if(!grid.children.length)grid.append(el('section',{class:'card'},[el('h2',{text:'Cô giáo đang chuẩn bị bài'}),el('p',{text:'Khi bài tập được đăng cho lớp của con, bài sẽ xuất hiện ở đây.'})]));
 animalPath(grid,{selector:':scope > article',title:'Luyện bài tập',hint:'Chọn bộ bài phù hợp với nội dung đã học. Bài đang làm có thể tiếp tục.'});
 }
 const semester=el('select',{class:'select','aria-label':'Học kì'},[el('option',{value:'',text:'Cả năm học'}),el('option',{value:'hk1',text:'Học kì 1'}),el('option',{value:'hk2',text:'Học kì 2'}),...(profile.grade>=10?[el('option',{value:'year',text:'Cả năm'})]:[])]);
 const topic=el('select',{class:'select','aria-label':'Chủ đề'});
 function topics(){const selected=topic.value;topic.replaceChildren(el('option',{value:'',text:'Tất cả chủ đề'}));const chapters=new Map(catalog.data.filter(s=>s.chapter_id&&(!semester.value||s.semester===semester.value)&&(!subject?.value||s.subject_id===subject.value)).map(s=>[s.chapter_id,s.chapter_name]));for(const [value,text]of chapters)topic.append(el('option',{value,text}));if(chapters.has(selected))topic.value=selected;draw();}
 semester.onchange=topics;topic.onchange=draw;if(subject)subject.onchange=topics;topics();
 root.replaceChildren(el('div',{class:'worksheet-toolbar'},[...(subject?[subject]:[]),semester,topic]),grid);
 const attempts=historyData.data.filter(a=>a.grade===profile.grade);
 if(attempts.length)root.append(el('section',{class:'card',style:'margin-top:28px'},[el('h2',{text:'Bài làm của con'}),...attempts.map(a=>el('div',{class:'worksheet-history-row'},[el('div',{},[el('strong',{text:a.title}),el('p',{text:formatDate(a.started_at)+' · '+(a.status==='pending_review'?'Chờ giáo viên chấm':a.status==='in_progress'?'Chưa nộp':a.score+'/100')})]),button(a.status==='in_progress'?'Tiếp tục':'Xem bài',()=>open(null,a.id),true)]))]));
}
async function open(sheetId,attemptId){
 notice.textContent='';current=(await api(attemptId?base+'/attempts/'+attemptId:base+'/'+sheetId+'/start',{method:attemptId?'GET':'POST'})).data;index=0;
 if(current.exam_config)syncSchoolNavigationSubject(current.subject_id||current.subjectId,profile);
 history.replaceState(null,'','?attempt='+current.id+(current.exam_config?'&exam=1':''));render();startExamClock();
}
async function submitCurrent(automatic=false){
 if(submitting||!current||current.status!=='in_progress')return;
 if(!automatic&&!confirm('Nộp bài để xem kết quả? Câu chưa làm sẽ được tính là chưa đúng.'))return;
 submitting=true;
 try{await save();current=(await api(base+'/attempts/'+current.id+'/submit',{method:'POST',body:{answers:current.answers}})).data;clearInterval(examTimer);render();if(automatic)notice.textContent='Đã hết giờ. Bài làm đã được nộp và chấm.';}finally{submitting=false;}
}
function startExamClock(){
 clearInterval(examTimer);if(!current?.ends_at||current.status!=='in_progress')return;
 const tick=()=>{const seconds=Math.max(0,Math.ceil((new Date(current.ends_at)-Date.now())/1000)),node=root.querySelector('.worksheet-exam-clock');if(node)node.textContent='Còn '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');if(!seconds&&!submitting)submitCurrent(true).catch(error=>notice.textContent='Chưa xác nhận nộp bài: '+error.message);};tick();examTimer=setInterval(tick,1000);
}
function render(){
 const item=current.items[index],finished=current.status!=='in_progress';
 root.classList.toggle('worksheet-exam-player',Boolean(current.exam_config));
 const heading=el('div',{class:'card'},[el('h2',{text:current.title}),el('p',{class:'muted',text:'Câu '+(index+1)+' / '+current.items.length}),el('progress',{class:'worksheet-progress',max:current.items.length,value:index+1,'aria-label':'Tiến độ bài tập'})]);
 if(current.exam_config){heading.append(el('p',{class:'worksheet-exam-clock',role:'timer'}),...(current.exam_config.attribution?[el('p',{class:'muted',text:'Nguồn: '+current.exam_config.attribution})]:[]));if(!finished)heading.append(button('Nộp bài thi',()=>submitCurrent()));}
 if(current.exam_config&&current.items.some(item=>item.grading==='excluded'))heading.append(el('p',{class:'worksheet-source-note',text:'Đề gốc có câu cần kiểm tra lại. Các câu được ghi là tham khảo không tính điểm; tổng điểm các câu còn lại được quy về thang 10.'}));
 if(finished)heading.append(el('p',{class:'worksheet-score',text:current.status==='pending_review'?'Chờ giáo viên chấm':current.exam_config?(current.score/10).toFixed(2)+' / 10':current.score+'/100'}));
 const question=renderItem({...item,subjectId:current.subject_id||current.subjectId},current.answers[item.id],value=>{if(finished)return;current.answers[item.id]=value;schedule();});
 if(finished){question.querySelectorAll('input,textarea,select,button:not(.question-audio button)').forEach(e=>e.disabled=true);question.querySelectorAll('canvas').forEach(e=>e.style.pointerEvents='none');}
 const card=el('section',{class:'card'},[question]);const result=current.results?.find(r=>r.id===item.id);if(result)card.append(resultBlock(result));
 const back=button('← Câu trước',async()=>{await save();index--;render();},true);back.disabled=index===0;
 const controls=el('div',{class:'worksheet-footer'},[back]);
 if(index<current.items.length-1)controls.append(button('Câu tiếp theo →',async()=>{await save();index++;render();}));
 else if(!finished)controls.append(button('Nộp bài',()=>submitCurrent()));
 if(current.exam_config){const palette=el('nav',{class:'worksheet-question-tabs','aria-label':'Danh sách câu của đề thi'});current.items.forEach((item,n)=>{const jump=button(String(n+1),async()=>{await save();index=n;render();},true);jump.setAttribute('aria-label','Câu '+(n+1));if(n===index)jump.setAttribute('aria-current','true');palette.append(jump);});heading.append(palette);}
 controls.append(button('Danh sách bài',async()=>{await save();await catalog();},true));
 root.replaceChildren(heading,card,controls);
 if(current.reward)root.append(rewardNotice(current.reward));
}
initPage('student',new URLSearchParams(location.search).has('exam')?'papers':'worksheets').then(async user=>{
 profile=user;if(!['primary','secondary','highschool'].includes(user.course?.kind)){root.replaceChildren(el('div',{class:'worksheet-locked'},[el('p',{text:'Chọn một khóa Tiểu học, THCS hoặc THPT để làm bài tập này nhé.'}),el('a',{class:'btn',href:'/pages/student/courses/',text:'Chọn khóa học'})]));return;}
 document.querySelector('#ws-grade').textContent='Bài tập của khóa Lớp '+user.grade+' · Bài làm được tự động lưu.';
 if(new URLSearchParams(location.search).has('exam')){document.querySelector('main h1').textContent='Bài thi của bạn';document.title='Bài thi — TTNAVA';document.querySelector('#ws-grade').textContent='Lớp '+user.grade+' · Tự động lưu và nộp khi hết giờ.';}
 const params=new URLSearchParams(location.search),id=params.get('attempt'),sheetId=params.get('sheet');if(id)await open(null,id);else if(sheetId){if(!confirm('Bắt đầu đề thi? Thời gian sẽ được tính ngay khi mở.'))return catalog();await open(sheetId);}else await catalog();
}).catch(e=>{notice.textContent=e.message;root.replaceChildren();});
window.addEventListener('beforeunload',e=>{if(timer&&current?.status==='in_progress'){e.preventDefault();e.returnValue='';}});
