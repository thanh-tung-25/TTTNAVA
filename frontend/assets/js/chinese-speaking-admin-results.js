import {request,el,root,card,field,button,error} from './chinese-common.js';
import {formatDate} from './api.js';
import {renderSpeakingResult,speakingResultStyles} from './chinese-speaking-results.js';
const statuses={pending:'Chưa hoàn tất',grading:'Đang chấm',completed:'Đã chấm',needs_review:'Cần cô xem lại',failed:'Cần gửi chấm lại'};
export async function adminSpeakingResults(){
 speakingResultStyles();document.querySelector('main>h1').textContent='Kết quả luyện nói';
 let rows=await request('/speaking-results');
 const student=field('Học sinh','student','','text',[['','Tất cả học sinh'],...[...new Map(rows.map(row=>[row.student_id,row.display_name+' (@'+row.username+')'])).entries()]]),level=field('Cấp học','level','','text',[['','Tất cả cấp HSK'],...Array.from({length:9},(_,n)=>[n+1,'HSK '+(n+1)])]),status=field('Trạng thái','status','','text',[['','Tất cả trạng thái'],...Object.entries(statuses)]);
 const list=el('div',{class:'speaking-results-list'}),summary=el('p',{class:'muted'}),refresh=button('Cập nhật',async()=>{
  refresh.disabled=true;try{rows=await request('/speaking-results');const selected=student.querySelector('select').value;student.querySelector('select').replaceChildren(el('option',{value:'',text:'Tất cả học sinh'}),...[...new Map(rows.map(row=>[row.student_id,row.display_name+' (@'+row.username+')'])).entries()].map(([value,text])=>el('option',{value,text})));student.querySelector('select').value=selected;render();}catch(e){error(e);}finally{refresh.disabled=false;}
 });
 const render=()=>{
  const selected=student.querySelector('select').value,chosenLevel=level.querySelector('select').value,chosenStatus=status.querySelector('select').value;
  const filtered=rows.filter(row=>(!selected||row.student_id===selected)&&(!chosenLevel||String(row.level_id)===chosenLevel)&&(!chosenStatus||row.status===chosenStatus));
  summary.textContent=`${filtered.length} kết quả · Hiển thị tối đa 100 lượt gần nhất`;
  list.replaceChildren(...(filtered.length?filtered.map(row=>{
   const content=el('div'),details=el('details',{class:'card speaking-result-row'},[el('summary',{},[el('div',{},[el('strong',{text:row.display_name+' (@'+row.username+')'}),el('small',{text:`HSK ${row.level_id} · ${row.lesson_title}`}),el('small',{text:`${formatDate(row.created_at)} · Mã lượt ${row.recording_code}`})]),el('span',{class:'speaking-ai-question-score',text:row.score===null?statuses[row.status]:row.score+'/100'})]),content]);
   let loaded=false;
   details.ontoggle=async()=>{if(!details.open||loaded)return;loaded=true;content.textContent='Đang mở kết quả…';try{renderSpeakingResult(content,await request('/speaking-submissions/'+row.id));}catch(e){content.textContent=e.message;loaded=false;}};
   return details;
  }):[card('Chưa có kết quả',[el('p',{text:rows.length?'Chưa có lượt phù hợp bộ lọc.':'Khi học sinh bấm chấm AI, kết quả từng câu sẽ xuất hiện tại đây.'})])]));
 };
 for(const filter of [student,level,status])filter.onchange=render;
 root().append(el('header',{class:'admin-section-intro'},[el('img',{src:'/assets/images/mascot-lion.svg',width:76,height:84,alt:''}),el('div',{},[el('span',{class:'admin-mode-eyebrow',text:'LẮNG NGHE TỪNG BƯỚC TIẾN'}),el('h2',{text:'Theo dõi bài nói của học sinh'}),el('p',{text:'Xem điểm, câu trả lời và cách sửa theo từng câu. Chỉ lưu điểm và nhận xét; bản ghi âm được xử lý tạm rồi giải phóng khỏi server.'})])]),card('Tìm kết quả',[el('div',{class:'speaking-results-filters'},[student,level,status])]),el('div',{class:'speaking-results-toolbar'},[summary,refresh]),list);render();
}
