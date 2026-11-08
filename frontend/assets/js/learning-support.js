import {api,el} from './api.js';
import {initPage} from './ui-core.js';
import {questionAudio} from './question-audio.js';
const out=document.getElementById('support-content'),notice=document.getElementById('support-notice');
const card=(title,children)=>el('section',{class:'support-card'},[el('h2',{text:title}),...children]);
const link=(title,href)=>el('a',{class:'btn btn-primary',href,text:title});
let report;
async function today(){
 const d=(await api('/api/v1/learning/today')).data;
 out.replaceChildren(el('div',{class:'support-hero'},[el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:100,height:100}),el('div',{},[el('h2',{text:d.course.title}),el('p',{text:d.reason})])]));
 if(d.kind==='primary'){
  if(!d.topic){out.append(card('Đang chờ nội dung',[el('p',{text:'Khóa này chưa có chủ đề đủ 10 câu. Hãy quay lại mục Học tập để xem nội dung đã có.'}),link('Về học tập','/pages/student/learning/')]));return;}
  const start=el('button',{class:'btn btn-primary',type:'button',text:d.recent?.status==='in_progress'?'Tiếp tục 10 câu':d.recent?.status==='finished'?'Luyện thêm 10 câu':'Bắt đầu 10 câu'});
  start.onclick=async()=>{start.disabled=true;try{location.assign((await api('/api/v1/learning/today/start',{method:'POST'})).data.href);}catch(e){notice.textContent=e.message;start.disabled=false;}};
  out.append(card('1. Nghe và làm 10 câu',[el('p',{text:d.topic.subject+' · '+d.topic.name}),questionAudio('Hôm nay mình cùng luyện 10 câu. Con nghe đề, nghe từng lựa chọn rồi trả lời nhé.',{label:'Nghe hướng dẫn'}),start]),card('2. Xem lại sau khi làm',[el('p',{text:'Đọc hoặc nghe lại đề các câu sai, xem lời giải rồi thử lại.'}),...(d.recent?.status==='finished'?[el('p',{text:'Lượt gần nhất hôm nay: '+d.recent.correct_count+'/'+d.recent.total_questions+' câu đúng.'})]:[])]));
 }else{
  out.append(card('1. Ôn một nhóm từ nhỏ',[el('p',{text:d.words.length?'Bấm từng từ để mở thẻ, nghe mẫu và tự đánh giá đã nhớ hay cần ôn.':'Chưa có thẻ từ trong khóa này. Admin cần bổ sung mục từ vựng.'}),el('div',{class:'support-word-list'},d.words.map(w=>el('a',{class:'support-word',href:w.href},[el('strong',{text:w.hanzi}),el('small',{text:w.meaning})])))]));
  if(d.activity)out.append(card('2. Dùng từ trong câu',[el('p',{text:d.activity.title}),el('p',{text:d.activity.applied?'Chọn một dạng và luyện 10 câu; có thể nghe từng lựa chọn.':'Mở thẻ bài học để tiếp tục ôn.'}),link(d.activity.applied?'Luyện vận dụng 10 câu':'Mở bài học',d.activity.href)]));
  else out.append(card('Đang chờ bài học',[el('p',{text:'Khóa này chưa có tài liệu được xuất bản.'})]));
 }
 out.append(link('Xem báo cáo 7 ngày','/pages/student/family/'));
}
function downloadCSV(d){
 const safe=value=>{let s=String(value??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const rows=[['Thời điểm','Loại','Môn','Nội dung','Trạng thái','Điểm / 100','Câu đúng','Tổng câu'],...d.recent.map(r=>[new Date(r.started_at).toLocaleString('vi-VN'),r.kind,r.subject,r.title,r.status,r.completed_at?r.score:'',r.correct,r.total])];
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=el('a',{href:url,download:'bao-cao-hoc-tap-'+d.day+'.csv'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function family(profile){
 report=(await api('/api/v1/learning/family-report')).data;const d=report,s=d.summary;
 const metric=(value,label)=>el('div',{class:'support-metric'},[el('strong',{text:value}),el('span',{text:label})]);
 out.replaceChildren(card(profile.displayName+' · '+d.course.title,[el('p',{text:'Đến ngày '+new Date(d.day+'T12:00:00+07:00').toLocaleDateString('vi-VN')}),el('div',{class:'support-metrics'},[metric(s.completed,'lượt hoàn thành'),metric(s.average==null?'—':s.average+'/100','điểm trung bình'),metric(s.estimated_minutes+' phút','thời lượng ước tính'),metric(s.in_progress,'lượt đang làm')]),el('p',{class:'muted',text:d.note}),...(s.pending_review?[el('p',{text:s.pending_review+' phiếu đang chờ giáo viên chấm.'})]:[])]));
 out.append(card('Theo từng môn',d.subjects.length?d.subjects.map(s=>el('div',{class:'support-subject'},[el('strong',{text:s.title}),el('span',{text:s.completed+' lượt · '+(s.average??'—')+'/100'})])):[el('p',{text:'Chưa có lượt hoàn thành trong 7 ngày. Hãy bắt đầu bằng một lượt học ngắn.'})]));
 out.append(card('Nội dung nên ôn lại',d.weak.length?d.weak.map(r=>el('p',{text:r.subject+' · '+r.title+' — '+r.score+'/100'})):[el('p',{text:d.recent.length?'Chưa có lượt hoàn thành dưới 70 điểm trong khoảng báo cáo.':'Cần thêm kết quả học để đề xuất nội dung ôn.'})]));
 out.append(card('Hoạt động gần đây',d.recent.length?d.recent.map(r=>el('article',{class:'support-history'},[el('strong',{text:r.kind+' · '+r.title}),el('p',{text:r.subject+' · '+new Date(r.started_at).toLocaleString('vi-VN')+' · '+(!r.completed_at?'Đang làm':r.status==='pending_review'?'Chờ chấm':r.score==null?'Đã hoàn thành':r.score+'/100')})])):[el('p',{text:'Chưa có hoạt động trong khoảng báo cáo.'})]));
 document.getElementById('report-export').disabled=false;
}
document.getElementById('report-print')?.addEventListener('click',()=>window.print());document.getElementById('report-export')?.addEventListener('click',()=>{if(report)downloadCSV(report);});
initPage('student',document.body.dataset.supportView==='family'?'family':'today').then(async profile=>{if(document.body.dataset.supportView==='family')await family(profile);else await today();notice.textContent='';}).catch(e=>notice.textContent=e.message);
