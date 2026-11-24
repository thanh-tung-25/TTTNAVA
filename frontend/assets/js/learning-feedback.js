import {api,el,formatDate} from './api.js';
import {learningFeedbackContext} from './learning-feedback-context.js';
import {createFeedbackInbox} from './feedback-inbox.js';
export const feedbackLabels={question:'Sai hoặc khó hiểu nội dung câu hỏi',answer:'Đáp án hoặc lời giải chưa đúng',audio:'Không nghe được / đọc chưa đúng',image:'Hình ảnh thiếu hoặc chưa đúng',display:'Giao diện / nút bấm bị lỗi',account:'Đăng nhập / tài khoản',payment:'Khóa học / thanh toán',suggestion:'Đề xuất cải thiện',other:'Lỗi khác'};
export const feedbackStatuses={open:'Đã tiếp nhận',reviewing:'Đang xem xét',resolved:'Đã xử lý'};
export function setupFeedback(profile){
 if(document.getElementById('feedback-open'))return;
 const chinese=profile.course?.kind==='chinese'||location.pathname.includes('/chinese/');
 const css=el('link',{rel:'stylesheet',href:'/assets/css/study-hub.css'});document.head.append(css);
 if(!document.querySelector('link[data-feedback-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/learning-feedback.css','data-feedback-style':'true'}));
 const trigger=el('button',{id:'feedback-open',type:'button',class:'btn btn-ghost btn-sm',text:'Góp ý / Báo lỗi'});
 if(profile.role==='student'){trigger.textContent='?';trigger.setAttribute('aria-label','Góp ý / Báo lỗi');trigger.title='Góp ý / Báo lỗi';}
 (document.querySelector('.topbar-user')||document.querySelector('main')||document.body).append(trigger);
 let activeHistory=null;
 const inbox=profile.role==='student'?createFeedbackInbox(profile,trigger,rows=>activeHistory?.(rows)):null;
 const safePath=()=>{const p=new URLSearchParams();for(const key of ['set','attempt','session','topic','mode','view','subject','level']){const value=new URLSearchParams(location.search).get(key);if(value)p.set(key,value);}return location.pathname+(p.size?'?'+p:'');};
 function open(context='',showHistory=false){
  if(document.querySelector('.feedback-dialog[open]'))return;
  const dialog=el('dialog',{class:'feedback-dialog','aria-label':'Góp ý và phản ánh lỗi'}),status=el('p',{class:'feedback-dialog-status',role:'status','aria-live':'polite'}),list=el('div',{class:'feedback-history-list'});
  const category=el('select',{'aria-label':'Loại phản ánh',required:true},Object.entries(feedbackLabels).map(([value,text])=>el('option',{value,text}))),message=el('textarea',{'aria-label':'Mô tả vấn đề',required:true,minlength:5,maxlength:4000,rows:5,placeholder:'Bạn gặp vấn đề gì? Đã bấm nút nào? Mong muốn sửa như thế nào?'});
  const send=el('button',{type:'submit',class:'btn btn-primary',text:'Gửi phản ánh'}),form=el('form',{class:'feedback-new-form'},[el('label',{},[el('span',{text:'Bạn muốn phản ánh điều gì?'}),category]),el('label',{},[el('span',{text:'Mô tả vấn đề (ít nhất 5 ký tự)'}),message]),...(context?[el('details',{class:'feedback-reported-context'},[el('summary',{text:'Nội dung câu đang phản ánh'}),el('p',{text:context})])]:[]),el('p',{class:'muted',text:'Trang hiện tại sẽ được gửi kèm. Không nhập mật khẩu hoặc thông tin thanh toán.'}),send]);
  const close=el('button',{type:'button',class:'feedback-dialog-close',text:'×','aria-label':'Đóng',onclick:()=>dialog.close()});
  form.onsubmit=async e=>{e.preventDefault();send.disabled=true;status.textContent='Đang gửi…';try{await api('/api/v1/feedback',{method:'POST',body:{category:category.value,message:message.value,page_url:safePath(),context_text:context.slice(0,2000),scope:profile.course?.kind|| (location.pathname.includes('/chinese/')?'chinese':'general')}});status.textContent='Đã gửi. Bạn có thể xem phản hồi trong “Phản ánh của tôi”.';message.value='';}catch(e){status.textContent=e.message;}finally{send.disabled=false;}};
  const history=el('button',{type:'button',class:'feedback-dialog-tab',text:'Phản ánh của tôi'}),compose=el('button',{type:'button',class:'feedback-dialog-tab',text:'Gửi phản ánh mới'});
  function renderHistory(rows){
   if(!dialog.open||list.hidden||document.visibilityState==='hidden')return;
   list.replaceChildren(...rows.map(row=>el('article',{class:'feedback-history-card'},[
    el('div',{class:'feedback-history-heading'},[el('strong',{text:feedbackLabels[row.category]||row.category}),el('span',{class:'feedback-history-state','data-state':row.status,text:feedbackStatuses[row.status]})]),
    el('time',{datetime:row.created_at,text:'Bạn gửi · '+formatDate(row.created_at)}),el('p',{class:'feedback-history-message',text:row.message}),
    row.reply?.trim()?el('div',{class:'feedback-history-reply'},[el('strong',{text:'Phản hồi từ quản trị viên'}),el('p',{text:row.reply}),el('small',{text:'Cập nhật · '+formatDate(row.updated_at)}),...(profile.role==='student'?[el('button',{type:'button',class:'btn btn-secondary feedback-contact-admin',text:'Liên hệ admin qua chat',onclick:async event=>{const button=event.currentTarget;button.disabled=true;status.textContent='Đang mở cuộc trò chuyện…';try{const {data}=await api('/api/v1/chat/support-room',{method:'POST',body:{feedback_id:row.id}});dialog.close();window.__ttnavaPendingChatRoom=data.room_id;requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('ttnava:open-chat-room',{detail:{roomId:data.room_id}})));}catch(error){status.textContent='Chưa mở được cuộc trò chuyện: '+error.message;button.disabled=false;}}})]:[])]):el('p',{class:'feedback-waiting',text:'Đã tiếp nhận phản ánh. Quản trị viên sẽ phản hồi tại đây.'}),
   ])));
   if(!rows.length)list.append(el('p',{class:'feedback-waiting',text:'Bạn chưa gửi phản ánh nào.'}));inbox?.markRead(rows);
  }
  async function loadHistory(){
   form.hidden=true;list.hidden=false;history.setAttribute('aria-pressed','true');compose.setAttribute('aria-pressed','false');status.textContent='Đang tải phản hồi…';history.disabled=true;activeHistory=renderHistory;
   try{const rows=inbox?await inbox.load(true):(await api('/api/v1/feedback',{cache:'no-store'})).data;renderHistory(rows);status.textContent='';}catch(error){status.textContent='Chưa tải được phản hồi: '+error.message;}finally{history.disabled=false;}
  }
  history.onclick=loadHistory;compose.onclick=()=>{activeHistory=null;form.hidden=false;list.hidden=true;compose.setAttribute('aria-pressed','true');history.setAttribute('aria-pressed','false');status.textContent='';category.focus();};
  dialog.append(el('header',{class:'feedback-dialog-heading'},[el('div',{},[el('span',{text:'CÙNG NHAU CẢI THIỆN TTNAVA'}),el('h2',{text:'Góp ý & phản hồi'})]),close]),el('nav',{class:'feedback-dialog-tabs','aria-label':'Góp ý và phản hồi'},[history,compose]),status,list,form);
  document.body.append(dialog);dialog.addEventListener('close',()=>{activeHistory=null;dialog.remove();trigger.focus({preventScroll:true});});dialog.showModal();if(showHistory)loadHistory();else compose.click();
 }
 trigger.onclick=()=>open('',Boolean(inbox?.hasNew));
 const prompts='.question-prompt,.quiz-prompt,.worksheet-prompt,.study-prompt,.applied-practice>h2,.applied-hanzi,.review-item>strong';
 const enhance=()=>{document.querySelectorAll(prompts).forEach(prompt=>{const anchor=prompt.closest('button,label')||prompt;if(anchor.parentElement.querySelector(':scope > .question-feedback'))return;const b=el('button',{type:'button',class:'question-feedback btn btn-ghost btn-sm',text:'Phản ánh câu này',onclick:()=>open(learningFeedbackContext(prompt))});anchor.after(b);
  if(!chinese&&!anchor.parentElement.querySelector('.hub-hint')&&!prompt.closest('.applied-practice')&&!anchor.classList.contains('flashcard'))b.after(el('details',{class:'hub-hint'},[el('summary',{text:'Gợi ý cách làm'}),el('p',{text:'Nghe hoặc đọc lại đề, tìm điều câu hỏi yêu cầu. Với câu dài, chia thành từng ý nhỏ; so sánh từng lựa chọn trước khi trả lời.'})]));
 });};
 const observer=new MutationObserver(enhance);observer.observe(document.querySelector('main')||document.body,{childList:true,subtree:true});enhance();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
