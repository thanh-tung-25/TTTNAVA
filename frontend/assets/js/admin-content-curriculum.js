import {api,el} from './api.js';
import {store} from './admin-questions-context.js';
const panel=document.querySelector('#content-curriculum');
let ids={},onSelect=()=>{},tree;
export function selectedScope(){return store.selectedScope;}
export function selectContentLesson(scope){choose({grade:scope.grade,semester:scope.semester,subjectId:scope.subjectId,chapterId:scope.chapterId,lessonId:scope.lessonId});}
function choose(next){ids={...next};render();document.dispatchEvent(new Event('curriculum:selected'));onSelect();}
function select(label,items,value,change){
 const input=el('select',{class:'select','aria-label':label},[el('option',{value:'',text:'Chọn '+label.toLowerCase()+'…'}),...items.map(i=>el('option',{value:i.id,text:i.name+(i.isLegacy?' · Nội dung cũ':'')}))]);input.value=value||'';input.onchange=()=>change(input.value);
 return el('label',{class:'field'},[el('span',{text:label}),input]);
}
function render(){
 const yearId=tree.year.id,grade=tree.grades.find(g=>g.grade===Number(ids.grade)),semester=grade?.semesters.find(s=>s.id===ids.semester),subject=semester?.subjects.find(s=>s.id===ids.subjectId),chapter=subject?.chapters.find(c=>c.id===ids.chapterId),lesson=chapter?.lessons.find(l=>l.id===ids.lessonId);
 const breadcrumb=[tree.year.name,grade?.name,semester?.name,subject?.name,chapter?.name,lesson?.name].filter(Boolean);
 store.selectedScope=ids.unassigned?{unassigned:'1',breadcrumb:['Nội dung chưa xếp bài học']}:grade?{type:lesson?'lesson':chapter?'chapter':'scope',yearId,grade:grade.grade,...(semester?{semester:semester.id}:{}),...(subject?{subjectId:subject.id}:{}),...(chapter?{chapterId:chapter.id}:{}),...(lesson?{lessonId:lesson.id,topicId:lesson.topicId}:{}),breadcrumb}:null;
 const heading=el('div',{class:'content-curriculum-head'},[el('div',{},[el('h2',{text:'Chương trình học'}),el('p',{text:'Chọn lớp → học kì → môn → chủ đề → bài học để thêm bài.'})]),select('Năm học',tree.years,yearId,async value=>{if(value){ids={};await loadCurriculum(value);onSelect();}})]);
 const grades=el('div',{class:'content-grade-tabs','aria-label':'Chọn lớp'});
 for(const g of tree.grades){const b=el('button',{type:'button',class:'btn btn-ghost',text:g.name,'aria-pressed':String(g.grade===grade?.grade),onclick:()=>choose({grade:g.grade})});grades.append(b);}
 const fields=el('div',{class:'content-curriculum-fields'});
 if(grade)fields.append(select('Học kì',grade.semesters,ids.semester,value=>choose({grade:grade.grade,semester:value})));
 if(semester)fields.append(select('Môn học',semester.subjects,ids.subjectId,value=>choose({grade:grade.grade,semester:semester.id,subjectId:value})));
 if(subject)fields.append(select('Chủ đề',[...subject.chapters].sort((a,b)=>Number(a.isLegacy)-Number(b.isLegacy)),ids.chapterId,value=>choose({grade:grade.grade,semester:semester.id,subjectId:subject.id,chapterId:value})));
 if(chapter)fields.append(select('Bài học',chapter.lessons,ids.lessonId,value=>choose({grade:grade.grade,semester:semester.id,subjectId:subject.id,chapterId:chapter.id,lessonId:value})));
 const actions=el('div',{class:'content-curriculum-actions'});
 if(subject)actions.append(el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'+ Thêm chủ đề',onclick:()=>add('chapters')}));
 if(chapter)actions.append(el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'+ Thêm bài học',onclick:()=>add('lessons')}));
 actions.append(el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Nội dung chưa xếp bài học',onclick:()=>choose({unassigned:'1'})}));
 panel.replaceChildren(heading,grades,fields,actions);
 if(chapter?.bookLabel)panel.append(el('p',{class:'muted',text:'Bộ sách: '+chapter.bookLabel}));
 document.querySelector('#content-placement').textContent=store.selectedScope?.breadcrumb.join(' › ')||'Chọn một lớp để xem nội dung.';
 document.querySelector('#content-create').disabled=!lesson;
 document.querySelector('#content-import').disabled=!lesson;
 document.querySelector('#content-placement-hint').textContent=lesson?'Nội dung mới sẽ được lưu đúng vào bài học này.':ids.unassigned?'Sửa bộ bài rồi chọn bài học để xếp vào chương trình.':'Bạn có thể xem tổng hợp ở từng cấp. Chọn đến bài học để thêm nội dung.';
}
async function add(kind){
 const scope=store.selectedScope,dialog=el('dialog',{class:'worksheet-dialog'}),form=el('form'),input=el('input',{class:'input',required:'',maxlength:kind==='chapters'?160:120,'aria-label':kind==='chapters'?'Tên chủ đề':'Tên bài học'}),error=el('p',{role:'alert'});
 form.append(el('h2',{text:kind==='chapters'?'Thêm chủ đề':'Thêm bài học'}),el('p',{text:scope.breadcrumb.join(' › ')}),input,error,el('button',{class:'btn',type:'submit',text:'Thêm'}),el('button',{class:'btn btn-ghost',type:'button',text:'Hủy',onclick:()=>dialog.close()}));dialog.append(form);document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();input.focus();
 form.onsubmit=async event=>{event.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;try{const body=kind==='chapters'?{yearId:scope.yearId,grade:scope.grade,semester:scope.semester,subjectId:scope.subjectId,name:input.value}:{chapterId:scope.chapterId,name:input.value};const {data}=await api('/api/v1/admin/content/'+kind,{method:'POST',body});ids={grade:scope.grade,semester:scope.semester,subjectId:scope.subjectId,...(kind==='chapters'?{chapterId:data.id}:{chapterId:scope.chapterId,lessonId:data.id})};await loadCurriculum(scope.yearId);onSelect();dialog.close();}catch(e){error.textContent=e.message;}finally{submit.disabled=false;}};
}
export async function loadCurriculum(yearId=tree?.year.id){
 const response=await api('/api/v1/admin/curriculum/tree'+(yearId?'?yearId='+encodeURIComponent(yearId):''));tree=response.data;store.tree=tree;render();
}
export async function initCurriculum(callback){onSelect=callback;await loadCurriculum();}
