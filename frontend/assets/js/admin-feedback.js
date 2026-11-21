import {initPage} from './ui-core.js';
import {api,el,toast,formatDate} from './api.js';
import {feedbackLabels,feedbackStatuses} from './learning-feedback.js';
const notice=document.querySelector('#feedback-notice'),list=document.querySelector('#feedback-list'),filter=document.querySelector('#feedback-filter'),search=document.querySelector('#feedback-search'),refresh=document.querySelector('#feedback-refresh'),summary=document.querySelector('#feedback-summary');let rows=[],loading=false;
const drafts=new Map(),busy=new Set();
const category=document.querySelector('#feedback-category');for(const [value,text]of Object.entries(feedbackLabels))category.append(el('option',{value,text}));
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/giu,'d').toLowerCase();
const changed=(row,draft)=>draft&&(draft.status!==row.status||draft.reply!==row.reply);
function lockNavigation(){for(const control of [filter,category,search,refresh,...summary.querySelectorAll('button')])control.disabled=loading||busy.size>0;}
function totals(){
 summary.replaceChildren(...[['','Tất cả'],['open','Đã tiếp nhận'],['reviewing','Đang xem xét'],['resolved','Đã xử lý']].map(([value,title])=>{
  const count=rows.filter(row=>!value||row.status===value).length;
  return el('button',{type:'button',class:'feedback-total','data-status':value||'all','aria-pressed':String(filter.value===value),onclick:()=>{filter.value=value;render();}},[el('span',{text:title}),el('strong',{text:String(count)})]);
 }));lockNavigation();
}
function reportCard(row){
 const draft=drafts.get(row.id)||{status:row.status,reply:row.reply||''};drafts.set(row.id,draft);
 const name=row.display_name||'Người gửi',article=el('article',{class:'feedback-card','data-feedback-id':row.id});
 const state=el('span',{class:'feedback-state','data-state':row.status,text:feedbackStatuses[row.status]});
 const delivery=el('p',{class:'feedback-delivery'}),localNotice=el('p',{class:'feedback-save-notice',role:'status','aria-live':'polite'});
 const status=el('select',{'aria-label':'Trạng thái xử lý của '+name},Object.entries(feedbackStatuses).map(([value,text])=>el('option',{value,text})));status.value=draft.status;
 const reply=el('textarea',{'aria-label':'Phản hồi cho '+name,rows:5,maxlength:2000,placeholder:'Viết hướng xử lý hoặc thông báo kết quả cho người gửi…'});reply.value=draft.reply;
 const count=el('span',{class:'feedback-char-count'}),save=el('button',{type:'submit',class:'feedback-send'});
 const storedReply=el('p'),storedPreview=el('details',{class:'feedback-stored-preview',hidden:true},[el('summary',{text:'Xem phản hồi hiện đang lưu'}),storedReply]);
 function update(){
  const dirty=changed(row,draft),saving=busy.has(row.id);status.disabled=saving;reply.disabled=saving;save.disabled=saving||!dirty;save.setAttribute('aria-busy',String(saving));
  save.textContent=saving?(draft.reply.trim()?'Đang gửi…':'Đang lưu…'):row.reply?'Lưu thay đổi':draft.reply.trim()?'Gửi phản hồi':'Lưu trạng thái';
  count.textContent=reply.value.length+' / 2.000';
  delivery.dataset.state=dirty?'draft':row.reply?'sent':'empty';
  delivery.textContent=dirty?'Có thay đổi chưa lưu':row.reply?'✓ Phản hồi đã hiển thị với người gửi · '+formatDate(row.updated_at):'Chưa gửi phản hồi';
  storedPreview.hidden=!row.reply||draft.reply===row.reply;storedReply.textContent=row.reply||'';
 }
 status.onchange=()=>{draft.status=status.value;localNotice.textContent='';update();};reply.oninput=()=>{draft.reply=reply.value;localNotice.textContent='';update();};
 const form=el('form',{class:'feedback-reply'},[
  el('div',{class:'feedback-reply-heading'},[el('h3',{text:'Trả lời '+name}),delivery]),
  el('label',{class:'feedback-field'},[el('span',{text:'Trạng thái xử lý'}),status]),
  el('label',{class:'feedback-field'},[el('span',{text:'Nội dung phản hồi'}),reply]),count,storedPreview,
  el('p',{class:'feedback-help',text:'Sau khi gửi, người gửi xem tại Góp ý / Báo lỗi, mục Phản ánh của tôi.'}),
  el('div',{class:'feedback-save-area'},[localNotice,save]),
 ]);
 form.onsubmit=async event=>{
  event.preventDefault();if(loading||busy.has(row.id)||!changed(row,draft))return;
  const hadReply=Boolean(row.reply),payload={status:status.value,reply:reply.value,...(row.reply_version?{expected_version:row.reply_version}:{})};
  busy.add(row.id);lockNavigation();localNotice.dataset.state='saving';localNotice.textContent=payload.reply.trim()?'Đang gửi phản hồi…':'Đang lưu trạng thái…';update();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const {data}=await api('/api/v1/feedback/'+encodeURIComponent(row.id),{method:'PUT',body:payload,signal:controller.signal});
   Object.assign(row,data);draft.status=row.status;draft.reply=row.reply;reply.value=row.reply;status.value=row.status;state.dataset.state=row.status;state.textContent=feedbackStatuses[row.status];
   localNotice.dataset.state='success';localNotice.textContent=row.reply?(hadReply?'✓ Đã cập nhật phản hồi. Người gửi đã có thể xem nội dung mới.':'✓ Đã gửi phản hồi cho '+name+'. Người gửi đã có thể xem trong Phản ánh của tôi.'):'✓ Đã lưu trạng thái xử lý.';
   toast(row.reply?'Đã lưu phản hồi cho '+name+'.':'Đã lưu trạng thái.','success');totals();
  }catch(error){localNotice.dataset.state='error';localNotice.textContent=error.name==='AbortError'?'Máy chủ chưa xác nhận kết quả lưu. Nội dung đang soạn vẫn được giữ; bạn có thể bấm gửi lại.':'Chưa lưu được: '+error.message+' Nội dung đang soạn vẫn được giữ.';toast('Chưa xác nhận được phản hồi. Vui lòng thử lại.','error');}
  finally{clearTimeout(timeout);busy.delete(row.id);lockNavigation();update();}
 };
 const details=el('details',{class:'feedback-context'},[el('summary',{text:'Xem chi tiết bài học và trang gặp lỗi'}),...(row.context_text?[el('blockquote',{text:row.context_text})]:[]),el('p',{class:'feedback-url',text:row.page_url})]);
 article.append(el('header',{class:'feedback-card-heading'},[
  el('span',{class:'feedback-person','aria-hidden':'true',text:name.trim().split(/\s+/u).map(part=>part[0]).slice(-2).join('').toUpperCase()}),
  el('div',{class:'feedback-sender'},[el('strong',{text:name}),el('time',{datetime:row.created_at,text:'Gửi lúc '+formatDate(row.created_at)})]),state,
 ]),el('div',{class:'feedback-card-body'},[
  el('section',{class:'feedback-report'},[el('p',{class:'feedback-type',text:feedbackLabels[row.category]||row.category}),el('h2',{text:'Nội dung phản ánh'}),el('p',{class:'feedback-message',text:row.message}),details]),form,
 ]));update();return article;
}
function render(){
 const term=normalize(search.value),visible=rows.filter(row=>(!filter.value||row.status===filter.value)&&(!category.value||row.category===category.value)&&(!term||normalize(row.display_name+' '+row.message+' '+row.reply).includes(term)));
 list.replaceChildren(...visible.map(reportCard));totals();
 if(!visible.length)list.append(el('div',{class:'feedback-empty'},[el('strong',{text:rows.length?'Không tìm thấy phản ánh phù hợp':'Chưa có phản ánh'}),el('p',{text:rows.length?'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.':'Phản ánh mới của người dùng sẽ xuất hiện tại đây.'})]));
 notice.textContent=visible.length+' phản ánh đang hiển thị · Chỉ gồm phản ánh trong phạm vi quản trị của bạn.';
}
async function load(){
 if(busy.size||loading)return;loading=true;list.inert=true;lockNavigation();refresh.textContent='Đang tải…';notice.textContent='Đang tải phản ánh…';
 try{const data=(await api('/api/v1/feedback?manage=true',{cache:'no-store'})).data,dirtyIds=new Set(rows.filter(row=>changed(row,drafts.get(row.id))).map(row=>row.id));rows=data;for(const id of drafts.keys())if(!dirtyIds.has(id))drafts.delete(id);render();}
 catch(error){notice.textContent='Chưa tải được phản ánh: '+error.message;}
 finally{loading=false;list.inert=false;lockNavigation();refresh.textContent='Làm mới';}
}
filter.onchange=render;
category.onchange=render;
search.oninput=render;refresh.onclick=load;
initPage('admin','feedback').then(load).catch(error=>notice.textContent=error.message);
