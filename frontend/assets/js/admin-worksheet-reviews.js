import {api,el,formatDate} from './api.js';
import {imageUrl} from './worksheet-player.js';
const root=document.querySelector('#ws-reviews'),notice=document.querySelector('#ws-notice');
export async function loadReviews(){
 const {data}=await api('/api/v1/worksheets/admin/reviews');root.replaceChildren(el('h2',{text:'Bài tự luận chờ chấm'}));
 if(!data.length){root.append(el('p',{text:'Chưa có bài chờ chấm.'}));return;}
 for(const a of data)root.append(el('article',{class:'worksheet-history-row'},[el('div',{},[el('strong',{text:a.display_name+' (@'+a.username+') · '+a.title}),el('p',{text:formatDate(a.submitted_at)})]),el('button',{type:'button',class:'btn btn-ghost',text:'Xem và chấm',onclick:()=>openReview(a.id).catch(e=>notice.textContent=e.message)})]));
}
async function openReview(id){
 const {data}=await api('/api/v1/worksheets/admin/reviews/'+id);const marks=new Map();root.replaceChildren(el('h2',{text:data.snapshot.title}));
 for(const result of data.results.filter(r=>r.correct===null)){
  const item=data.snapshot.items.find(i=>i.id===result.id),response=data.answers[item.id]||{};
  const select=el('select',{class:'select','aria-label':'Chấm câu '+item.prompt},[el('option',{value:'',text:'Chọn kết quả chấm'}),el('option',{value:'true',text:'Đúng'}),el('option',{value:'false',text:'Chưa đúng'})]);
  const comment=el('textarea',{class:'textarea',maxlength:2000,placeholder:'Nhận xét cho học sinh'});const update=()=>marks.set(item.id,{id:item.id,correct:select.value==='true',comment:comment.value});select.onchange=comment.oninput=update;
  const card=el('section',{class:'worksheet-review-card'},[el('h3',{text:item.prompt}),...(item.imageId?[el('img',{src:imageUrl(item.imageId),alt:'Hình đề bài'})]:[]),el('p',{text:response.text||'Không có bài giải bằng chữ.'}),...(response.drawing?[el('img',{src:response.drawing,alt:'Bản vẽ của học sinh'})]:[]),select,comment]);root.append(card);
 }
 root.append(el('button',{type:'button',class:'btn',text:'Lưu kết quả chấm',onclick:async event=>{
  if([...root.querySelectorAll('select')].some(s=>!s.value)){notice.textContent='Chọn kết quả cho tất cả câu tự luận.';return;}
  const b=event.currentTarget;b.disabled=true;try{await api('/api/v1/worksheets/admin/reviews/'+id,{method:'POST',body:{marks:[...marks.values()]}});notice.textContent='Đã chấm. Học sinh có thể xem điểm và nhận xét.';await loadReviews();}catch(e){notice.textContent=e.message;b.disabled=false;}
 }}));
}
