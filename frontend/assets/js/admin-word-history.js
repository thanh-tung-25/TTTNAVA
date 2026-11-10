import {api,el,formatDate} from './api.js';
import {openModal} from './ui.js';
import {store} from './admin-questions-context.js';
import {subjectName} from './primary-subjects.js';
export function openWordHistory(){
 let page=1,sequence=0;
 const content=el('div'),error=el('p',{role:'alert'}),list=el('div',{'data-word-history':''}),form=el('form',{class:'content-filters'}),search=el('input',{class:'input',placeholder:'Tìm tên tệp hoặc bài học…','aria-label':'Tìm Word đã nạp',maxlength:100}),grade=el('select',{class:'select','aria-label':'Lớp của tệp Word'},[el('option',{value:'',text:'Tất cả lớp'}),...(store.tree?.grades||Array.from({length:9},(_,i)=>({grade:i+1}))).map(g=>el('option',{value:g.grade,text:'Lớp '+g.grade}))]),semester=el('select',{class:'select','aria-label':'Học kì của tệp Word'},[el('option',{value:'',text:'Cả năm'}),el('option',{value:'hk1',text:'Học kì 1'}),el('option',{value:'hk2',text:'Học kì 2'})]);
 const previous=el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'← Trước'}),next=el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Sau →'}),label=el('span');
 form.append(search,grade,semester,el('button',{type:'submit',class:'btn btn-ghost',text:'Tìm'}));
 content.append(el('p',{class:'muted',text:'Tệp gốc được lưu sau khi bạn bấm Lưu tất cả dưới dạng nháp. Các tệp nhập trước khi có tính năng này cần nạp lại để lưu bản gốc.'}),form,error,list,el('div',{class:'content-pagination'},[previous,label,next]));
 async function load(){
  const current=++sequence;error.textContent='';previous.disabled=next.disabled=true;
  const params=new URLSearchParams({page});if(search.value.trim())params.set('q',search.value.trim());if(grade.value)params.set('grade',grade.value);if(semester.value)params.set('semester',semester.value);
  try{const payload=await api('/api/v1/admin/content/word-documents?'+params);if(current!==sequence)return;
   list.replaceChildren(...(payload.data.length?payload.data.map(d=>el('article',{class:'content-row','data-word-document':d.id},[
    el('div',{class:'content-row-body'},[el('strong',{text:d.filename}),el('p',{text:[d.school_year_id,'Lớp '+d.grade,d.semester==='hk1'?'Học kì 1':'Học kì 2',subjectName(d.subject_id,d.grade),d.chapter_name,d.lesson_name].join(' › ')}),el('p',{text:d.question_count+' câu đã lưu · '+formatDate(d.imported_at)+' · '+(d.imported_by_name||'Quản trị viên')+' · '+Math.ceil(d.byte_size/1024)+' KB'})]),
    el('a',{class:'btn btn-ghost btn-sm',href:'/api/v1/admin/content/word-documents/'+d.id+'/download',download:d.filename,text:'Tải Word gốc'})
   ])):[el('p',{class:'content-empty',text:'Chưa có tệp Word đã lưu phù hợp.'})]));
   const pages=Math.max(1,Math.ceil(payload.pagination.total/20));label.textContent='Trang '+page+'/'+pages+' · '+payload.pagination.total+' tệp';previous.disabled=page<=1;next.disabled=page>=pages;
  }catch(e){if(current===sequence)error.textContent=e.message;}
 }
 form.onsubmit=e=>{e.preventDefault();page=1;load();};grade.onchange=semester.onchange=()=>{page=1;load();};previous.onclick=()=>{page--;load();};next.onclick=()=>{page++;load();};
 openModal({title:'Word đã nạp',content,wide:true,actions:[{label:'Đóng',className:'btn btn-ghost',onClick:close=>close()}]});load();
}
