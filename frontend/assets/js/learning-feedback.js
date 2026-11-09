import {api,el} from './api.js';
export const feedbackLabels={question:'Sai hoặc khó hiểu nội dung câu hỏi',answer:'Đáp án hoặc lời giải chưa đúng',audio:'Không nghe được / đọc chưa đúng',image:'Hình ảnh thiếu hoặc chưa đúng',display:'Giao diện / nút bấm bị lỗi',account:'Đăng nhập / tài khoản',payment:'Khóa học / thanh toán',suggestion:'Đề xuất cải thiện',other:'Lỗi khác'};
export const feedbackStatuses={open:'Đã tiếp nhận',reviewing:'Đang xem xét',resolved:'Đã xử lý'};
export function setupFeedback(profile){
 if(document.getElementById('feedback-open'))return;
 const css=el('link',{rel:'stylesheet',href:'/assets/css/study-hub.css'});document.head.append(css);
 const trigger=el('button',{id:'feedback-open',type:'button',class:'btn btn-ghost btn-sm',text:'Góp ý / Báo lỗi'});
 if(profile.role==='student'){trigger.textContent='?';trigger.setAttribute('aria-label','Góp ý / Báo lỗi');trigger.title='Góp ý / Báo lỗi';}
 (document.querySelector('.topbar-user')||document.querySelector('main')||document.body).append(trigger);
 const safePath=()=>{const p=new URLSearchParams();for(const key of ['set','attempt','session','topic','mode','view','subject','level']){const value=new URLSearchParams(location.search).get(key);if(value)p.set(key,value);}return location.pathname+(p.size?'?'+p:'');};
 function open(context=''){
  const dialog=el('dialog',{class:'feedback-dialog','aria-label':'Góp ý và phản ánh lỗi'}),status=el('p',{role:'status'}),list=el('div');
  const category=el('select',{'aria-label':'Loại phản ánh',required:true},Object.entries(feedbackLabels).map(([value,text])=>el('option',{value,text}))),message=el('textarea',{'aria-label':'Mô tả vấn đề',required:true,minlength:5,maxlength:4000,rows:5,placeholder:'Bạn gặp vấn đề gì? Đã bấm nút nào? Mong muốn sửa như thế nào?'});
  const send=el('button',{type:'submit',class:'btn btn-primary',text:'Gửi phản ánh'}),form=el('form',{},[el('label',{},[el('span',{text:'Bạn muốn phản ánh điều gì?'}),category]),el('label',{},[el('span',{text:'Mô tả vấn đề (ít nhất 5 ký tự)'}),message]),...(context?[el('p',{class:'muted',text:'Câu đang xem: '+context})]:[]),el('p',{class:'muted',text:'Trang hiện tại sẽ được gửi kèm. Không nhập mật khẩu hoặc thông tin thanh toán.'}),send]);
  const close=el('button',{type:'button',class:'btn btn-ghost',text:'Đóng',onclick:()=>dialog.close()});
  form.onsubmit=async e=>{e.preventDefault();send.disabled=true;status.textContent='Đang gửi…';try{await api('/api/v1/feedback',{method:'POST',body:{category:category.value,message:message.value,page_url:safePath(),context_text:context.slice(0,2000),scope:profile.course?.kind|| (location.pathname.includes('/chinese/')?'chinese':'general')}});status.textContent='Đã gửi. Bạn có thể xem phản hồi trong “Phản ánh của tôi”.';message.value='';}catch(e){status.textContent=e.message;}finally{send.disabled=false;}};
  const history=el('button',{type:'button',class:'btn btn-ghost',text:'Phản ánh của tôi',onclick:async()=>{history.disabled=true;try{const {data}=await api('/api/v1/feedback');list.replaceChildren(...data.map(r=>el('article',{class:'hub-card'},[el('strong',{text:feedbackLabels[r.category]||r.category}),el('p',{text:r.message}),el('small',{text:feedbackStatuses[r.status]+' · '+new Date(r.created_at).toLocaleDateString('vi-VN')}),...(r.reply?[el('p',{text:'Quản trị viên: '+r.reply})]:[])])));if(!data.length)list.textContent='Bạn chưa gửi phản ánh nào.';}catch(e){status.textContent=e.message;}finally{history.disabled=false;}}});
  dialog.append(el('h2',{text:'Góp ý / Báo lỗi'}),form,status,history,list,close);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();category.focus();
 }
 trigger.onclick=()=>open();
 const prompts='.question-prompt,.quiz-prompt,.worksheet-prompt,.study-prompt,.applied-practice>h2,.applied-hanzi,.review-item>strong';
 const enhance=()=>{document.querySelectorAll(prompts).forEach(prompt=>{const anchor=prompt.closest('button,label')||prompt;if(anchor.parentElement.querySelector(':scope > .question-feedback'))return;const b=el('button',{type:'button',class:'question-feedback btn btn-ghost btn-sm',text:'Phản ánh câu này',onclick:()=>open((prompt.closest('.applied-practice')?.textContent||prompt.textContent).trim())});anchor.after(b);
  if(!anchor.parentElement.querySelector('.hub-hint')&&!prompt.closest('.applied-practice')&&!anchor.classList.contains('flashcard'))b.after(el('details',{class:'hub-hint'},[el('summary',{text:'Gợi ý cách làm'}),el('p',{text:'Nghe hoặc đọc lại đề, tìm điều câu hỏi yêu cầu. Với câu dài, chia thành từng ý nhỏ; so sánh từng lựa chọn trước khi trả lời.'})]));
 });};
 const observer=new MutationObserver(enhance);observer.observe(document.querySelector('main')||document.body,{childList:true,subtree:true});enhance();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
