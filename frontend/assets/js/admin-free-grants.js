import {api,el,formatDate} from './api.js';

const local=value=>{const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const field=(label,node)=>el('label',{},[el('span',{text:label}),node]);
const yearAfter=value=>{const d=new Date(value),month=d.getUTCMonth();d.setUTCFullYear(d.getUTCFullYear()+1);if(d.getUTCMonth()!==month)d.setUTCDate(0);return d;};
export function createFreeGrantDialog(onSaved){
 let dialog,controller;
 const close=()=>dialog?.close();
 window.addEventListener('pagehide',()=>controller?.abort(),{once:true});
 return async(initial={})=>{
  controller?.abort();controller=new AbortController();
  if(!dialog){
   dialog=el('dialog',{class:'free-grant-dialog','aria-labelledby':'free-grant-title'});document.body.append(dialog);
   dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
  }
  const status=el('p',{role:'status','aria-live':'polite',class:'free-grant-status',text:'Đang mở danh sách học sinh và khóa học…'});
  const heading=el('div',{class:'free-grant-heading'},[el('div',{},[el('p',{class:'eyebrow',text:'TẶNG QUYỀN HỌC'}),el('h2',{id:'free-grant-title',text:initial.username?'Gia hạn miễn phí':'Cấp học miễn phí'})]),el('button',{type:'button',class:'btn btn-ghost',text:'×','aria-label':'Đóng',onclick:close})]);
  dialog.replaceChildren(heading,status);if(!dialog.open)dialog.showModal();
  try{
   const {data}=await api('/api/v1/courses/admin/free-grant-options',{signal:controller.signal});if(!dialog.open)return;
   const username=el('input',{name:'username',type:'text',list:'free-grant-students',required:'',minlength:3,maxlength:20,value:initial.username||'',autocomplete:'off',placeholder:'Nhập hoặc chọn tên đăng nhập của học sinh'});
   const students=el('datalist',{id:'free-grant-students'},data.students.map(s=>el('option',{value:s.username,label:s.display_name+' (@'+s.username+')'})));
   const choices=el('div',{class:'free-grant-courses'},data.courses.map(c=>el('label',{class:'free-grant-course'},[el('input',{type:'checkbox',name:'course_ids',value:c.id,...(initial.course_id===c.id?{checked:''}:{})}),el('span',{text:c.title})])));
   const start=el('input',{type:'datetime-local',required:'',value:local(Date.now())}),end=el('input',{type:'datetime-local',required:'',value:local(yearAfter(Math.max(Date.now(),initial.expires_at?new Date(initial.expires_at).getTime():0)))});
   const preview=el('p',{class:'free-grant-preview'});
   const update=()=>{const n=choices.querySelectorAll('input:checked').length;preview.textContent=n+' khóa đã chọn'+(end.value?' · Học đến '+formatDate(new Date(end.value)):'');};
   const quick=el('div',{class:'free-grant-presets'},[el('span',{text:'Chọn nhanh:'}),...[7,30,90].map(days=>el('button',{type:'button',class:'btn btn-ghost',text:days+' ngày',onclick:()=>{end.value=local(new Date(start.value||Date.now()).getTime()+days*86400000);update();}}))]);
   quick.append(el('button',{type:'button',class:'btn btn-ghost',text:'1 năm từ ngày bắt đầu',onclick:()=>{end.value=local(yearAfter(start.value||Date.now()));update();}}));
   const note=el('textarea',{name:'note',maxlength:500,placeholder:'Ví dụ: Tặng học thử, học bổng…'}),save=el('button',{type:'submit',class:'btn',text:'Cấp miễn phí và lưu danh sách'});
   const form=el('form',{class:'course-form free-grant-form'},[
    field('Học sinh',username),students,el('fieldset',{},[el('legend',{text:'Chọn một hoặc nhiều khóa'}),choices]),
    el('div',{class:'course-form-pair'},[field('Bắt đầu',start),field('Kết thúc',end)]),quick,field('Ghi chú (không bắt buộc)',note),preview,
    el('p',{text:'Sau khi cấp, học sinh xuất hiện trong Được cấp miễn phí. Quyền đã thanh toán vẫn được giữ nguyên.'}),save
   ]);
   choices.onchange=update;start.onchange=update;end.onchange=update;update();status.textContent='';dialog.append(form);username.focus();
   form.onsubmit=async event=>{
    event.preventDefault();const ids=[...choices.querySelectorAll('input:checked')].map(i=>i.value);
    if(!ids.length){status.textContent='Chọn ít nhất một khóa học.';choices.querySelector('input')?.focus();return;}
    if(new Date(end.value)<=new Date(start.value)||new Date(end.value)<=new Date()){status.textContent='Ngày kết thúc phải sau ngày bắt đầu và ở tương lai.';end.focus();return;}
    save.disabled=true;status.textContent='Đang cấp quyền học…';
    try{const {data:result}=await api('/api/v1/courses/admin/free-grants',{method:'POST',body:{username:username.value.trim(),course_ids:ids,starts_at:new Date(start.value).toISOString(),ends_at:new Date(end.value).toISOString(),note:note.value.trim()}});close();await onSaved(result);}
    catch(e){status.textContent=e.message;}finally{save.disabled=false;}
   };
  }catch(e){if(e.name!=='AbortError')status.textContent=e.message;}
 };
}
