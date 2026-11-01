import {api,el,formatDate} from './api.js';
import {initPage} from './ui-core.js';
import {enterCourse} from './course-context.js';
const grid=document.querySelector('#course-grid'),orders=document.querySelector('#course-orders'),dialog=document.querySelector('#course-dialog'),detail=document.querySelector('#course-detail'),notice=document.querySelector('#course-notice');
const status={pending:'⏳ Chờ admin xác nhận',approved:'✓ Đã xác nhận',rejected:'Chưa được xác nhận',cancelled:'Đã hủy'};
const money=v=>v==null?'Đang cập nhật học phí':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(v);
let courses=[],filter='';
const button=(text,fn,primary=false)=>el('button',{type:'button',class:'btn '+(primary?'btn-primary':'btn-ghost'),text,onclick:fn});
function renderCourses(){
 grid.replaceChildren(...courses.filter(c=>!filter||c.kind===filter).map(c=>el('article',{class:'course-tile'},[
  el('span',{class:'course-lock'+(c.unlocked?' open':''),text:c.unlocked?'✓ Đã mở khóa':c.order_status==='pending'?'⏳ Chờ xác nhận':c.revoked_at?'🔒 Đã thu hồi':c.expires_at&&new Date(c.expires_at)<=new Date()?'🔒 Hết hạn':'🔒 Chưa mở khóa'}),
  el('img',{src:'/assets/images/mascot-'+(c.kind==='primary'?'owl':'panda')+'.svg',alt:'',width:86,height:92}),
  el('h3',{text:c.title}),el('p',{text:c.description}),el('p',{class:'course-price',text:money(c.price_vnd)}),el('p',{text:c.duration_days?c.duration_days+' ngày kể từ khi được duyệt':'Quyền học vĩnh viễn'}),
  ...(c.unlocked&&c.expires_at?[el('p',{text:'Học đến '+formatDate(c.expires_at,false)})]:[]),
  button(c.unlocked?'Vào học':'Xem khóa học',()=>c.unlocked?enterCourse(c):showCourse(c),Boolean(c.unlocked)),
 ])));
}
function showCourse(c){
 const error=el('p',{class:'course-form-error',role:'alert'});
 detail.replaceChildren(el('h2',{text:c.title}),el('p',{text:c.description}),el('p',{class:'course-price',text:money(c.price_vnd)}),el('p',{text:c.duration_days?'Thời hạn: '+c.duration_days+' ngày sau khi admin xác nhận.':'Thời hạn: vĩnh viễn.'}));
 const pending=c.order_status==='pending';
 if(pending)detail.append(el('p',{text:'Yêu cầu đang chờ admin kiểm tra thanh toán. Con xem trạng thái tại mục Đăng ký của con.'}));
 else if(c.price_vnd==null||!c.payment_instructions.trim()||!c.active)detail.append(el('p',{text:'Khóa học đang chờ admin cập nhật thông tin thanh toán hoặc đang tạm ngừng. Con vui lòng liên hệ quản trị viên.'}));
 else {
  detail.append(el('h3',{text:'Hướng dẫn thanh toán'}),el('div',{class:'payment-instructions',text:c.payment_instructions}),el('p',{text:'Sau khi chuyển khoản, phụ huynh điền thông tin bên dưới. Khóa học chỉ mở khi admin đối soát và xác nhận.'}));
  const form=el('form',{class:'course-form'});
  for(const [name,label,max]of [['payer_name','Tên người chuyển khoản',120],['payment_reference','Mã giao dịch / nội dung chuyển khoản',150],['note','Ghi chú thêm (không bắt buộc)',1000]])form.append(el('label',{},[el('span',{text:label}),el(name==='note'?'textarea':'input',{name,maxlength:max,...(name!=='note'?{required:'',minlength:name==='payer_name'?2:3}:{})})]));
  const submit=el('button',{type:'submit',class:'btn btn-primary',text:'Gửi yêu cầu xác nhận'});form.append(error,submit);
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;error.textContent='';try{await api('/api/v1/courses/orders',{method:'POST',body:{course_id:c.id,...Object.fromEntries(new FormData(form))}});dialog.close();notice.textContent='Đã gửi yêu cầu. Khóa học sẽ mở sau khi admin xác nhận thanh toán.';await refresh();}catch(e){error.textContent=e.message;}finally{submit.disabled=false;}};
  detail.append(form);
 }
 dialog.showModal();
}
async function refresh(){
 const [catalog,history]=await Promise.all([api('/api/v1/courses'),api('/api/v1/courses/orders')]);courses=catalog.data;renderCourses();
 orders.replaceChildren(...(history.data.length?history.data.map(o=>el('article',{class:'course-order'},[
  el('div',{},[el('strong',{text:o.title}),el('p',{text:money(o.amount_vnd)+' · '+formatDate(o.created_at)}),el('p',{text:'Mã đăng ký: '+o.id}),...(o.review_note?[el('p',{text:'Admin: '+o.review_note})]:[])]),
  el('span',{class:'course-status',text:status[o.status]}),
  ...(o.status==='pending'?[button('Hủy yêu cầu',async event=>{const b=event.currentTarget;b.disabled=true;try{await api('/api/v1/courses/orders/'+o.id+'/cancel',{method:'POST'});await refresh();}catch(e){notice.textContent=e.message;}finally{b.disabled=false;}})]:[]),
 ])):[el('p',{class:'muted',text:'Chưa có yêu cầu đăng ký. Chọn khóa học để xem nội dung và hướng dẫn.'})]));
}
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{filter=b.dataset.kind;document.querySelectorAll('[data-kind]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));document.querySelector('#course-heading').textContent=filter==='primary'?'Khóa học Tiểu học':'Khóa học Tiếng Trung';renderCourses();});
document.querySelector('#all-courses').onclick=()=>{filter='';document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed','false'));document.querySelector('#course-heading').textContent='Tất cả khóa học';renderCourses();};
document.querySelector('.dialog-close').onclick=()=>dialog.close();
document.querySelector('#refresh-orders').onclick=()=>refresh().catch(e=>notice.textContent=e.message);
initPage('student','courses').then(async()=>{const params=new URLSearchParams(location.search);if(params.has('locked'))notice.textContent='Khóa học này chưa được mở hoặc đã hết hạn. Con chọn khóa học để đăng ký nhé!';await refresh();const kind=params.get('program');if(['primary','chinese'].includes(kind))document.querySelector('[data-kind='+kind+']').click();}).catch(e=>notice.textContent=e.message);
