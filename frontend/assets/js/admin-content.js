import {api,el} from './api.js';
import {initPage} from './ui-core.js';
import {openWorksheet,createWorksheet,closeWorksheet,removeWorksheet} from './admin-worksheets.js';
import {openCreate,openDetail,changeStatus} from './admin-question-editor.js';
import {initCurriculum,selectedScope,loadCurriculum,selectContentLesson} from './admin-content-curriculum.js';
import {store} from './admin-questions-context.js';
import {openImport} from './admin-questions-import.js';
const root=document.querySelector('#content-list'),notice=document.querySelector('#content-hub-error'),editor=document.querySelector('#content-worksheets'),filters=document.querySelector('#content-filters');
let page=1,pages=1,requestNumber=0,openedLesson=null;
const status={draft:'Nháp',published:'Đã đăng',hidden:'Đang ẩn'},subjects={toan:'Toán','tieng-viet':'Tiếng Việt','tieng-anh':'Tiếng Anh'};
const button=(text,fn)=>el('button',{type:'button',class:'btn btn-ghost btn-sm',text,onclick:async event=>{const b=event.currentTarget;b.disabled=true;try{await fn();}catch(e){notice.textContent=e.message;}finally{b.disabled=false;}}});
function showEditor(){editor.hidden=false;document.querySelector('#ws-authoring').hidden=false;document.querySelector('#ws-reviews').hidden=true;editor.scrollIntoView({block:'start',behavior:'smooth'});}
async function publishAll(lessonId){
 const {data}=await api('/api/v1/admin/content/publish-questions',{method:'POST',body:{lessonId}});
 notice.textContent=data.published?'Đã đăng '+data.published+' câu hỏi nháp của bài học này.':'Bài học này không còn câu hỏi nháp cần đăng.';
 await loadCurriculum();await load();
}
function lessonCards(scope){
 const cards=[];
 for(const grade of store.tree.grades){if(scope.grade&&scope.grade!==grade.grade)continue;
 for(const semester of grade.semesters){if(scope.semester&&scope.semester!==semester.id)continue;
 for(const subject of semester.subjects){if(scope.subjectId&&scope.subjectId!==subject.id)continue;
 for(const chapter of subject.chapters){if(scope.chapterId&&scope.chapterId!==chapter.id)continue;
 for(const lesson of chapter.lessons){if(scope.lessonId&&scope.lessonId!==lesson.id)continue;
 if(!lesson.contentCount&&!scope.chapterId)continue;
 const target={grade:grade.grade,semester:semester.id,subjectId:subject.id,chapterId:chapter.id,lessonId:lesson.id};
 cards.push(el('article',{class:'content-lesson-card','data-content-lesson':lesson.id},[
 el('p',{class:'muted',text:[grade.name,semester.name,subject.name,chapter.name].join(' · ')}),el('h2',{text:lesson.name}),
 el('p',{text:lesson.questionCount+' câu hỏi · '+lesson.worksheetCount+' bộ bài tập'}),
 button('Xem bộ câu hỏi',()=>{if(!closeWorksheet())return;editor.hidden=true;openedLesson=lesson.id;page=1;filters.reset();selectContentLesson(target);}),
 ]));
 }}}}}
 root.replaceChildren(el('div',{class:'content-lesson-grid'},cards.length?cards:[el('p',{class:'content-empty',text:'Chưa có bài học có nội dung. Chọn chủ đề và bài học ở trên để thêm câu hỏi hoặc nhập Word.'})]));
 document.querySelector('#content-page').textContent=cards.length+' bài học';document.querySelector('#content-prev').disabled=true;document.querySelector('#content-next').disabled=true;
}
async function load(){
 const sequence=++requestNumber,params=new URLSearchParams(),scope=selectedScope();
 const inside=Boolean(scope?.lessonId&&openedLesson===scope.lessonId)||Boolean(scope?.unassigned);
 filters.hidden=!inside;root.classList.toggle('content-lesson-overview',!inside);
 if(!scope){root.replaceChildren(el('p',{class:'content-empty',text:'Chọn lớp ở trên để xem và sắp xếp nội dung.'}));document.querySelector('#content-page').textContent='';document.querySelector('#content-prev').disabled=true;document.querySelector('#content-next').disabled=true;return;}
 if(!inside){lessonCards(scope);return;}
 for(const key of ['yearId','grade','semester','subjectId','chapterId','lessonId','unassigned'])if(scope[key])params.set(key,scope[key]);for(const [key,value]of new FormData(filters))if(value)params.set(key,value);params.set('page',page);
 const payload=await api('/api/v1/admin/content?'+params);if(sequence!==requestNumber)return;
 pages=Math.max(1,Math.ceil(payload.pagination.total/20));if(page>pages){page=pages;return load();}
 root.replaceChildren(...(payload.data.length?payload.data.map(item=>{
  const actions=el('div',{class:'content-row-actions'},[button('Sửa',async()=>{
   if(item.kind==='worksheet'){if(await openWorksheet(item.id))showEditor();}
   else{if(!closeWorksheet())return;editor.hidden=true;await openDetail(item.id);}
  })]);
  if(item.kind==='worksheet')actions.append(button('Xóa',async()=>{const result=await removeWorksheet(item.id,item.version);if(result){notice.textContent=result.message;await load();}}));
  else actions.append(button(item.status==='published'?'Ẩn':'Đăng bài',async()=>changeStatus(item.id,item.status==='published'?'hidden':'published')));
  return el('article',{class:'content-row','data-content-id':item.id,'data-content-kind':item.kind},[
   el('div',{class:'content-row-body'},[el('strong',{text:item.title}),el('p',{text:(item.kind==='worksheet'?'Bộ bài · '+item.item_count+' câu':'Câu hỏi đơn')+' · Lớp '+item.grade+' · '+(subjects[item.subject_id]||item.subject_id)}),el('span',{class:'content-status '+item.status,text:status[item.status]})]),actions,
  ]);
 }):[el('div',{class:'content-empty'},[el('h2',{text:'Chưa có nội dung phù hợp'}),el('p',{text:'Bấm Tạo nội dung để thêm câu hỏi hoặc bộ bài.'})])]));
 document.querySelector('#content-page').textContent='Trang '+page+'/'+pages+' · '+payload.pagination.total+' nội dung';document.querySelector('#content-prev').disabled=page<=1;document.querySelector('#content-next').disabled=page>=pages;
 if(scope.lessonId)root.prepend(el('div',{class:'content-lesson-heading'},[button('← Danh sách bài học',()=>{if(!closeWorksheet())return;editor.hidden=true;openedLesson=null;page=1;filters.reset();selectContentLesson({...scope,lessonId:undefined});}),el('strong',{text:scope.breadcrumb.at(-1)}),button('Đăng tất cả câu hỏi nháp',()=>publishAll(scope.lessonId))]));
}
filters.onsubmit=e=>{e.preventDefault();page=1;load().catch(e=>notice.textContent=e.message);};
filters.querySelectorAll('select').forEach(s=>s.onchange=()=>{page=1;load().catch(e=>notice.textContent=e.message);});
document.querySelector('#content-create').onclick=async()=>{try{
 if(document.querySelector('#content-create-kind').value==='worksheet'){if(await createWorksheet(selectedScope()))showEditor();}
 else{if(!closeWorksheet())return;editor.hidden=true;await openCreate();}
}catch(e){notice.textContent=e.message;}};
document.querySelector('#content-import').onclick=()=>openImport();
document.querySelector('#content-reviews').onclick=()=>{editor.hidden=false;document.querySelector('#ws-review-tab').click();editor.scrollIntoView({block:'start',behavior:'smooth'});};
document.querySelector('#content-close-editor').onclick=()=>{if(closeWorksheet())editor.hidden=true;};
document.querySelector('#content-prev').onclick=()=>{if(page>1){page--;load().catch(e=>notice.textContent=e.message);}};
document.querySelector('#content-next').onclick=()=>{if(page<pages){page++;load().catch(e=>notice.textContent=e.message);}};
document.addEventListener('content:changed',()=>{loadCurriculum().then(load).catch(e=>notice.textContent=e.message);});
const params=new URLSearchParams(location.search);if(params.has('view')){params.delete('view');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
initPage('admin','questions').then(async()=>{await initCurriculum(()=>{if(selectedScope()?.lessonId!==openedLesson)openedLesson=null;page=1;load().catch(e=>notice.textContent=e.message);});await load();}).catch(e=>notice.textContent=e.message);
