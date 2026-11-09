import {initPage} from './ui-core.js';
import {api,el} from './api.js';
import {questionAudio} from './question-audio.js';
const view=new URLSearchParams(location.search).get('view')||'search',out=document.querySelector('#hub-content'),notice=document.querySelector('#hub-notice');
const request=async p=>(await api('/api/v1/learning/'+p)).data;
const link=(text,href)=>el('a',{class:'btn btn-secondary',text,href});
const card=(title,nodes)=>el('section',{class:'hub-card'},[el('h2',{text:title}),...nodes]);
async function boot(){
 const profile=await initPage('student','study-hub');
 if(view==='search'){
  const input=el('input',{type:'search','aria-label':'Tìm nội dung',placeholder:profile.course.kind==='chinese'?'Chữ Hán, pinyin hoặc nghĩa tiếng Việt':'Tên bài / chủ đề',maxlength:80,required:true}),results=el('div'),submit=el('button',{type:'submit',class:'btn btn-primary',text:'Tìm'}),form=el('form',{class:'hub-search'},[input,submit]);
  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;notice.textContent='Đang tìm…';try{const rows=await request('search?'+new URLSearchParams({q:input.value}));results.replaceChildren(...rows.map(r=>card(r.title,[el('p',{text:r.detail}),link('Mở nội dung',r.href)])));notice.textContent=rows.length+' kết quả trong khóa đang học.';}catch(e){notice.textContent=e.message;}finally{submit.disabled=false;}};out.append(form,results);
 }else if(view==='wrong'){
  const rows=await request('wrong');notice.textContent=rows.length?'Các câu cần ôn. Chọn “Tự thử lại” trước khi mở lời giải.':'Chưa có câu sai đã lưu trong khóa này.';
  if(profile.course.kind==='primary'&&rows.length)out.append(el('p',{text:'Muốn ôn một lượt 10 câu, vào Học hôm nay để ưu tiên chủ đề từng làm sai.'}),link('Ôn 10 câu hôm nay','/pages/student/today/'));
  const filter=el('input',{type:'search','aria-label':'Lọc câu sai',placeholder:'Lọc câu cần ôn'}),list=el('div');
  const render=()=>{const q=filter.value.toLocaleLowerCase('vi');list.replaceChildren(...rows.filter(r=>r.title.toLocaleLowerCase('vi').includes(q)).map(r=>{
   const answer=el('textarea',{'aria-label':'Tự thử lại',rows:2,placeholder:'Con tự trả lời trước khi xem lời giải…'}),details=el('details',{},[el('summary',{text:'Xem lời giải và lượt làm gốc'}),...(r.answer?[el('p',{text:'Đáp án: '+(typeof r.answer==='string'?r.answer:JSON.stringify(r.answer))})]:[]),el('p',{text:r.explanation||'Mở lượt làm gốc để xem đáp án và phản hồi.'}),link('Xem lượt làm gốc',r.href)]);
   return card(r.title,[questionAudio(r.title),answer,details,...(r.set_id?[link('Ôn câu đã học của bài','/pages/student/chinese/?'+new URLSearchParams({set:r.set_id,mode:'review'}))]:[])]);
  }));};filter.oninput=render;out.append(filter,list);render();
 }else{
  const data=await request('week');const target=data.target;
  const picker=el('select',{'aria-label':'Mục tiêu số ngày'},Array.from({length:7},(_,i)=>el('option',{value:i+1,text:(i+1)+' ngày / 7 ngày'})));picker.value=String(target);
  const progress=el('div');const render=()=>{const n=Number(picker.value);progress.replaceChildren(el('p',{text:'Đã học '+data.days+'/'+n+' ngày trong 7 ngày gần nhất · '+data.completed+' lượt hoàn thành.'}),el('progress',{max:n,value:Math.min(n,data.days),'aria-label':'Tiến độ mục tiêu'}),...(data.days>=n?[el('p',{class:'hub-badge',text:'★ Đã đạt mục tiêu! Cùng giữ nhịp học nhé.'})]:[el('p',{text:'Mỗi ngày hoàn thành một lượt có lưu kết quả sẽ được tính là một ngày học.'})]));};
  picker.onchange=async()=>{picker.disabled=true;try{await api('/api/v1/learning/goal',{method:'PUT',body:{target:Number(picker.value)}});notice.textContent='Đã lưu mục tiêu vào tài khoản.';render();}catch(e){notice.textContent=e.message;}finally{picker.disabled=false;}};out.append(card('Mục tiêu 7 ngày',[el('p',{text:'Chọn số ngày phù hợp với mình. Huy hiệu chỉ để động viên, không cộng Kim Cương.'}),picker,progress,link('Học hôm nay','/pages/student/today/')]));render();
 }
}
boot().catch(e=>notice.textContent=e.message);
