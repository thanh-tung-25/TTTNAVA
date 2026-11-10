import { api, el, formatDate } from './api.js';
import { initPage } from './ui-core.js';
import { confirmAction } from './ui.js';
import { adminLabels, isSuperAdmin } from './admin-permissions.js';
import { setupPasswordToggle } from './password-toggle.js';
import { openAccountDeletion, openAccountRestore } from './admin-account-deletion.js';

const endpoint='/api/v1/admin/team', notice=document.getElementById('team-notice');
let me, auditPage=1, teamStatus='active';
function message(text,error=false){notice.textContent=text;notice.className=error?'form-error':'team-success';}
function button(text,action,disabled=false){const node=el('button',{type:'button',class:'btn btn-ghost btn-sm',text,disabled:disabled?'':null});node.onclick=async()=>{node.disabled=true;try{await action();}catch(error){message(error.message,true);}finally{node.disabled=disabled;}};return node;}
async function audit(){
 const {data}=await api(endpoint+'/audit?page='+auditPage);
 const labels={'admin.create':'Tạo quản trị viên','admin.access':'Đổi quyền / trạng thái quản trị','admin.password':'Đặt lại mật khẩu quản trị','account.deletion.confirmation':'Xác minh yêu cầu xóa tài khoản','account.delete':'Chuyển tài khoản vào thùng rác','account.restore':'Khôi phục tài khoản'};
 document.getElementById('team-audit').replaceChildren(...(data.length?data.map(row=>el('article',{class:'team-log'},[
  el('div',{},[el('strong',{text:row.actor_username}),el('p',{text:labels[row.action]||'Thay đổi nội dung / tài khoản'})]),
  el('time',{text:formatDate(row.created_at)}),
 ])):[el('p',{class:'muted',text:'Chưa có thao tác ở trang này.'})]));
 document.getElementById('audit-prev').disabled=auditPage===1;
 document.getElementById('audit-next').disabled=data.length<50;
 document.getElementById('audit-page').textContent='Trang '+auditPage;
}
async function refresh(){
 const {data}=await api(endpoint+(teamStatus==='deleted'?'?status=deleted':''));
 document.getElementById('team-summary').replaceChildren(...Object.entries(adminLabels).map(([scope,label])=>el('article',{class:'card'},[el('strong',{text:data.filter(user=>user.adminScope===scope).length}),el('span',{text:label})])));
 document.getElementById('team-list').replaceChildren(...data.map(user=>{
  const own=user.id===me.id;
  if(teamStatus==='deleted'){
   const restore=button('Khôi phục',()=>openAccountRestore({account:user,basePath:endpoint,onChanged:refresh}));
   restore.dataset.restoreAdmin=user.id;
   return el('article',{class:'team-member','data-admin-id':user.id},[
    el('div',{class:'team-member-head'},[el('div',{},[el('h3',{text:user.displayName}),el('p',{class:'muted',text:'@'+user.username})]),el('span',{class:'badge badge-danger',text:'Đã xóa'})]),
    el('p',{class:'muted',text:adminLabels[user.adminScope]+' · Xóa lúc '+formatDate(user.deletedAt)}),
    el('p',{class:'student-deletion-reason',text:'Lý do: '+(user.deletionReason||'Không có ghi chú.')}),
    ...(!own&&user.adminScope!=='super'?[el('div',{class:'team-actions'},[restore])]:[]),
   ]);
  }
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
  const remove=button('Xóa',()=>openAccountDeletion({id:user.id,basePath:endpoint,onChanged:refresh}));
  remove.classList.add('btn-danger');remove.classList.remove('btn-ghost');remove.dataset.deleteAdmin=user.id;
  return el('article',{class:'team-member','data-admin-id':user.id},[
   el('div',{class:'team-member-head'},[el('div',{},[el('h3',{text:user.displayName+(own?' (Bạn)':'')}),el('p',{class:'muted',text:'@'+user.username})]),el('span',{class:'badge '+(user.locked?'badge-danger':'badge-success'),text:user.locked?'Đã khóa':'Hoạt động'})]),
   el('div',{class:'team-actions'},[scope,save,lock,...(!own&&user.adminScope!=='super'?[remove]:[])]),
   ...(own?[el('p',{class:'muted',text:'Nhờ admin tổng khác thay đổi quyền hoặc trạng thái tài khoản của bạn.'})]:[]),reset,
  ]);
 }));
 if(!data.length)document.getElementById('team-list').replaceChildren(el('p',{class:'muted',text:teamStatus==='deleted'?'Thùng rác quản trị viên trống.':'Chưa có quản trị viên trong danh sách này.'}));
 await audit();
}
async function main(){
 me=await initPage('admin','team');
 if(!isSuperAdmin(me))return;
 const statusTabs=document.getElementById('team-status-tabs');
 statusTabs.hidden=false;statusTabs.classList.remove('hidden');
 statusTabs.addEventListener('click',event=>{
  const tab=event.target.closest('[data-team-status]');
  if(!tab||tab.dataset.teamStatus===teamStatus)return;
  teamStatus=tab.dataset.teamStatus;
  for(const item of statusTabs.querySelectorAll('[data-team-status]'))item.setAttribute('aria-selected',String(item===tab));
  document.querySelector('.team-create').hidden=teamStatus==='deleted';
  document.getElementById('team-trash-notice').hidden=teamStatus!=='deleted';
  refresh().catch(error=>message(error.message,true));
 });
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
