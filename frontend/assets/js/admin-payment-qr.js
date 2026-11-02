import {api,el} from './api.js';
import {paymentQrView} from './payment-qr-view.js';
const form=document.querySelector('#payment-qr-form'),preview=document.querySelector('#payment-qr-preview'),notice=document.querySelector('#admin-course-notice');
let files=[];
function showPreview(){
 const key=form.elements.course_key.value,own=files.find(f=>f.course_key===key),shared=files.find(f=>f.course_key==='default');
 const selected=own||shared;
 preview.replaceChildren(el('p',{text:selected?(own?'QR đã lưu cho lựa chọn này.':'Khóa này đang dùng QR chung. Tải ảnh lên để dùng QR riêng.'):'Chưa có QR. Admin có thể tải ảnh QR nhận tiền từ ứng dụng ngân hàng.'}));
 if(selected)preview.append(paymentQrView('/api/v1/courses/payment-qr/'+encodeURIComponent(key)+'?v='+Date.now(),selected.crop_json,'Ảnh QR thanh toán đã lưu'));
 document.querySelector('#delete-payment-qr').disabled=!own;
}
export async function refreshPaymentQr(courses){
 const current=form.elements.course_key.value||'default';
 form.elements.course_key.replaceChildren(el('option',{value:'default',text:'QR chung cho tất cả khóa'}),...courses.map(c=>el('option',{value:c.id,text:'QR riêng: '+c.title})));
 form.elements.course_key.value=current;
 files=(await api('/api/v1/courses/admin/payment-qr')).data;showPreview();
}
form.elements.course_key.onchange=showPreview;
form.onsubmit=async event=>{
 event.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;
 try{
  const file=form.elements.qr.files[0];if(!file)throw new Error('Chọn ảnh QR trước khi lưu.');
  if(file.size>2*1024*1024)throw new Error('Ảnh QR tối đa 2 MB.');
  const body=new FormData();body.append('qr',file);
  await api('/api/v1/courses/admin/payment-qr/'+encodeURIComponent(form.elements.course_key.value),{method:'POST',body});
  files=(await api('/api/v1/courses/admin/payment-qr')).data;form.elements.qr.value='';showPreview();notice.textContent='Đã lưu ảnh QR. Học sinh sẽ thấy ảnh này khi đăng ký khóa tương ứng.';
 }catch(e){notice.textContent=e.message;}finally{submit.disabled=false;}
};
document.querySelector('#delete-payment-qr').onclick=async event=>{
 const key=form.elements.course_key.value;if(!confirm('Xóa ảnh QR đã lưu cho lựa chọn này?'))return;
 const b=event.currentTarget;b.disabled=true;
 try{await api('/api/v1/courses/admin/payment-qr/'+encodeURIComponent(key),{method:'DELETE'});files=(await api('/api/v1/courses/admin/payment-qr')).data;showPreview();notice.textContent='Đã xóa ảnh QR.';}catch(e){notice.textContent=e.message;b.disabled=false;}
};
