import {api,el} from './api.js';
import {store} from './admin-questions-context.js';
import {subjectsFor} from './primary-subjects.js';
const panel=document.querySelector('#content-curriculum');
let ids={},onSelect=()=>{},beforeSelect=()=>true,tree;
export function selectedScope(){return store.selectedScope;}
export function selectContentLesson(scope){return choose(scope);}
export function refreshCurriculumView(){render();}
function persist(){const url=new URL(location.href);for(const key of ['grade','semester','subjectId','chapterId','lessonId','groupId','yearId','unassigned']){if(ids[key])url.searchParams.set(key,ids[key]);else url.searchParams.delete(key);}history.replaceState(null,'',url);}
function choose(next){if(!beforeSelect()){render();return false;}ids={...next};persist();render();document.dispatchEvent(new Event('curriculum:selected'));onSelect();return true;}
function picker(label,items,value,change,placeholder='Tất cả'){
 const input=el('select',{class:'select','aria-label':label},[...(placeholder?[el('option',{value:'',text:placeholder})]:[]),...items.map(i=>el('option',{value:i.id,text:i.name+(i.isLegacy?' · Nội dung cũ':'')+(i.management?.status==='deleted'?' · Đã xóa':'')}))]);input.value=value||'';input.onchange=()=>change(input.value);return el('label',{class:'field'},[el('span',{text:label}),input]);
}
function render(){
 if(!tree)return;const grade=tree.grades.find(g=>g.grade===Number(ids.grade))||tree.grades[0];if(!grade)return;ids.grade=grade.grade;ids.yearId=tree.year.id;
 const subjects=new Map();for(const semester of grade.semesters)for(const subject of semester.subjects)if(!subjects.has(subject.id))subjects.set(subject.id,subject);
 for(const [id,name]of subjectsFor({grade:grade.grade}))if(!subjects.has(id))subjects.set(id,{id,name,chapters:[]});
 if(!subjects.has(ids.subjectId))ids.subjectId=subjects.has('toan')?'toan':subjects.keys().next().value;
 const subject=subjects.get(ids.subjectId),chapters=grade.semesters.filter(s=>!ids.semester||s.id===ids.semester).flatMap(s=>s.subjects.filter(x=>x.id===ids.subjectId).flatMap(x=>x.chapters));
 const chapter=chapters.find(c=>c.id===ids.chapterId),lesson=chapter?.lessons.find(l=>l.id===ids.lessonId),breadcrumb=[grade.name,subject?.name,...(chapter?[chapter.name]:[]),...(lesson?[lesson.name]:[])];
 store.selectedScope={type:lesson?'lesson':chapter?'chapter':'scope',yearId:tree.year.id,grade:grade.grade,subjectId:ids.subjectId,...(ids.semester?{semester:ids.semester}:{}),...(chapter?{chapterId:chapter.id}:{}),...(lesson?{lessonId:lesson.id,topicId:lesson.topicId}:{}),...(ids.groupId?{groupId:ids.groupId}:{}),...(ids.unassigned?{unassigned:'1'}:{}),breadcrumb};
 const programs=[['primary','Cấp 1 · Tiểu học',1,5],['secondary','Cấp 2 · THCS',6,9],['highschool','Cấp 3 · THPT',10,12]].filter(([, ,min,max])=>tree.grades.some(g=>g.grade>=min&&g.grade<=max));
 const program=programs.find(([, ,min,max])=>grade.grade>=min&&grade.grade<=max),programTabs=el('nav',{class:'school-program-tabs','aria-label':'Chọn cấp học'});
 for(const [key,name,min,max]of programs)programTabs.append(el('button',{type:'button',class:'btn btn-ghost','aria-pressed':String(key===program?.[0]),text:name,onclick:()=>choose({grade:tree.grades.find(g=>g.grade>=min&&g.grade<=max).grade})}));
 const grades=el('nav',{class:'school-grade-tabs','aria-label':'Chọn lớp'});for(const g of tree.grades.filter(g=>g.grade>=program[2]&&g.grade<=program[3]))grades.append(el('button',{type:'button',class:'btn btn-ghost',text:g.name,'aria-pressed':String(g.grade===grade.grade),onclick:()=>choose({grade:g.grade})}));
 const subjectTabs=el('nav',{class:'school-subject-tabs','aria-label':'Chọn môn học'});for(const s of subjects.values())subjectTabs.append(el('button',{type:'button',class:'btn btn-ghost',text:s.name,'aria-pressed':String(s.id===ids.subjectId),onclick:()=>choose({grade:grade.grade,subjectId:s.id})}));
 const fields=el('div',{class:'school-catalog-filters'});fields.hidden=store.workspace?.mode==='papers';
 fields.append(picker('Học kì',grade.semesters,ids.semester,value=>choose({grade:grade.grade,subjectId:ids.subjectId,semester:value}),'Tất cả học kì'),picker('Chương / chủ đề',chapters,ids.chapterId,value=>{const semester=grade.semesters.find(s=>s.subjects.some(x=>x.chapters.some(c=>c.id===value)));choose({grade:grade.grade,subjectId:ids.subjectId,...(value?{semester:semester.id,chapterId:value}:{semester:ids.semester})});},'Tất cả chương / chủ đề'));
 panel.replaceChildren(programTabs,grades,subjectTabs,fields);
 const yearHost=document.querySelector('#school-year');if(yearHost){yearHost.replaceChildren(picker('Năm học',tree.years,tree.year.id,async value=>{if(!beforeSelect())return;ids={grade:grade.grade,subjectId:ids.subjectId,yearId:value};await loadCurriculum(value);persist();onSelect();},''));yearHost.hidden=store.workspace?.mode==='papers';}persist();
}
export async function addCurriculum(kind){
 const scope=selectedScope();if(kind==='chapters'&&!scope?.subjectId||kind==='lessons'&&!scope?.chapterId)throw Error('Chọn chương trước khi thêm bài học.');
 const dialog=el('dialog',{class:'worksheet-dialog'}),form=el('form'),input=el('input',{class:'input',required:'',maxlength:kind==='chapters'?160:255,'aria-label':kind==='chapters'?'Tên chủ đề':'Tên bài học'}),error=el('p',{role:'alert'});
 const semester=picker('Học kì',[{id:'hk1',name:'Học kì I'},{id:'hk2',name:'Học kì II'},{id:'year',name:'Cả năm'}],scope.semester||'hk1',()=>{},'');
 form.append(el('h2',{text:kind==='chapters'?'Thêm chương / chủ đề':'Thêm bài học'}),el('p',{text:scope.breadcrumb.join(' → ')}),...(kind==='chapters'?[semester]:[]),input,error,el('button',{class:'btn',type:'submit',text:'Tạo'}),el('button',{class:'btn btn-ghost',type:'button',text:'Hủy',onclick:()=>dialog.close()}));dialog.append(form);document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();input.focus();
 form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{const term=semester.querySelector('select').value,body=kind==='chapters'?{yearId:scope.yearId,grade:scope.grade,semester:term,subjectId:scope.subjectId,name:input.value}:{chapterId:scope.chapterId,name:input.value};const {data}=await api('/api/v1/admin/content/'+kind,{method:'POST',body});ids={grade:scope.grade,subjectId:scope.subjectId,semester:kind==='chapters'?term:scope.semester,chapterId:kind==='chapters'?data.id:scope.chapterId,...(kind==='lessons'?{lessonId:data.id,groupId:['tieng-anh','tieng-viet'].includes(scope.subjectId)&&scope.grade>=6?scope.chapterId:data.id}:{})};await loadCurriculum(scope.yearId);persist();onSelect();dialog.close();}catch(e){error.textContent=e.message;}finally{button.disabled=false;}};
}
export async function loadCurriculum(yearId=tree?.year.id){const {data}=await api('/api/v1/admin/curriculum/tree'+(yearId?'?yearId='+encodeURIComponent(yearId):''));tree=data;store.tree=tree;render();}
export async function initCurriculum(callback,guard){onSelect=callback;beforeSelect=guard||beforeSelect;const params=new URLSearchParams(location.search);for(const key of ['grade','semester','subjectId','chapterId','lessonId','groupId','yearId','unassigned'])if(params.has(key))ids[key]=params.get(key);await loadCurriculum(ids.yearId);}
