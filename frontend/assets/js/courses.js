import {api,el,formatDate} from './api.js';
import {initPage} from './ui-core.js';
import {enterCourse} from './course-context.js';
import {paymentQrView} from './payment-qr-view.js';
const grid=document.querySelector('#course-grid'),orders=document.querySelector('#course-orders'),dialog=document.querySelector('#course-dialog'),detail=document.querySelector('#course-detail'),notice=document.querySelector('#course-notice');
const status={pending:'⏳ Chờ admin xác nhận',approved:'✓ Đã xác nhận',rejected:'Chưa được xác nhận',cancelled:'Đã hủy'};
const money=v=>v==null?'Đang cập nhật học phí':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(v);
let courses=[],filter='',profile;
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
 const heading=el('header',{class:'checkout-heading'},[
  el('div',{},[el('p',{class:'checkout-eyebrow',text:'ĐĂNG KÝ KHÓA HỌC'}),el('h2',{id:'checkout-title',text:c.title}),el('p',{class:'checkout-description',text:c.description})]),
  el('div',{class:'checkout-price'},[el('strong',{text:money(c.price_vnd)}),el('span',{text:c.duration_days?c.duration_days+' ngày sau khi xác nhận':'Học trọn đời · Thanh toán một lần'})]),
 ]);
 detail.replaceChildren(heading);dialog.setAttribute('aria-labelledby','checkout-title');
 const pending=c.order_status==='pending';
 if(pending)detail.append(el('p',{class:'checkout-message',text:'Yêu cầu đang chờ admin kiểm tra thanh toán. Bạn có thể xem trạng thái tại mục Đăng ký của con.'}));
 else if(c.price_vnd==null||!c.payment_instructions.trim()||!c.active)detail.append(el('p',{class:'checkout-message',text:'Khóa học đang chờ cập nhật thông tin thanh toán. Vui lòng liên hệ quản trị viên.'}));
 else {
  const reference='TTNAVA '+profile.username+' '+c.id;
  const scan=el('section',{class:'checkout-scan'},[el('span',{class:'checkout-step',text:'1 · CHUYỂN KHOẢN'}),el('h3',{text:'Quét mã để thanh toán'})]);
  if(c.has_payment_qr)scan.append(el('figure',{class:'payment-qr-box'},[paymentQrView('/api/v1/courses/payment-qr/'+encodeURIComponent(c.id)+'?v='+Date.now(),c.payment_qr_crop,'QR nhận thanh toán của admin cho '+c.title),el('figcaption',{text:'Mở ứng dụng ngân hàng để quét mã'})]));
  else scan.append(el('p',{class:'muted',text:'Chuyển khoản theo thông tin người nhận bên cạnh.'}));
  scan.append(el('p',{class:'checkout-scan-note',text:'Kiểm tra đúng người nhận, số tiền và nội dung trước khi xác nhận trên ứng dụng ngân hàng.'}));
  const right=el('div',{class:'checkout-information'});
  const recipient=el('section',{class:'checkout-recipient'},[el('span',{class:'checkout-label',text:'THÔNG TIN NHẬN TIỀN'}),el('div',{class:'payment-instructions',text:c.payment_instructions})]);
  const copy=button('Sao chép',async()=>{try{await navigator.clipboard.writeText(reference);copy.textContent='Đã sao chép';}catch{error.textContent='Bạn có thể chọn và sao chép nội dung chuyển khoản bên trên.';}});
  recipient.append(el('div',{class:'payment-summary'},[el('div',{class:'checkout-amount'},[el('span',{text:'Số tiền cần chuyển'}),el('strong',{text:money(c.price_vnd)})]),el('span',{class:'checkout-label',text:'NỘI DUNG CHUYỂN KHOẢN'}),el('div',{class:'checkout-reference'},[el('code',{text:reference}),copy])]));
  const form=el('form',{class:'course-form checkout-confirm'});
  form.append(el('span',{class:'checkout-step',text:'2 · SAU KHI CHUYỂN KHOẢN'}),el('h3',{text:'Gửi thông tin xác nhận'}));
  const fields=el('div',{class:'checkout-fields'});
  for(const [name,label,max,placeholder]of [['payer_name','Tên người chuyển khoản',120,'Họ và tên chủ tài khoản'],['payment_reference','Mã giao dịch / nội dung chuyển khoản',150,'Mã giao dịch hoặc nội dung đã ghi']])fields.append(el('label',{},[el('span',{text:label}),el('input',{name,maxlength:max,required:'',minlength:name==='payer_name'?2:3,placeholder,autocomplete:name==='payer_name'?'name':'off'})]));
  form.append(fields,el('details',{class:'checkout-note'},[el('summary',{text:'Thêm ghi chú (không bắt buộc)'}),el('textarea',{name:'note',maxlength:1000,'aria-label':'Ghi chú thêm',placeholder:'Thông tin cần nhắn cho admin…'})]));
  const submit=el('button',{type:'submit',class:'btn btn-primary',text:'Gửi yêu cầu xác nhận'});form.append(error,submit,el('p',{class:'checkout-approval',text:'Khóa học được mở sau khi admin kiểm tra và xác nhận khoản thanh toán.'}));
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;error.textContent='';try{await api('/api/v1/courses/orders',{method:'POST',body:{course_id:c.id,...Object.fromEntries(new FormData(form))}});dialog.close();notice.textContent='Đã gửi yêu cầu. Khóa học sẽ mở sau khi admin xác nhận thanh toán.';await refresh();}catch(e){error.textContent=e.message;}finally{submit.disabled=false;}};
  right.append(recipient,form);detail.append(el('div',{class:'checkout-layout'},[scan,right]));
 }
 dialog.showModal();dialog.scrollTop=0;
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
initPage('student','courses').then(async user=>{profile=user;const params=new URLSearchParams(location.search);if(params.has('locked'))notice.textContent='Khóa học này chưa được mở hoặc đã hết hạn. Con chọn khóa học để đăng ký nhé!';await refresh();const kind=params.get('program');if(['primary','chinese'].includes(kind))document.querySelector('[data-kind='+kind+']').click();}).catch(e=>notice.textContent=e.message);
