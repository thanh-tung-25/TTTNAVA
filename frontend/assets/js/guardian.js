import {api} from './api.js';
import {request,el,card,action,input,message} from './experience-ui.js';
const root=document.getElementById('experience-root');
async function report(id){
 const courses=await request('/guardian/children/'+id+'/courses'),select=el('select',{class:'select','aria-label':'Khóa học của con'},courses.map(c=>el('option',{value:c.id,text:c.title}))),out=el('div');
 const load=async()=>{if(!select.value){out.textContent='Chưa có khóa học đang mở.';return;}const r=await request('/guardian/children/'+id+'/report?courseId='+encodeURIComponent(select.value));out.replaceChildren(card('7 ngày của '+r.child.display_name,el('p',{text:r.summary.completed+' lượt hoàn thành · '+r.summary.active_days+' ngày học · Điểm trung bình '+(r.summary.average??'chưa có')}),el('p',{text:r.note}),...r.recent.map(a=>el('p',{text:a.title+' · '+(a.completed_at?'Đã hoàn thành':'Đang học')+(a.score!=null?' · '+a.score+'/100':'')}))));};
 select.onchange=()=>load().catch(e=>message(e.message,true));root.append(card('Báo cáo học tập',select,out));await load();
}
async function main(){
 const {data:{profile}}=await api('/api/v1/auth/me');if(profile.role!=='student'){location.replace('/');return;}
 document.getElementById('app-header').replaceChildren(el('div',{class:'experience-row'},[el('strong',{text:'TTNAVA · '+profile.displayName}),action('Đăng xuất',async()=>{await api('/api/v1/auth/logout',{method:'POST'});location.replace('/pages/login/');})]));
 root.replaceChildren();message('');
 if(profile.accountKind!=='guardian'){root.append(card('Dành cho tài khoản phụ huynh',el('p',{text:'Phụ huynh đăng ký tài khoản riêng tại trang đăng ký chung, chọn “Phụ huynh” và xác minh Gmail. Học sinh tạo mã ghép trong Cá nhân → Liên kết phụ huynh.'}),el('a',{class:'btn',href:'/pages/student/home/',text:'Về góc học tập'})));return;}
 const code=input('Mã ghép do học sinh cung cấp',{maxlength:12,autocomplete:'off'});
 root.append(card('Liên kết với con',el('p',{text:'Nhập mã ghép, sau đó nhờ con xác nhận yêu cầu trong Cá nhân. Chỉ báo cáo học tập của tài khoản đã đồng ý mới được mở.'}),code.wrap,action('Gửi yêu cầu liên kết',async()=>{await request('/guardian/links',{method:'POST',body:{code:code.node.value}});await main();message('Đã gửi. Hãy nhờ học sinh kiểm tra và xác nhận.');},true)));
 const rows=await request('/guardian/links');for(const r of rows.filter(r=>r.guardian_id===profile.id)){root.append(card(r.student_name,el('p',{text:({pending:'Chờ học sinh xác nhận',accepted:'Đã được học sinh đồng ý',declined:'Học sinh đã từ chối',revoked:'Đã ngừng chia sẻ'})[r.status]}),...(r.status==='accepted'?[action('Xem báo cáo',()=>report(r.student_id),true)]:[]),action('Ngừng liên kết',async()=>{await request('/guardian/links/'+r.id,{method:'POST',body:{action:'revoke'}});await main();})));}
}
main().catch(e=>message(e.message,true));
