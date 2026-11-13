import {api,el} from './api.js';
import {initPage} from './ui-core.js';
import {isSuperAdmin} from './admin-permissions.js';
const $=id=>document.getElementById(id),p=(text,className='')=>el('p',{text,class:className});
const time=value=>value?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value)):'Chưa ghi nhận';
const roleLabel=profile=>profile.role==='admin'?'Quản trị viên':profile.account_kind==='guardian'?'Phụ huynh':'Học sinh';
const devices={mobile:'Điện thoại',tablet:'Máy tính bảng',desktop:'Máy tính'};
let accountPage=1,totalPages=1,historyPage=1,selected=new URLSearchParams(location.search).get('account'),eventType='',from='',to='',listVersion=0,historyVersion=0;
function notice(error){$('access-notice').textContent=error?.message||'';}
function tracking(data){$('access-tracking-since').textContent=(data.tracking_since?'Bắt đầu ghi nhận: '+time(data.tracking_since)+'. ':'')+'Giữ nhật ký trong '+data.retention_days+' ngày gần nhất. Những lần truy cập trước khi bật chức năng không có dữ liệu. Giờ hiển thị: Việt Nam.';}
function highlight(){document.querySelectorAll('[data-access-account]').forEach(button=>button.setAttribute('aria-current',String(button.dataset.accessAccount===selected)));}
async function loadAccounts(keepSelection=true){
 const version=++listVersion;notice();const params=new URLSearchParams({page:accountPage,limit:20,q:$('access-query').value.trim(),role:$('access-role').value});
 try{const {data}=await api('/api/v1/admin/access-history?'+params);if(version!==listVersion)return;tracking(data);totalPages=Math.max(1,Math.ceil(data.total/data.limit));if(accountPage>totalPages){accountPage=totalPages;return loadAccounts(keepSelection);}
  $('access-total').textContent=data.total+' tài khoản trong quyền quản lý';$('access-page-number').textContent=accountPage+'/'+totalPages;$('access-prev').disabled=accountPage===1;$('access-next').disabled=accountPage>=totalPages;
  $('access-account-list').replaceChildren(...data.items.map(profile=>{
   const button=el('button',{type:'button',class:'access-account','data-access-account':profile.id,onclick:()=>selectAccount(profile.id,true)}),initials=profile.display_name.trim().split(/\s+/u).slice(-2).map(s=>s[0]).join('').toLocaleUpperCase('vi');
   button.append(el('span',{class:'access-initials','aria-hidden':'true',text:initials}),el('span',{class:'access-account-copy'},[el('strong',{text:profile.display_name}),el('span',{text:'@'+profile.username+' · '+roleLabel(profile)}),el('time',{text:time(profile.latest_at)}),el('small',{text:profile.latest_at?(data.page_labels[profile.last_page]||({login:'Đăng nhập thành công',logout:'Đăng xuất'}[profile.last_event]||'Truy cập web')):'Chưa có nhật ký truy cập'})]));return button;
  }));if(!data.items.length)$('access-account-list').append(p('Không tìm thấy tài khoản phù hợp.','access-empty'));
  if(!keepSelection||!selected){selected=data.items[0]?.id||null;historyPage=1;eventType='';from='';to='';}
  highlight();if(selected)await loadHistory();else $('access-history').replaceChildren(p('Chọn một tài khoản để xem nhật ký.','access-empty'));
 }catch(error){if(version===listVersion)notice(error);}
}
async function selectAccount(id,scroll=false){selected=id;historyPage=1;eventType='';from='';to='';highlight();const url=new URL(location.href);url.searchParams.set('account',id);history.replaceState(null,'',url);await loadHistory();if(scroll&&matchMedia('(max-width:800px)').matches)$('access-history').scrollIntoView({block:'start',behavior:'smooth'});}
async function loadHistory(){
 if(!selected)return;const version=++historyVersion,id=selected;notice();$('access-history').setAttribute('aria-busy','true');const params=new URLSearchParams({page:historyPage,limit:25,type:eventType});if(from)params.set('from',from);if(to)params.set('to',to);
 try{const {data}=await api('/api/v1/admin/access-history/'+encodeURIComponent(id)+'?'+params);if(version!==historyVersion||id!==selected)return;tracking(data);renderHistory(data);}
 catch(error){if(version===historyVersion){notice(error);$('access-history').replaceChildren(p(error.message,'access-empty'));}}
 finally{if(version===historyVersion)$('access-history').removeAttribute('aria-busy');}
}
function renderHistory(data){
 const host=$('access-history'),profile=data.profile,pages=Math.max(1,Math.ceil(data.total/data.limit));
 const head=el('header',{class:'access-selected'},[el('span',{class:'eyebrow',text:'NHẬT KÝ TÀI KHOẢN'}),el('h2',{text:profile.display_name}),p('@'+profile.username+' · '+roleLabel(profile)+(profile.deleted_at?' · Đã xóa tài khoản':'')),p(data.total+' mục nhật ký phù hợp bộ lọc','muted')]);
 const form=el('form',{class:'access-event-filters'}),type=el('select',{class:'select','aria-label':'Loại truy cập'},[['','Tất cả hoạt động'],['login','Đăng nhập'],['page','Mở trang'],['logout','Đăng xuất']].map(([value,text])=>el('option',{value,text})));type.value=eventType;
 const start=el('input',{class:'input',type:'date','aria-label':'Từ ngày',value:from}),end=el('input',{class:'input',type:'date','aria-label':'Đến ngày',value:to});
 form.append(el('label',{},['Hoạt động',type]),el('label',{},['Từ ngày',start]),el('label',{},['Đến ngày',end]),el('button',{class:'btn btn-secondary',type:'submit',text:'Lọc'}));form.onsubmit=event=>{event.preventDefault();eventType=type.value;from=start.value;to=end.value;historyPage=1;loadHistory();};
 const list=el('ol',{class:'access-timeline','aria-label':'Các lần truy cập'});
 for(const item of data.items){const page=item.event_type==='page',title=page?data.page_labels[item.page_key]||'Mở trang':item.event_type==='login'?'Đăng nhập thành công':'Đăng xuất',course=item.course_id?.startsWith('hsk-')?'HSK '+item.course_id.slice(4):item.course_id?.startsWith('grade-')?'Lớp '+item.course_id.slice(6):'';
  list.append(el('li',{class:'access-event access-event-'+item.event_type},[el('span',{class:'access-event-icon','aria-hidden':'true',text:page?'▤':item.event_type==='login'?'↪':'↩'}),el('div',{},[el('time',{text:time(item.last_seen_at)}),el('h3',{text:title}),p([devices[item.device_type]||'Thiết bị',item.browser,course].filter(Boolean).join(' · ')),...(item.visits_count>1?[p(item.visits_count+' lượt mở cùng trang trong phút này','access-repeat')]:[])])]));
 }
 if(!data.items.length)list.append(el('li',{class:'access-empty'},[el('span',{'aria-hidden':'true',text:'◷'}),el('h3',{text:'Chưa có lượt truy cập được ghi nhận'}),p(from||to||eventType?'Bạn thử đổi khoảng ngày hoặc loại hoạt động.':'Nhật ký xuất hiện khi tài khoản đăng nhập hoặc mở trang sau lúc chức năng được bật.')]));
 const pagination=el('nav',{class:'access-pagination','aria-label':'Trang nhật ký'}),prev=el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'← Trước',onclick:()=>{historyPage--;loadHistory();}}),next=el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Sau →',onclick:()=>{historyPage++;loadHistory();}});prev.disabled=historyPage<=1;next.disabled=historyPage>=pages;pagination.append(prev,el('span',{text:historyPage+'/'+pages}),next);host.replaceChildren(head,form,list,pagination);
}
$('access-search').onsubmit=event=>{event.preventDefault();accountPage=1;loadAccounts(false);};$('access-role').onchange=()=>{accountPage=1;loadAccounts(false);};$('access-refresh').onclick=()=>loadAccounts();$('access-prev').onclick=()=>{accountPage--;loadAccounts(false);};$('access-next').onclick=()=>{accountPage++;loadAccounts(false);};
initPage('admin','access-history').then(profile=>{$('access-role-wrap').hidden=!isSuperAdmin(profile);return loadAccounts();}).catch(notice);
