import { api, el, formatDate } from './api.js';
import { initPage } from './ui-core.js';
import { confirmAction } from './ui.js';
import { adminLabels } from './admin-permissions.js';
import { setupPasswordToggle } from './password-toggle.js';

const endpoint='/api/v1/admin/team', notice=document.getElementById('team-notice');
let me, auditPage=1;
function message(text,error=false){notice.textContent=text;notice.className=error?'form-error':'team-success';}
function button(text,action,disabled=false){const node=el('button',{type:'button',class:'btn btn-ghost btn-sm',text,disabled:disabled?'':null});node.onclick=async()=>{node.disabled=true;try{await action();}catch(error){message(error.message,true);}finally{node.disabled=disabled;}};return node;}
async function audit(){
 const {data}=await api(endpoint+'/audit?page='+auditPage);
 const labels={'admin.create':'Tạo quản trị viên','admin.access':'Đổi quyền / trạng thái quản trị','admin.password':'Đặt lại mật khẩu quản trị'};
 document.getElementById('team-audit').replaceChildren(...(data.length?data.map(row=>el('article',{class:'team-log'},[
  el('div',{},[el('strong',{text:row.actor_username}),el('p',{text:labels[row.action]||'Thay đổi nội dung / tài khoản'})]),
  el('time',{text:formatDate(row.created_at)}),
 ])):[el('p',{class:'muted',text:'Chưa có thao tác ở trang này.'})]));
 document.getElementById('audit-prev').disabled=auditPage===1;
 document.getElementById('audit-next').disabled=data.length<50;
 document.getElementById('audit-page').textContent='Trang '+auditPage;
}
async function refresh(){
 const {data}=await api(endpoint);
 document.getElementById('team-summary').replaceChildren(...Object.entries(adminLabels).map(([scope,label])=>el('article',{class:'card'},[el('strong',{text:data.filter(user=>user.adminScope===scope).length}),el('span',{text:label})])));
 document.getElementById('team-list').replaceChildren(...data.map(user=>{
  const own=user.id===me.id;
  const scope=el('select',{class:'select','aria-label':'Quyền của '+user.displayName,disabled:own?'':null},Object.entries(adminLabels).map(([key,label])=>el('option',{value:key,text:label})));
  scope.value=user.adminScope;
  const save=button('Lưu quyền',async()=>{
   if(scope.value===user.adminScope)return;
   if(!await confirmAction('Đổi quyền của '+user.displayName+' thành '+adminLabels[scope.value]+'? Tài khoản này sẽ cần đăng nhập lại.',{title:'Đổi quyền quản trị',confirmText:'Lưu quyền'}))return;
   await api(endpoint+'/'+user.id,{method:'PATCH',body:{adminScope:scope.value}});message('Đã cập nhật quyền quản lý.');await refresh();
  },own);
  const lock=button(user.locked?'Mở khóa':'Khóa',async()=>{
   if(!await confirmAction((user.locked?'Mở khóa ':'Khóa ')+user.displayName+'?',{title:'Trạng thái quản trị',confirmText:user.locked?'Mở khóa':'Khóa',danger:!user.locked}))return;
   await api(endpoint+'/'+user.id,{method:'PATCH',body:{locked:!user.locked}});message('Đã cập nhật trạng thái.');await refresh();
  },own);
  const reset=el('details',{class:'team-password'},[el('summary',{text:'Đặt lại mật khẩu'})]);
  const password=el('input',{class:'input',id:'password-'+user.id,type:'password',minlength:10,maxlength:72,required:'',autocomplete:'new-password'});
  const form=el('form',{},[el('label',{for:password.id,text:'Mật khẩu mới'}),password,el('button',{class:'btn btn-sm',type:'submit',text:'Lưu mật khẩu mới'})]);
  setupPasswordToggle(password);reset.append(form);
  form.onsubmit=async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const submit=form.querySelector('[type=submit]');submit.disabled=true;
   try{const result=await api(endpoint+'/'+user.id+'/password',{method:'POST',body:{password:password.value}});password.value='';reset.open=false;
    if(result.data.reauthenticate){location.assign('/pages/login/');return;}
    message('Đã đổi mật khẩu và hết hạn các phiên quản trị cũ.');await audit();
   }catch(error){message(error.message,true);}finally{submit.disabled=false;}
  };
  return el('article',{class:'team-member'},[
   el('div',{class:'team-member-head'},[el('div',{},[el('h3',{text:user.displayName+(own?' (Bạn)':'')}),el('p',{class:'muted',text:'@'+user.username})]),el('span',{class:'badge '+(user.locked?'badge-danger':'badge-success'),text:user.locked?'Đã khóa':'Hoạt động'})]),
   el('div',{class:'team-actions'},[scope,save,lock]),
   ...(own?[el('p',{class:'muted',text:'Nhờ admin tổng khác thay đổi quyền hoặc trạng thái tài khoản của bạn.'})]:[]),reset,
  ]);
 }));
 await audit();
}
async function main(){
 me=await initPage('admin','team');
 const form=document.getElementById('create-admin');setupPasswordToggle(form.password);
 form.onsubmit=async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const submit=form.querySelector('[type=submit]');submit.disabled=true;
  try{await api(endpoint,{method:'POST',body:Object.fromEntries(new FormData(form))});form.reset();form.password.type='password';
   const eye=form.querySelector('.password-toggle');eye.setAttribute('aria-pressed','false');eye.setAttribute('aria-label','Hiện mật khẩu');eye.querySelector('[data-password-slash]').setAttribute('hidden','');
   message('Đã tạo quản trị viên.');await refresh();
  }catch(error){message(error.message,true);}finally{submit.disabled=false;}
 };
 document.getElementById('team-refresh').onclick=()=>refresh().catch(error=>message(error.message,true));
 document.getElementById('audit-prev').onclick=()=>{if(auditPage>1)auditPage--;audit().catch(error=>message(error.message,true));};
 document.getElementById('audit-next').onclick=()=>{auditPage++;audit().catch(error=>message(error.message,true));};
 await refresh();
}
main().catch(error=>message(error.message,true));
