import {initPage} from './ui-core.js';
import {api,el} from './api.js';
import {feedbackLabels,feedbackStatuses} from './learning-feedback.js';
const notice=document.querySelector('#feedback-notice'),list=document.querySelector('#feedback-list'),filter=document.querySelector('#feedback-filter');let rows=[];
const category=document.querySelector('#feedback-category');for(const [value,text]of Object.entries(feedbackLabels))category.append(el('option',{value,text}));
function render(){list.replaceChildren(...rows.filter(r=>(!filter.value||r.status===filter.value)&&(!category.value||r.category===category.value)).map(r=>{
 const status=el('select',{'aria-label':'Trạng thái xử lý'},Object.entries(feedbackStatuses).map(([value,text])=>el('option',{value,text})));status.value=r.status;
 const reply=el('textarea',{'aria-label':'Phản hồi cho người gửi',maxlength:2000});reply.value=r.reply;
 const save=el('button',{type:'button',class:'btn btn-primary',text:'Lưu phản hồi',onclick:async()=>{save.disabled=true;try{await api('/api/v1/feedback/'+r.id,{method:'PUT',body:{status:status.value,reply:reply.value}});r.status=status.value;r.reply=reply.value;notice.textContent='Đã lưu. Người gửi có thể xem phản hồi trong lịch sử phản ánh.';render();}catch(e){notice.textContent=e.message;}finally{save.disabled=false;}}});
 return el('article',{class:'hub-card'},[el('h2',{text:feedbackLabels[r.category]||r.category}),el('small',{text:r.display_name+' · '+new Date(r.created_at).toLocaleString('vi-VN')}),el('p',{text:r.message}),...(r.context_text?[el('blockquote',{text:r.context_text})]:[]),el('p',{text:'Trang gặp lỗi: '+r.page_url}),el('div',{class:'hub-feedback-tools'},[status,reply,save])]);
 }));if(!list.children.length)list.append(el('p',{text:'Chưa có phản ánh trong mục này.'}));}
filter.onchange=render;
category.onchange=render;
initPage('admin','feedback').then(async()=>{rows=(await api('/api/v1/feedback?manage=true')).data;render();}).catch(e=>notice.textContent=e.message);
