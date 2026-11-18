import {api,el,formatDate} from './api.js';
import {initPage} from './ui-core.js';
import './admin-course-tabs.js';
import {isSuperAdmin} from './admin-permissions.js';

const notice=document.querySelector('#admin-course-notice');
let courses=[],orders=[],enrollments=[],canConfigure=false;
const money=n=>n==null?'Chưa đặt giá':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n);
const p=text=>el('p',{text});
const button=(text,onclick,ghost=false)=>el('button',{type:'button',class:'btn '+(ghost?'btn-ghost':''),text,onclick});
const input=(label,name,value='',type='text',extra={})=>el('label',{},[el('span',{text:label}),el('input',{name,type,value,...extra})]);
const submit=text=>el('button',{type:'submit',class:'btn',text});
function formAction(form,action){form.onsubmit=async event=>{event.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;try{await action(Object.fromEntries(new FormData(form)));notice.textContent='Đã lưu thay đổi.';await refresh();}catch(e){notice.textContent=e.message;}finally{b.disabled=false;}};}
const localDate=value=>{const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const accessState=e=>e.revoked_at?'Đã thu hồi':new Date(e.starts_at)>new Date()?'Chưa bắt đầu':e.expires_at&&new Date(e.expires_at)<=new Date()?'Đã hết hạn':'Đang có quyền học';
function renderAccess(){
 const term=document.querySelector('#access-search').value.trim().toLocaleLowerCase('vi'),filter=document.querySelector('#access-filter').value;
 const rows=enrollments.filter(e=>(filter==='all'||e.access_category===filter)&&(!term||[e.username,e.display_name,e.title].join(' ').toLocaleLowerCase('vi').includes(term)));
 const host=document.querySelector('#admin-enrollments'),opened=new Set([...host.querySelectorAll('details[open]')].map(d=>d.dataset.learner));
 const groups=new Map();for(const row of rows){if(!groups.has(row.student_id))groups.set(row.student_id,[]);groups.get(row.student_id).push(row);}
 document.querySelector('#paid-count').textContent=enrollments.filter(e=>e.access_category==='paid').length+' quyền học đã thanh toán / chuyển tiếp';
 host.replaceChildren(...[...groups.values()].map(items=>{
  const first=items[0],group=el('details',{class:'learner-enrollments','data-learner':first.student_id,...(opened.has(first.student_id)?{open:''}:{})},[el('summary',{},[el('span',{class:'learner-name',text:first.display_name+' (@'+first.username+')'}),el('span',{class:'learner-course-count',text:items.length+' khóa'})])]);
  for(const e of items){
   const origin=e.paid_origin==='existing'?'Đã thanh toán · Quyền học chuyển tiếp':e.access_category==='paid'?'Đã thanh toán'+(e.paid_origin==='momo'?' · MoMo':''):'Admin cấp miễn phí';
   const row=el('div',{class:'course-admin-enrollment'},[el('div',{},[el('strong',{text:e.title}),p(origin),p(accessState(e)+' · '+(e.expires_at?'Đến '+formatDate(e.expires_at):'Không giới hạn thời hạn'))])]);
   if(canConfigure&&!e.revoked_at)row.append(button('Thu hồi',async event=>{
    if(!confirm('Thu hồi quyền học '+e.title+' của '+e.username+'? Dữ liệu học tập vẫn được giữ.'))return;
    const b=event.currentTarget;b.disabled=true;
    try{await api('/api/v1/courses/admin/access',{method:'POST',body:{username:e.username,course_id:e.course_id,action:'revoke',note:'Admin thu hồi quyền học từ danh sách.'}});notice.textContent='Đã thu hồi quyền học.';await refresh();}catch(error){notice.textContent=error.message;b.disabled=false;}
   },true));
   group.append(row);
  }return group;
 }));
 if(!rows.length)host.append(p('Chưa có quyền học phù hợp với bộ lọc.'));
}
function renderCatalog(){
 const host=document.querySelector('#admin-course-catalog'),opened=new Set([...host.querySelectorAll('details[open]')].map(d=>d.dataset.course));
 host.replaceChildren(...courses.map(c=>{
  const status=c.free_now?'Đang miễn phí đến '+formatDate(c.free_ends_at):c.free_starts_at?'Miễn phí từ '+formatDate(c.free_starts_at):'Đang bán qua MoMo';
  const paid=el('form',{class:'course-form'},[
   el('h3',{text:'1. Thanh toán MoMo'}),input('Tên khóa học','title',c.title,'text',{required:'',maxlength:120}),
   el('label',{},[el('span',{text:'Giới thiệu'}),el('textarea',{name:'description',maxlength:5000},[c.description])]),
   el('div',{class:'course-form-pair'},[input('Học phí (VNĐ)','price_vnd',c.price_vnd??'','number',{min:1000,max:50000000,step:1000}),input('Số ngày học · để trống nếu vĩnh viễn','duration_days',c.duration_days??'','number',{min:1,max:3650})]),
   el('label',{class:'course-check'},[el('input',{type:'checkbox',name:'active',...(c.active?{checked:''}:{})}),el('span',{text:'Cho phép sử dụng khóa học'})]),submit('Lưu học phí và thời hạn')
  ]);
  formAction(paid,d=>api('/api/v1/courses/admin/catalog/'+c.id,{method:'PATCH',body:{title:d.title,description:d.description,price_vnd:d.price_vnd===''?null:Number(d.price_vnd),duration_days:d.duration_days===''?null:Number(d.duration_days),active:d.active==='on'}}));
  const free=el('form',{class:'course-form free-period-form'},[
   el('h3',{text:'2. Đợt học miễn phí'}),p('Mọi học sinh có tài khoản được học trong thời gian này. Quyền đã thanh toán vẫn giữ nguyên.'),
   el('label',{class:'course-check'},[el('input',{type:'checkbox',name:'enabled',...(c.free_starts_at?{checked:''}:{})}),el('span',{text:'Mở đợt học miễn phí'})]),
   el('div',{class:'course-form-pair'},[input('Bắt đầu','starts_at',localDate(c.free_starts_at||Date.now()),'datetime-local'),input('Kết thúc','ends_at',localDate(c.free_ends_at||Date.now()+7*86400000),'datetime-local')]),submit('Lưu đợt miễn phí')
  ]);
  formAction(free,d=>api('/api/v1/courses/admin/catalog/'+c.id+'/free-period',{method:'PUT',body:d.enabled==='on'?{enabled:true,starts_at:new Date(d.starts_at).toISOString(),ends_at:new Date(d.ends_at).toISOString()}:{enabled:false}}));
  return el('details',{class:'card course-config-card','data-course':c.id,...(opened.has(c.id)?{open:''}:{})},[el('summary',{},[el('strong',{text:c.title}),el('span',{class:'course-config-caption',text:money(c.price_vnd)+' · '+status})]),paid,free]);
 }));
}
function renderOrders(){
 const filter=document.querySelector('#order-filter').value;
 const rows=orders.filter(o=>filter==='all'||o.status===filter);
 const labels={pending:'Chờ thanh toán',approved:'Đã thanh toán',rejected:'Đã từ chối',cancelled:'Đã hủy'};
 document.querySelector('#admin-course-orders').replaceChildren(...rows.map(o=>{
  const box=el('article',{class:'admin-order'},[el('strong',{text:o.title+' · '+money(o.amount_vnd)}),p(o.display_name+' (@'+o.username+') · '+labels[o.status]),p((o.momo_state?'MoMo':'Đăng ký chuyển khoản cũ')+' · '+formatDate(o.created_at)),el('details',{class:'admin-extra'},[el('summary',{text:'Chi tiết giao dịch'}),p('Mã đơn: '+o.id),p('Mã giao dịch: '+(o.transaction_id||o.payment_reference)),p(o.review_note||'Chưa có xác nhận thanh toán')])]);
  if(o.status==='pending'&&o.momo_state)box.append(button('Kiểm tra với MoMo',async event=>{const b=event.currentTarget;b.disabled=true;try{const {data}=await api('/api/v1/courses/admin/orders/'+o.id+'/check',{method:'POST'});notice.textContent=data.status==='approved'?'Đã nhận thanh toán và mở khóa.':'MoMo chưa xác nhận thanh toán thành công.';await refresh();}catch(e){notice.textContent=e.message;}finally{b.disabled=false;}},true));
  if(!o.momo_state)box.append(p('Bản ghi thanh toán cũ được giữ để xem lịch sử. Luồng chuyển khoản và duyệt tay đã ngừng sử dụng.'));
  return box;
 }));
 if(!rows.length)document.querySelector('#admin-course-orders').append(p('Chưa có giao dịch phù hợp.'));
}
async function refresh(){
 const paths=['orders','enrollments','audit',...(canConfigure?['catalog','momo']:[])];
 const data=await Promise.all(paths.map(path=>api('/api/v1/courses/admin/'+path).then(r=>r.data)));
 [orders,enrollments]=data;renderAccess();renderOrders();
 document.querySelector('#admin-course-audit').replaceChildren(...data[2].map(a=>p(formatDate(a.created_at)+' · '+(a.actor||'Hệ thống')+' · '+a.username+' · '+a.title+' · '+a.action+' · '+a.note)));
 if(canConfigure){courses=data[3];renderCatalog();renderMomo(data[4]);}
 document.dispatchEvent(new Event('courses:orders-changed'));
}
function renderMomo(c){
 const host=document.querySelector('#admin-momo');
 const form=el('form',{class:'course-form'},[
  el('div',{class:'momo-connection-status',text:c.needs_keys?'Cần nhập lại Access Key và Secret Key':c.ready?'Đã bật cấu hình nhận thanh toán MoMo':c.configured?'Đã lưu cấu hình · Chưa bật thanh toán thật':'Chưa kết nối · Bạn có thể thêm MoMo sau'}),
  input('Partner Code','partner_code',c.partner_code,'text',{required:'',autocomplete:'off',maxlength:64}),
  input('Access Key','access_key','','password',{autocomplete:'new-password',maxlength:200,placeholder:c.configured?'Đã lưu · để trống để giữ nguyên':'Nhập Access Key do MoMo cấp'}),
  input('Secret Key','secret_key','','password',{autocomplete:'new-password',maxlength:200,placeholder:c.configured?'Đã lưu · để trống để giữ nguyên':'Nhập Secret Key do MoMo cấp'}),
  el('label',{},[el('span',{text:'Môi trường kết nối'}),el('select',{name:'environment'},['production','sandbox'].map(mode=>el('option',{value:mode,text:mode==='production'?'Thanh toán thật (Production)':'Cấu hình thử (Sandbox)',...(c.environment===mode?{selected:''}:{})})))]),
  el('label',{class:'course-check'},[el('input',{type:'checkbox',name:'enabled',...(c.enabled?{checked:''}:{})}),el('span',{text:'Bật nhận thanh toán sau khi MoMo đã duyệt tài khoản'})]),
  p('Các khóa bí mật chỉ được lưu ở máy chủ dưới dạng mã hóa. Để trống hai ô khóa khi chỉ muốn đổi trạng thái bật/tắt.'),submit('Lưu kết nối MoMo')
 ]);
 formAction(form,d=>api('/api/v1/courses/admin/momo',{method:'PUT',body:{...d,enabled:d.enabled==='on'}}));
 host.replaceChildren(form,el('div',{class:'momo-ipn'},[el('strong',{text:'Địa chỉ nhận kết quả thanh toán (IPN)'}),el('code',{text:c.ipn_url}),button('Sao chép địa chỉ',async()=>{try{await navigator.clipboard.writeText(c.ipn_url);notice.textContent='Đã sao chép địa chỉ IPN.';}catch{notice.textContent='Bạn có thể chọn và sao chép địa chỉ bên trên.';}},true)]));
}
document.querySelector('#access-search').oninput=renderAccess;document.querySelector('#access-filter').onchange=renderAccess;document.querySelector('#order-filter').onchange=renderOrders;
document.querySelector('#admin-refresh').onclick=()=>refresh().catch(e=>notice.textContent=e.message);
initPage('admin','courses').then(async profile=>{canConfigure=isSuperAdmin(profile);for(const tab of document.querySelectorAll('[data-config-only]'))tab.hidden=!canConfigure;await refresh();}).catch(e=>notice.textContent=e.message);
