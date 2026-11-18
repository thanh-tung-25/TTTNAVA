import {api,el,formatDate} from './api.js';
import {initPage,setDiamondProgram} from './ui-core.js';
import {enterCourse} from './course-context.js';

const grid=document.querySelector('#course-grid'),orders=document.querySelector('#course-orders'),dialog=document.querySelector('#course-dialog'),detail=document.querySelector('#course-detail'),notice=document.querySelector('#course-notice');
let courses=[],historyRows=[],filter='',momoReady=false,watchId=null,watchTimer,freeTimer,watchBusy=false,lastCheck=0,watchUntil=0;
const money=value=>value==null?'Đang cập nhật học phí':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(value);
const p=(text,className='')=>el('p',{text,class:className});
const button=(text,fn,primary=false)=>el('button',{type:'button',class:'btn '+(primary?'btn-primary':'btn-ghost'),text,onclick:fn});
const labels={pending:'Chờ thanh toán',approved:'Đã thanh toán',rejected:'Đã từ chối',cancelled:'Đã hủy'};
function renderCourses(){
 grid.replaceChildren(...courses.filter(c=>!filter||c.kind===filter).map(c=>{
  const free=Boolean(c.free_now&&!c.revoked_at),individual=c.access_category==='admin_free',label=c.access_category==='paid'?'✓ Đã thanh toán':individual?'🎁 Được cấp miễn phí':c.access_category==='campaign'?'🎁 Đang miễn phí':c.unlocked?'✓ Đã mở khóa':c.grant_revoked_at?'Đã thu hồi miễn phí':c.grant_ends_at&&new Date(c.grant_ends_at)<=new Date()?'Hết hạn miễn phí':c.revoked_at?'Đã thu hồi':c.expires_at&&new Date(c.expires_at)<=new Date()?'Hết hạn':'Chưa mở khóa';
  const card=el('article',{class:'course-tile'},[
   el('span',{class:'course-lock'+(c.unlocked?' open':''),text:label}),el('img',{src:'/assets/images/mascot-'+(c.kind==='chinese'?'panda':'lion')+'.svg',alt:'',width:86,height:92}),
   el('h3',{text:c.title}),p(c.description),p(individual?'Được cấp miễn phí':free?'Đợt học miễn phí':money(c.price_vnd),'course-price'),
   p(c.access_category==='paid'||individual?(c.access_expires_at?'Quyền học đến '+formatDate(c.access_expires_at,false):'Quyền học không giới hạn thời hạn'):c.duration_days?c.duration_days+' ngày kể từ khi thanh toán thành công':'Thanh toán một lần · Học không giới hạn thời hạn'),
   ...(free?[p('Nhận đăng ký miễn phí đến '+formatDate(c.free_ends_at)+' · 1 năm từ ngày đăng ký','course-free-tag')]:c.free_starts_at?[p('Mở đăng ký miễn phí từ '+formatDate(c.free_starts_at),'course-free-tag')]:[]),
   ...(c.grant_id&&!c.grant_revoked_at&&new Date(c.grant_starts_at)>new Date()?[p('Được cấp miễn phí từ '+formatDate(c.grant_starts_at)+' đến '+formatDate(c.grant_ends_at),'course-free-tag')]:[]),
   button(c.unlocked?c.access_category==='campaign'?'Vào học miễn phí':'Vào học':'Xem khóa học',()=>c.unlocked?enterCourse(c):showCourse(c),Boolean(c.unlocked))
  ]);
  if(c.access_category==='campaign'||individual)card.append(el('button',{type:'button',class:'btn btn-ghost course-buy-extra',text:'Mua quyền học sau thời gian miễn phí',onclick:()=>showCourse(c)}));
  return card;
 }));
}
function showCourse(c){
 const error=p('','course-form-error'),box=el('section',{class:'momo-checkout'},[el('h3',{text:'Thanh toán qua MoMo'}),p('Mỗi lượt thanh toán có mã đơn riêng. Khóa học tự mở sau khi MoMo xác nhận giao dịch thành công.')]);
 detail.replaceChildren(el('header',{class:'checkout-heading'},[
  el('div',{},[p('ĐĂNG KÝ KHÓA HỌC','checkout-eyebrow'),el('h2',{id:'checkout-title',text:c.title}),p(c.description,'checkout-description')]),
  el('div',{class:'checkout-price'},[el('strong',{text:money(c.price_vnd)}),el('span',{text:c.duration_days?c.duration_days+' ngày sau thanh toán':'Thanh toán một lần · Không giới hạn thời hạn'})])
 ]),box);
 if(c.free_now)box.append(p('Đợt nhận đăng ký miễn phí kết thúc '+formatDate(c.free_ends_at)+'. Tài khoản đăng ký trong đợt được cấp 1 năm từ ngày đăng ký.'));
 if(c.access_category==='admin_free')box.append(p('Bạn được cấp miễn phí'+(c.access_expires_at?' đến '+formatDate(c.access_expires_at):'')+'. Quyền đã mua được giữ riêng khi thanh toán.'));
 if(!momoReady)box.append(p('Thanh toán MoMo đang chờ quản trị viên kết nối. Bạn vui lòng quay lại sau.','checkout-message'));
 else if(!c.active||c.price_vnd==null||Number(c.price_vnd)<1000||Number(c.price_vnd)>50000000)box.append(p('Khóa học đang chờ cập nhật học phí.','checkout-message'));
 else{
  const pay=button('Tiếp tục thanh toán MoMo',async()=>{
   pay.disabled=true;error.textContent='Đang tạo phiên thanh toán…';
   try{const {data}=await api('/api/v1/courses/orders',{method:'POST',body:{course_id:c.id}});
    if(data.status==='approved'){dialog.close();await refresh();notice.textContent='Khóa học đã được mở.';return;}
    if(data.pay_url){location.assign(data.pay_url);return;}
    error.textContent='Phiên thanh toán đang được tạo. Bạn đợi một chút rồi thử lại.';
   }catch(e){error.textContent=e.message;}finally{pay.disabled=false;}
  },true);box.append(pay,error,p('Bạn sẽ chuyển đến trang thanh toán MoMo để mở ứng dụng hoặc quét mã QR.'));
 }
 dialog.setAttribute('aria-labelledby','checkout-title');if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
}
async function checkPayment(id,manual=false){
 if(watchBusy)return;watchBusy=true;
 try{
  const query=manual||Date.now()-lastCheck>=30000;
  if(query)lastCheck=Date.now();
  const {data}=await api('/api/v1/courses/orders/'+encodeURIComponent(id)+(query?'/check':''),query?{method:'POST'}:{});
  if(data.status==='approved'){
   stopWatch();await refresh();notice.replaceChildren(p('Thanh toán thành công. Khóa học đã được mở.'),button('Vào học '+data.title,()=>enterCourse(courses.find(c=>c.id===data.course_id)),true));
  }else if(manual)notice.textContent='MoMo chưa xác nhận thanh toán thành công. Nếu bạn vừa thanh toán, hãy chờ một chút rồi kiểm tra lại.';
 }catch(e){if(manual)notice.textContent=e.message;}finally{watchBusy=false;}
}
function stopWatch(){clearInterval(watchTimer);watchId=null;}
function watchPayment(id){stopWatch();watchId=id;watchUntil=Date.now()+10*60000;lastCheck=0;checkPayment(id,true);watchTimer=setInterval(()=>{if(Date.now()>watchUntil){stopWatch();return;}if(!document.hidden)checkPayment(id);},5000);}
function renderHistory(){
 const paid=courses.filter(c=>c.paid_origin||c.source==='order');
 orders.replaceChildren(...paid.map(c=>el('article',{class:'course-order'},[
  el('div',{},[el('strong',{text:c.title}),p(c.paid_origin==='existing'?'Quyền học chuyển tiếp · Giữ nguyên các khóa và thời hạn đang có':'Quyền học đã thanh toán'),p(c.revoked_at?'Quyền học đã thu hồi':c.expires_at?'Thời hạn đến '+formatDate(c.expires_at):'Không giới hạn thời hạn')]),el('span',{class:'course-status',text:'✓ Đã thanh toán'}),...(c.unlocked?[button('Vào học',()=>enterCourse(c))]:[])
 ])),...historyRows.map(o=>{
  const actions=el('div',{class:'checkout-actions'}),box=el('article',{class:'course-order'},[el('div',{},[el('strong',{text:o.title}),p(money(o.amount_vnd)+' · '+formatDate(o.created_at)),p('Mã đơn: '+o.id),...(o.review_note?[p(o.review_note)]:[])]),el('span',{class:'course-status',text:labels[o.status]}),actions]);
  if(o.status==='pending'&&o.momo_state){
   if(o.pay_url)actions.append(el('a',{class:'btn btn-primary',href:o.pay_url,text:'Tiếp tục MoMo'}));
   else actions.append(button('Tạo lại phiên',()=>showCourse(courses.find(c=>c.id===o.course_id))));
   actions.append(button('Kiểm tra kết quả',()=>{watchPayment(o.id);notice.textContent='Đang kiểm tra thanh toán MoMo…';}));
  }else if(!o.momo_state)box.querySelector('div').append(p('Bản ghi trước đây được giữ trong lịch sử. Thanh toán mới sử dụng MoMo.'));
  if(o.status==='pending'&&o.momo_state)actions.append(button('Hủy đơn',async event=>{
   if(!confirm('Hủy đơn này? Nếu đã thanh toán, hãy chọn Kiểm tra kết quả trước.'))return;
   const b=event.currentTarget;b.disabled=true;try{await api('/api/v1/courses/orders/'+o.id+'/cancel',{method:'POST'});if(watchId===o.id)stopWatch();await refresh();}catch(e){notice.textContent=e.message;b.disabled=false;}
  }));return box;
 }));
 if(!paid.length&&!historyRows.length)orders.append(p('Chưa có giao dịch. Chọn một khóa để xem học phí hoặc lịch mở miễn phí.'));
}
async function refresh(){
 const [catalog,history,payment]=await Promise.all([api('/api/v1/courses'),api('/api/v1/courses/orders'),api('/api/v1/courses/payment-status')]);
 courses=catalog.data;historyRows=history.data;momoReady=payment.data.ready;renderCourses();renderHistory();
 clearTimeout(freeTimer);const next=courses.flatMap(c=>[c.free_starts_at,c.free_ends_at,c.grant_starts_at,c.grant_ends_at,c.access_expires_at]).filter(Boolean).map(v=>new Date(v).getTime()-Date.now()).filter(ms=>ms>0).sort((a,b)=>a-b)[0];
 if(next!=null)freeTimer=setTimeout(()=>refresh().catch(e=>notice.textContent=e.message),Math.min(next+500,2147483000));
}
function syncProgram(){setDiamondProgram(filter);const url=new URL(location.href);if(filter)url.searchParams.set('program',filter);else url.searchParams.delete('program');history.replaceState(null,'',url.pathname+url.search+url.hash);}
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{filter=b.dataset.kind;syncProgram();document.querySelectorAll('[data-kind]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));document.querySelector('#course-heading').textContent='Khóa học '+({primary:'Tiểu học',secondary:'THCS',chinese:'Tiếng Trung'}[filter]);renderCourses();});
document.querySelector('#all-courses').onclick=()=>{filter='';syncProgram();document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed','false'));document.querySelector('#course-heading').textContent='Tất cả khóa học';renderCourses();};
document.querySelector('.dialog-close').onclick=()=>dialog.close();document.querySelector('#refresh-orders').onclick=()=>refresh().catch(e=>notice.textContent=e.message);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(watchId)checkPayment(watchId);refresh().catch(()=>{});}});
window.addEventListener('pagehide',()=>{stopWatch();clearTimeout(freeTimer);},{once:true});
initPage('student','courses').then(async()=>{
 const params=new URLSearchParams(location.search);if(params.has('locked'))notice.textContent='Quyền học đã hết hạn hoặc khóa học chưa được mở. Bạn có thể xem lịch miễn phí và học phí bên dưới.';
 await refresh();const kind=params.get('program');if(['primary','secondary','chinese'].includes(kind))document.querySelector('[data-kind='+kind+']').click();
 const id=params.get('payment');if(id&&/^[0-9a-f-]{36}$/iu.test(id)){notice.textContent='Đang xác nhận kết quả thanh toán MoMo…';watchPayment(id);}
}).catch(e=>notice.textContent=e.message);
