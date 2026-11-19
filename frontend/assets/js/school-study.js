import {api,el} from './api.js';
import {subjectsFor,semesterName} from './primary-subjects.js';
import {studyKnowledge,studyExamples} from './school-study-guide.js';
import {schoolQuizPlayer} from './school-study-quiz.js';
export async function mountSchoolStudy(profile){
 const root=document.querySelector('#school-study'),notice=document.querySelector('#learning-notice'),params=new URLSearchParams(location.search),{data}=await api('/api/v1/school-study/catalog');
 const guides=new Map(),rows=new Map(),subjects=subjectsFor(profile),saved=localStorage.getItem('ttnava-school-subject:'+profile.course.id);
 let subject=params.get('subject')||saved||subjects[0][0],search='',semester='';if(!subjects.some(([id])=>id===subject))subject=subjects[0][0];
 document.body.dataset.program=profile.course.kind;document.title=(params.get('view')==='quiz'?'Quiz':'Bài học')+' · '+profile.course.title+' — TTNAVA';
 const heading=el('header',{class:'school-coursebar'},[el('div',{},[el('span',{class:'school-eyebrow',text:'KHÓA ĐANG HỌC'}),el('h1',{text:profile.course.title})]),el('a',{class:'btn btn-ghost',href:'/pages/student/courses/?switch=1',text:'Đổi khóa'})]);
 const tabs=el('nav',{class:'school-subjects','aria-label':'Môn học'}),hero=el('section',{class:'school-study-hero'}),filters=el('div',{class:'school-study-filters'}),list=el('div',{class:'school-lesson-list'});
 const query=el('input',{class:'input',type:'search',placeholder:'Tìm tên bài học…','aria-label':'Tìm bài học'}),semesterPicker=el('select',{class:'select','aria-label':'Lọc học kì'});
 filters.append(query,semesterPicker);root.replaceChildren(heading,tabs,hero,filters,list,extras());notice.textContent='';notice.hidden=true;
 function sync(){const url=new URL(location.href);url.searchParams.set('subject',subject);history.replaceState(null,'',url);localStorage.setItem('ttnava-school-subject:'+profile.course.id,subject);}
 async function content(group){if(!guides.has(group.id)){const {data:guide}=await api('/api/v1/school-study/guides/'+encodeURIComponent(group.id));guides.set(group.id,guide.content);}return guides.get(group.id);}
 async function start(group,stage,panel){
  panel.replaceChildren(el('p',{role:'status',text:'Đang mở Quiz 20 câu…'}));
  try{const {data:quiz}=await api('/api/v1/school-study/groups/'+encodeURIComponent(group.id)+'/quiz',{method:'POST',body:{stage}});group.open={id:quiz.id,stage_index:stage};const url=new URL(location.href);url.searchParams.set('group',group.id);url.searchParams.set('quiz',quiz.id);url.searchParams.set('panel','quiz');history.replaceState(null,'',url);play(group,quiz,panel);}catch(error){panel.replaceChildren(el('p',{role:'alert',text:error.message}),el('button',{class:'btn btn-ghost',type:'button',text:'Về các chặng quiz',onclick:()=>quizStages(group,panel)}));}
 }
 function play(group,quiz,panel){
  panel.replaceChildren(schoolQuizPlayer(quiz,{onExit:()=>{const url=new URL(location.href);url.searchParams.delete('quiz');history.replaceState(null,'',url);quizStages(group,panel);},onComplete:()=>{if(!group.completedStages.includes(quiz.stage))group.completedStages.push(quiz.stage);group.open=null;const summary=rows.get(group.id)?.querySelector('.school-lesson-summary');if(summary)summary.textContent=summaryText(group);},...(quiz.stage<group.stages?{onNext:()=>start(group,quiz.stage+1,panel)}:{})}));
 }
 function quizStages(group,panel){
  panel.replaceChildren(el('h3',{text:'Quiz 20 câu theo bài'}),el('p',{text:'Ngân hàng '+group.questionCount+' câu · Mỗi lượt 20 câu không trùng nhau.'}));
  if(group.questionCount<20){panel.append(el('p',{text:'Bài đang được bổ sung đủ 20 câu. Bạn có thể học kiến thức và ví dụ trước.'}));return;}
  if(group.open){const resume=el('button',{class:'btn btn-primary',type:'button',text:'Tiếp tục quiz đang làm'});resume.onclick=async()=>{resume.disabled=true;try{const {data:quiz}=await api('/api/v1/school-study/quizzes/'+encodeURIComponent(group.open.id));play(group,quiz,panel);}catch(error){panel.append(el('p',{role:'alert',text:error.message}));resume.disabled=false;}};panel.append(resume);}
  const stages=el('div',{class:'school-quiz-stages'});for(let stage=1;stage<=group.stages;stage++){const completed=group.completedStages.includes(stage),button=el('button',{class:'school-stage'+(completed?' is-complete':''),type:'button'},[el('strong',{text:'Chặng '+stage}),el('span',{text:completed?'Đã hoàn thành · Làm lại':'20 câu'})]);button.onclick=()=>start(group,stage,panel);stages.append(button);}panel.append(stages);
 }
 const summaryText=group=>'Ngân hàng '+group.questionCount+' câu'+(group.completedStages.length?' · '+group.completedStages.length+'/'+group.stages+' chặng hoàn thành':group.legacyCompleted?' · Đã luyện '+group.legacyCompleted+' lượt':group.skillAttempts?' · Đã luyện '+group.skillAttempts+' câu':'');
 function lesson(group,index){
  const row=el('section',{class:'school-lesson-row','data-tone':['purple','peach','mint'][index%3],id:'school-'+group.id}),panel=el('div',{class:'school-lesson-panel',hidden:true}),bar=el('div',{class:'school-lesson-actions'}),controls=[];
  row.append(el('header',{class:'school-lesson-heading'},[el('div',{},[el('span',{class:'school-lesson-chapter',text:group.title===group.chapterName?semesterName(group.semester):group.chapterName}),el('h2',{text:group.title})]),el('img',{src:'/assets/images/mascot-'+['panda','bunny','lion'][index%3]+'.svg',width:60,height:64,alt:'',loading:'lazy'})]),el('p',{class:'school-lesson-summary',text:summaryText(group)}),bar,panel);
  for(const [key,title,icon]of [['knowledge','Cần nhớ / công thức','▤'],['examples','Ví dụ hướng dẫn','✎'],['quiz','Quiz 20 câu','★']]){
   const button=el('button',{type:'button',class:'school-main-action','aria-expanded':'false'},[el('span',{'aria-hidden':'true',text:icon}),el('span',{text:title})]);
   const open=async(force=false)=>{
    if(!force&&button.getAttribute('aria-expanded')==='true'){button.setAttribute('aria-expanded','false');panel.hidden=true;return;}
    controls.forEach(item=>item.setAttribute('aria-expanded',String(item===button)));panel.hidden=false;panel.dataset.kind=key;
    const url=new URL(location.href);url.searchParams.set('group',group.id);url.searchParams.set('panel',key);url.searchParams.delete('quiz');history.replaceState(null,'',url);
    if(key==='quiz'){quizStages(group,panel);return;}
    panel.replaceChildren(el('p',{role:'status',text:'Đang mở nội dung bài…'}));
    try{const guide=await content(group);if(button.getAttribute('aria-expanded')==='true')panel.replaceChildren(key==='knowledge'?studyKnowledge(guide):studyExamples(guide));}catch(error){panel.replaceChildren(el('p',{role:'alert',text:error.message}));}
   };
   button.onclick=()=>open();button.dataset.panel=key;controls.push(button);bar.append(button);button.openPanel=open;
  }
  rows.set(group.id,row);return row;
 }
 function draw(){
  rows.clear();const selected=subjects.find(([id])=>id===subject),all=data.groups.filter(group=>group.subjectId===subject),normalized=search.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const visible=all.filter(group=>(!semester||group.semester===semester)&&(!search||(group.title+' '+group.chapterName).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(normalized)));
  tabs.replaceChildren(...subjects.map(([id,name,icon])=>el('button',{class:'school-subject',type:'button','aria-pressed':String(id===subject),onclick:()=>{subject=id;semester='';search='';query.value='';sync();draw();}},[el('span',{'aria-hidden':'true',text:icon}),el('span',{text:name})])));
  hero.replaceChildren(el('div',{},[el('span',{class:'school-eyebrow',text:params.get('view')==='quiz'?'QUIZ THEO BÀI':'HỌC GỌN · HIỂU RÕ · LUYỆN ĐỀU'}),el('h2',{text:selected[1]+' · '+profile.course.title}),el('p',{text:all.length+' bài học · Chọn một bài rồi mở phần muốn học.'})]),el('img',{src:'/assets/images/mascot-panda.svg',width:112,height:120,alt:''}));
  semesterPicker.replaceChildren(el('option',{value:'',text:'Tất cả bài học'}),...['hk1','hk2','year'].filter(id=>all.some(group=>group.semester===id)).map(id=>el('option',{value:id,text:semesterName(id)})));semesterPicker.value=semester;
  list.replaceChildren(...visible.map(lesson));if(!visible.length)list.append(el('div',{class:'school-empty',text:search?'Chưa có bài khớp tên bạn tìm.':'Nội dung môn này đang được bổ sung.'}));
 }
 query.oninput=()=>{search=query.value;draw();};semesterPicker.onchange=()=>{semester=semesterPicker.value;draw();};sync();draw();
 const focus=params.get('group')||params.get('lesson')||params.get('topic'),selectedGroup=data.groups.find(group=>group.id===focus||group.parts.some(part=>part.id===focus||part.topicId===focus));
 if(selectedGroup){if(selectedGroup.subjectId!==subject){subject=selectedGroup.subjectId;sync();draw();}const row=rows.get(selectedGroup.id),key=params.get('panel')||'knowledge',button=row?.querySelector('[data-panel='+(['knowledge','examples','quiz'].includes(key)?key:'knowledge')+']');await button?.openPanel(true);if(params.get('quiz'))try{const {data:quiz}=await api('/api/v1/school-study/quizzes/'+encodeURIComponent(params.get('quiz')));if(quiz.groupId===selectedGroup.id)play(selectedGroup,quiz,row.querySelector('.school-lesson-panel'));}catch(error){notice.textContent=error.message;notice.hidden=false;}}
 function extras(){return el('details',{class:'school-extras'},[el('summary',{text:'Bài kiểm tra và tiện ích khác'}),el('nav',{},[['Thi thử tổng hợp','/pages/student/exam/?formal=1'],['Bài được giao','/pages/student/assignments/'],['Bài tập tương tác','/pages/student/worksheets/'],['Tiến bộ học tập','/pages/student/progress/'],['Sổ câu sai','/pages/student/study-hub/?view=wrong'],['Báo cáo học tập','/pages/student/family/']].map(([text,href])=>el('a',{class:'btn btn-ghost',href,text})))]);}
}
