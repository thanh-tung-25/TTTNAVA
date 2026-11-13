import {el,root,link,error,percentage} from './chinese-common.js';
import {modeCounts} from './chinese-learning-modes.js';

function action(label,fn){
 const button=el('button',{type:'button',class:'btn btn-secondary',text:label});
 button.onclick=async()=>{button.disabled=true;try{await fn();}catch(e){error(e);}finally{button.disabled=false;}};
 return button;
}
function unavailable(label,message){return el('button',{type:'button',class:'btn btn-secondary',text:label,disabled:true,title:message});}
function lessonSections(set,c,lesson,quiz){
 const exercises=[],characters=[],speaking=[];
 if(c.quiz>=20)exercises.push(action('Quiz 20 câu',()=>quiz(set.id)));
 else if(c.quiz)exercises.push(unavailable('Quiz 20 câu','Quiz cần ít nhất 20 câu. Nội dung đang được bổ sung.'));
 if(c.words)exercises.push(link('Luyện nghe',{set:set.id,mode:'listen'}));
 if(c.apply)exercises.push(link('Luyện vận dụng',{set:set.id,mode:'apply'}));
 if(c.read)exercises.push(link('Bài đọc',{set:set.id,mode:'read'}));
 if(c.cards)characters.push(link('Thẻ lật',{set:set.id,mode:'cards'}));
 if(c.words)characters.push(link('Từ mới',{set:set.id,mode:'words'}));
 if(c.speak||c.apply)speaking.push(link('Luyện nói theo bài',{set:set.id,mode:'speak'}));
 if(set.id){
  speaking.push(link('Giao tiếp với AI',{view:'ai-chat',level:lesson.level_id,lesson:lesson.id}));
  if(Number(lesson.level_id)===1)speaking.push(link('Phố tiếng Trung',{view:'street',level:lesson.level_id,lesson:lesson.id}));
 }
 const groups=[['exercises','Bài tập',exercises,'✎'],['characters','Nhận mặt chữ',characters,'字'],['speaking','Luyện nói với AI',speaking,'♬']];
 const host=el('div',{class:'chinese-lesson-sections'}),bar=el('div',{class:'chinese-lesson-primary','aria-label':'Ba phần học chính'}),controls=[];
 host.append(bar);
 for(const [key,label,children,icon]of groups){
  const id='lesson-section-'+(set.id||lesson.id)+'-'+key;
  const trigger=el('button',{type:'button',class:'btn btn-secondary',id:id+'-button','aria-expanded':'false','aria-controls':id,disabled:children.length?undefined:true,title:children.length?'Mở các chức năng '+label:'Nội dung đang được bổ sung.'},[el('span',{class:'chinese-group-icon','aria-hidden':'true',text:icon}),el('span',{text:label})]);
  const panel=el('nav',{id,class:'chinese-lesson-tools',hidden:true,'aria-label':'Chức năng con: '+label},children);
  trigger.onclick=()=>{
   const open=trigger.getAttribute('aria-expanded')!=='true';
   for(const control of controls){const selected=open&&control.trigger===trigger;control.trigger.setAttribute('aria-expanded',String(selected));control.panel.hidden=!selected;}
   if(open)host.dataset.section=key;else delete host.dataset.section;
  };
  controls.push({trigger,panel});bar.append(trigger);host.append(panel);
 }
 return host;
}
export function renderStudentChineseLessons({catalog,params,quiz}){
 const level=Number(params.get('level'))||1,lessons=catalog.lessons.filter(l=>Number(l.level_id)===level);
 root().append(el('header',{class:'chinese-section-heading chinese-course-hero'},[
  el('div',{class:'chinese-hero-copy'},[el('span',{class:'chinese-hero-eyebrow',text:'CÙNG GẤU TRÚC KHÁM PHÁ'}),el('h2',{text:'Bài học HSK '+level}),el('p',{text:lessons.length+' bài học · Mỗi ngày một bước tiến!'}),el('span',{class:'chinese-hero-hint',text:'Chọn bài, mở nhóm và bắt đầu học.'})]),
  el('img',{class:'chinese-course-mascot',src:'/assets/images/welcome/chinese-3d.webp',width:184,height:184,alt:'Gấu trúc 3D chào bạn học tiếng Trung',fetchpriority:'high'}),
 ]));
 const list=el('div',{class:'chinese-lesson-list'});
 for(const [lessonIndex,lesson]of lessons.entries()){
  const sets=catalog.sets.filter(set=>set.lesson_id===lesson.id);
  const row=el('section',{class:'chinese-lesson-row lesson-island',id:'lesson-'+lesson.id,'data-tone':['purple','peach','mint'][lessonIndex%3]},[
   el('header',{class:'chinese-lesson-heading'},[el('span',{class:'chinese-lesson-number','aria-hidden':'true',text:String(lessonIndex+1).padStart(2,'0')}),el('h3',{text:lesson.title}),el('img',{class:'chinese-lesson-companion',src:'/assets/images/mascot-'+['panda','bunny','lion'][lessonIndex%3]+'.svg',width:58,height:62,alt:'',loading:'lazy'})]),
  ]);
  for(const set of sets){
   const c=modeCounts(set,catalog.counts),progress=percentage(set.id,catalog),completion=catalog.completion?.find(p=>p.set_id===set.id);
   const summary=[c.words?c.words+' từ':'',c.quiz?c.quiz+' câu hỏi':'',c.speak?c.speak+' câu luyện nói':'',progress?'Đã học '+progress+'%':''].filter(Boolean).join(' · ')||'Nội dung đang được bổ sung.';
   row.append(el('div',{class:'chinese-lesson-entry learn-document','data-set':set.id},[
    ...(sets.length>1?[el('strong',{text:set.title})]:[]),el('p',{class:'chinese-lesson-summary',text:summary}),
    ...(c.quiz>0&&c.quiz<20?[el('p',{class:'chinese-lesson-summary',text:'Quiz đang được bổ sung; cần đủ 20 câu để bắt đầu.'})]:[]),
    ...(completion?.quiz_stages?[el('p',{class:'chinese-lesson-summary',text:'Bài tập: '+(completion.quiz_completed||0)+'/'+completion.quiz_stages+' lượt hoàn thành'})]:[]),
    lessonSections(set,c,lesson,quiz),
   ]));
  }
  if(!sets.length)row.append(el('p',{class:'chinese-lesson-summary',text:'Nội dung bài này đang được bổ sung.'}),lessonSections({},{},lesson,quiz));
  list.append(row);
 }
 root().append(list);
 if(!lessons.length)root().append(el('p',{class:'chinese-empty',text:'Khóa này chưa có bài học được mở. Bạn quay lại sau nhé.'}));
 const selected=lessons.find(l=>l.id===params.get('lesson'));
 if(selected)requestAnimationFrame(()=>document.getElementById('lesson-'+selected.id)?.scrollIntoView({block:'start'}));
}
