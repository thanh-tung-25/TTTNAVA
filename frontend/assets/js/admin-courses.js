import {api,el,formatDate} from './api.js';
import {initPage} from './ui-core.js';
import {refreshPaymentQr} from './admin-payment-qr.js';
import './admin-course-tabs.js';
import {renderEnrollments} from './admin-enrollments.js';
import {isSuperAdmin} from './admin-permissions.js';
const notice=document.querySelector('#admin-course-notice');let courses=[],orders=[],canConfigure=false;
const money=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n);
const labels={pending:'Chờ xác nhận',approved:'Đã duyệt',rejected:'Đã từ chối',cancelled:'Đã hủy'};
const field=(label,name,value,type='text',required=false)=>el('label',{},[el('span',{text:label}),el(type==='textarea'?'textarea':'input',{name,...(type!=='textarea'?{type}:{}),value:type==='textarea'?undefined:value,...(required?{required:''}:{}),...(type==='number'?{min:'0',max:name==='duration_days'?'3650':'100000000'}:{maxlength:name==='title'?120:5000})},type==='textarea'?[value]:[])]);
function formAction(form,fn){form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;notice.textContent='';try{await fn(Object.fromEntries(new FormData(form)));notice.textContent='Đã lưu thành công.';await refresh();}catch(error){notice.textContent=error.message;notice.scrollIntoView({block:'center',behavior:'smooth'});}finally{b.disabled=false;}};}
function renderCatalog(){
 document.querySelector('#admin-course-catalog').replaceChildren(...courses.map(c=>{
  const form=el('form',{class:'course-form'},[
   field('Tên khóa học','title',c.title,'text',true),field('Giới thiệu','description',c.description,'textarea'),
   field('Giá (VNĐ; trống = chưa cấu hình)','price_vnd',c.price_vnd??'','number'),field('Thời hạn ngày (trống = vĩnh viễn)','duration_days',c.duration_days??'','number'),field('Hướng dẫn thanh toán','payment_instructions',c.payment_instructions,'textarea'),
   el('label',{},[el('span',{text:'Trạng thái'}),el('select',{name:'active'},[el('option',{value:'true',text:'Đang mở',...(c.active?{selected:''}:{})}),el('option',{value:'false',text:'Tạm ngừng',...(!c.active?{selected:''}:{})})])]),el('button',{type:'submit',class:'btn',text:'Lưu cấu hình'}),
  ]);
  formAction(form,d=>api('/api/v1/courses/admin/catalog/'+c.id,{method:'PATCH',body:{...d,price_vnd:d.price_vnd===''?null:Number(d.price_vnd),duration_days:d.duration_days===''?null:Number(d.duration_days),active:d.active==='true'}}));
  return el('details',{class:'card'},[el('summary',{},[el('strong',{text:c.title+' · '+(c.price_vnd==null?'Chưa đặt giá':money(c.price_vnd))})]),form]);
 }));
}
function renderOrders(){
 const filter=document.querySelector('#order-filter').value;
 const rows=orders.filter(o=>filter==='all'||o.status==='pending');
 document.querySelector('#admin-course-orders').replaceChildren(...(rows.length?rows.map(o=>{
  const note=el('textarea',{placeholder:'Ghi chú đối soát / lý do từ chối (bắt buộc)',maxlength:1000,'aria-label':'Ghi chú cho yêu cầu '+o.id});
  const box=el('article',{class:'admin-order'},[el('strong',{text:o.title+' — '+money(o.amount_vnd)}),el('p',{text:o.display_name+' (@'+o.username+') · '+labels[o.status]}),el('p',{text:'Chuyển khoản: '+o.payment_reference}),el('details',{class:'admin-extra'},[el('summary',{text:'Xem chi tiết đăng ký'}),el('p',{text:'Người chuyển: '+o.payer_name}),el('p',{text:'Ngày gửi: '+formatDate(o.created_at)}),el('p',{text:'Thời hạn: '+(o.duration_days?o.duration_days+' ngày':'Vĩnh viễn')}),el('p',{text:'Mã đơn: '+o.id}),el('p',{class:'course-admin-note',text:o.note||''})]),...(o.review_note?[el('p',{text:'Kết quả: '+o.review_note+' · '+(o.reviewer||'')})]:[])]);
  if(o.status==='pending'){
   const actions=el('div',{class:'order-actions'}),notes=el('details',{class:'admin-extra'},[el('summary',{text:'Thêm ghi chú / lý do từ chối'}),note]);box.append(notes,actions);
   for(const [decision,label]of [['approved','Mở khóa'],['rejected','Từ chối']])actions.append(el('button',{type:'button',class:'btn '+(decision==='rejected'?'btn-ghost':''),text:label,onclick:async()=>{
    if(decision==='rejected'&&!note.value.trim()){notice.textContent='Nhập lý do từ chối để học sinh biết.';notes.open=true;note.focus();return;}
    if(!confirm((decision==='approved'?'Xác nhận đã nhận đúng số tiền và mở khóa cho ':'Từ chối yêu cầu của ')+o.username+'?'))return;
    actions.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await api('/api/v1/courses/admin/orders/'+o.id+'/review',{method:'POST',body:{decision,note:note.value.trim()||'Đã đối soát và xác nhận thanh toán.'}});notice.textContent='Đã xử lý yêu cầu.';await refresh();}catch(e){notice.textContent=e.message;actions.querySelectorAll('button').forEach(b=>b.disabled=false);}
   }}));
  }return box;
 }):[el('div',{class:'admin-order-empty'},[el('img',{src:'/assets/images/mascot-lion.svg',alt:'',width:90,height:98}),el('strong',{text:'Chưa có đăng ký cần duyệt'}),el('p',{text:'Khi học sinh gửi đăng ký, yêu cầu sẽ xuất hiện ở đây.'})])]));
}
async function refresh(){
 const [requests,enrollments,audit,catalog]=await Promise.all(['orders','enrollments','audit',...(canConfigure?['catalog']:[])].map(path=>api('/api/v1/courses/admin/'+path)));
 orders=requests.data;renderOrders();
 if(canConfigure){
  courses=catalog.data;renderCatalog();await refreshPaymentQr(courses);
  const instructions=document.querySelector('#payment-settings textarea');if(!instructions.value)instructions.value=courses[0]?.payment_instructions||'';
 }
 document.dispatchEvent(new Event('courses:orders-changed'));
 renderEnrollments(enrollments.data,canConfigure?async(e,b)=>{
  if(!confirm('Thu hồi quyền học '+e.title+' của '+e.username+'? Học sinh sẽ không vào được khóa này.'))return;
  b.disabled=true;
  try{await api('/api/v1/courses/admin/access',{method:'POST',body:{username:e.username,course_id:e.course_id,action:'revoke',note:'Admin thu hồi từ danh sách khóa đã mở.'}});notice.textContent='Đã thu hồi quyền học.';await refresh();}catch(error){notice.textContent=error.message;b.disabled=false;}
 }:null);
 document.querySelector('#admin-course-audit').replaceChildren(...audit.data.map(a=>el('p',{text:formatDate(a.created_at)+' · '+(a.actor||'Hệ thống')+' · '+a.username+' · '+a.title+' · '+a.action+' · '+a.note})));
}
formAction(document.querySelector('#payment-settings'),d=>api('/api/v1/courses/admin/payment-instructions',{method:'POST',body:d}));
document.querySelector('#order-filter').onchange=renderOrders;
document.querySelector('#admin-refresh').onclick=()=>refresh().catch(e=>notice.textContent=e.message);
initPage('admin','courses').then(async profile=>{
 canConfigure=isSuperAdmin(profile);document.querySelector('#tab-settings').hidden=!canConfigure;
 if(!canConfigure){
  document.title='Đăng ký Tiếng Trung — TTNAVA';
  document.querySelector('.admin-course-heading h1').textContent='Duyệt đăng ký Tiếng Trung';
  document.querySelector('.admin-course-heading h1 + p').textContent='Xét duyệt đăng ký các học phần HSK và theo dõi quyền học của học sinh.';
 }
 await refresh();
}).catch(e=>notice.textContent=e.message);
