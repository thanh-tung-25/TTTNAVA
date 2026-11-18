import {api,el} from './api.js';
const root=document.getElementById('experience-root'),notice=document.getElementById('experience-notice');
const request=async(path,options={})=>(await api('/api/v1/experience'+path,options)).data;
const query=new URLSearchParams(location.search);
let profile,links=[],childId=query.get('child')||'',courseId=query.get('course')||'all',days=query.get('days')==='30'?30:7,report,reportLoading=false,version=0,controller,workspace,childList,courseSelect,reportHost,periodButtons=[],historyPage=1,historyFilter='all';
const fmt=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'});
const clock=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});
const date=value=>value?fmt.format(new Date(value)):'Chưa ghi nhận';
const time=value=>value?clock.format(new Date(value)):'';
const text=(value,className='')=>el('p',{class:className,text:value});
const button=(label,fn,className='g-btn')=>el('button',{type:'button',class:className,text:label,onclick:fn});
const statuses={pending:'Chờ con xác nhận',accepted:'Đã liên kết',declined:'Con đã từ chối',revoked:'Đã ngừng liên kết'};
const icons={activity:'<path d="M4 13h4l3-8 4 14 3-6h3"/>',calendar:'<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h1m4 0h1"/>',score:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',book:'<path d="M12 6v15M3 4q5-2 9 2 4-4 9-2v15q-5-2-9 2-4-4-9-2Z"/>',check:'<path d="m5 12 4 4L19 6"/>',link:'<path d="m10 14 4-4m-5 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 8a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-2 2"/>'};
const icon=name=>el('span',{class:'g-icon','aria-hidden':'true',html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.book)+'</svg>'});
const tell=(message='',error=false)=>{notice.textContent=message;notice.hidden=!message;notice.classList.toggle('is-error',error);};
const guarded=fn=>async event=>{const control=event?.currentTarget;if(control)control.disabled=true;try{await fn();}catch(e){tell(e.message,true);}finally{if(control)control.disabled=false;}};
const selectedChild=()=>links.find(l=>l.student_id===childId&&l.status==='accepted');
function saveLocation(){const next=new URL(location.href);next.searchParams.set('child',childId);next.searchParams.set('course',courseId);next.searchParams.set('days',String(days));history.replaceState(null,'',next);}
function initials(name){return String(name||'Con').trim().split(/\s+/u).slice(-2).map(s=>s[0]).join('').toLocaleUpperCase('vi');}
function badge(row){
 if(row.status==='failed')return el('span',{class:'g-badge warning',text:'Cần thực hiện lại'});
 if(row.status==='pending_review')return el('span',{class:'g-badge neutral',text:'Chờ chấm / xem lại'});
 if(!row.completed_at)return el('span',{class:'g-badge neutral',text:'Chưa hoàn thành'});
 if(row.score==null)return el('span',{class:'g-badge positive',text:'Đã hoàn thành'});
 return el('span',{class:'g-score '+(row.score<70?'warning':row.score>=80?'positive':'neutral'),text:row.score+'/100'});
}
function section(title,subtitle,children=[],id=''){
 return el('section',{class:'g-panel',...(id?{id}: {})},[el('div',{class:'g-section-head'},[el('div',{},[el('h3',{text:title}),...(subtitle?[text(subtitle,'g-muted')]:[])])]),...children]);
}
function empty(title,description,action){return el('div',{class:'g-empty'},[icon('book'),el('h3',{text:title}),text(description),...(action?[action]:[])]);}
function renderChildren(){
 childList.replaceChildren(...links.filter(l=>l.status==='accepted').map(child=>{
  const b=button('',()=>selectChild(child.student_id),'g-child');b.setAttribute('aria-pressed',String(child.student_id===childId));
  b.append(el('span',{class:'g-avatar',text:initials(child.student_name)}),el('span',{class:'g-child-copy'},[el('strong',{text:child.student_name}),el('small',{text:child.student_id===childId?'Đang xem báo cáo':'Xem tình hình học tập'})]),icon('arrow'));return b;
 }));
 const pending=links.filter(l=>l.status==='pending');if(pending.length)childList.append(text(pending.length+' yêu cầu đang chờ con xác nhận','g-pending'));
}
async function loadLinks(){links=(await request('/guardian/links')).filter(l=>l.guardian_id===profile.id);}
function layout(){
 const sidebar=el('aside',{class:'g-sidebar'});childList=el('div',{class:'g-children','aria-label':'Chọn con để xem báo cáo'});
 sidebar.append(el('p',{class:'g-eyebrow',text:'CON ĐANG THEO DÕI'}),childList,button('+ Liên kết thêm con',()=>manageLinks(),'g-btn g-btn-soft g-add-child'),el('div',{class:'g-sidebar-note'},[icon('link'),text('Báo cáo riêng của gia đình'),el('small',{text:'Chỉ những tài khoản con đã đồng ý liên kết mới được hiển thị.'})]));
 workspace=el('div',{class:'g-workspace'});root.replaceChildren(el('div',{class:'g-layout'},[sidebar,workspace]));renderChildren();
}
async function selectChild(id){
 childId=id;courseId='all';report=null;renderChildren();const token=++version;controller?.abort();
 workspace.replaceChildren(text('Đang mở báo cáo của con…','g-loading'));
 try{
  const courses=await request('/guardian/children/'+encodeURIComponent(id)+'/courses');if(token!==version)return;
  const child=selectedChild();if(!child)return;
  const greeting=el('div',{class:'g-dashboard-heading'},[el('div',{},[el('p',{class:'g-eyebrow',text:'BỨC TRANH HỌC TẬP CỦA CON'}),el('h2',{text:child.student_name}),text('Biết con đã học gì, ghi nhận tiến bộ và cùng con chọn bước tiếp theo.','g-muted')]),button('Quản lý liên kết',()=>manageLinks(),'g-text-button')]);
  courseSelect=el('select',{'aria-label':'Khóa học cần theo dõi'},[el('option',{value:'all',text:'Tất cả khóa học'}),...courses.map(c=>el('option',{value:c.id,text:c.title}))]);
  if(courses.some(c=>c.id===query.get('course'))&&query.get('child')===id)courseId=query.get('course');courseSelect.value=courseId;
  courseSelect.onchange=()=>{courseId=courseSelect.value;loadReport();};
  periodButtons=[7,30].map(n=>{const b=button(n+' ngày',()=>{days=n;loadReport();},'g-period-button');b.dataset.days=String(n);return b;});
  const refresh=button('↻ Cập nhật',()=>loadReport(),'g-btn g-btn-plain');
  const exportButton=button('↓ Tải báo cáo',()=>downloadReport(),'g-btn g-btn-plain');
  const toolbar=el('div',{class:'g-toolbar'},[el('label',{class:'g-course-control'},[el('span',{text:'Phạm vi báo cáo'}),courseSelect]),el('div',{class:'g-period','aria-label':'Khoảng thời gian'},periodButtons),el('div',{class:'g-toolbar-actions'},[refresh,exportButton])]);
  reportHost=el('div',{class:'g-report'});workspace.replaceChildren(greeting,toolbar,reportHost);
  if(!courses.length){reportHost.append(empty('Con chưa có khóa học đang mở','Khi tài khoản con được mở khóa học, kết quả được lưu sẽ xuất hiện tại đây.'));return;}
  await loadReport();
 }catch(e){if(token!==version)return;workspace.replaceChildren(empty('Chưa mở được báo cáo',e.message,button('Thử lại',()=>selectChild(id),'g-btn g-btn-primary')));}
}
async function loadReport(){
 const token=++version;controller?.abort();controller=new AbortController();reportLoading=true;
 for(const b of periodButtons)b.setAttribute('aria-pressed',String(Number(b.dataset.days)===days));
 const target=reportHost;target.setAttribute('aria-busy','true');if(!report)target.replaceChildren(text('Đang tổng hợp dữ liệu học tập…','g-loading'));else target.classList.add('is-loading');
 tell('');saveLocation();
 try{
  const data=await request('/guardian/children/'+encodeURIComponent(childId)+'/report?'+new URLSearchParams({courseId,days:String(days)}),{signal:controller.signal});
  if(token!==version)return;report=data;historyPage=1;historyFilter='all';renderReport(data);
 }catch(e){if(token!==version||e.name==='AbortError')return;report=null;target.replaceChildren(empty('Chưa tải được báo cáo',e.message,button('Tải lại báo cáo',()=>loadReport(),'g-btn g-btn-primary')));}
 finally{if(token===version){reportLoading=false;target.removeAttribute('aria-busy');target.classList.remove('is-loading');}}
}
function metric(value,label,detail,name,tone=''){
 return el('article',{class:'g-metric '+tone},[el('div',{class:'g-metric-label'},[el('span',{text:label}),icon(name)]),el('strong',{text:value}),text(detail)]);
}
function renderReport(d){
 const s=d.summary,prior=d.previous,completedDelta=s.completed-prior.completed,scoreDelta=s.average!=null&&prior.average!=null?s.average-prior.average:null;
 const delta=n=>(n>0?'+':'')+n;
 const today=d.daily.at(-1)?.completed||0;
 const headline=el('div',{class:'g-report-intro'},[el('div',{},[el('span',{class:'g-live-dot '+(today?'active':'')}),el('strong',{text:today?'Hôm nay con đã hoàn thành '+today+' hoạt động':'Hôm nay chưa ghi nhận lượt hoàn thành'}),el('span',{text:date(d.since)+' – '+date(d.day+'T12:00:00+07:00')})]),el('div',{class:'g-updated'},[text(s.last_activity_at?'Gần nhất: '+date(s.last_activity_at)+' · '+time(s.last_activity_at):'Chưa có hoạt động được lưu trong kỳ'),text('Cập nhật báo cáo lúc '+time(d.generated_at))])]);
 const metrics=el('div',{class:'g-metrics'},[
  metric(s.completed,'Hoạt động hoàn thành',delta(completedDelta)+' so với '+days+' ngày trước','activity','lavender'),
  metric(s.average==null?'—':s.average+'/100','Điểm trung bình',s.scored_completed+' lượt có điểm'+(scoreDelta!=null?' · '+delta(scoreDelta)+' điểm':''),'score','mint'),
  metric(s.active_days+'/'+days,'Ngày có học','Có ít nhất một hoạt động hoàn thành','calendar','peach'),
  metric(s.in_progress,'Lượt chưa hoàn thành',s.pending_review?s.pending_review+' lượt đang chờ chấm / xem lại':'Theo các hoạt động được lưu trong kỳ','clock','blue')
 ]);
 const main=el('div',{class:'g-main-column'},[rhythm(d),lessons(d)]),aside=el('div',{class:'g-side-column'},[attention(d),assignments(d)]);
 const courseCards=d.courses.length>1?el('div',{class:'g-course-summaries'},d.courses.map(c=>el('article',{},[el('strong',{text:c.title}),el('span',{text:c.completed+' hoạt động'}),el('b',{text:c.average==null?'Chưa có điểm':c.average+'/100'})]))):null;
 const info=el('details',{class:'g-report-note'},[el('summary',{text:'Báo cáo này được tính như thế nào?'}),text(d.note),text('Điểm trung bình chỉ tính những lượt đã hoàn thành và có điểm. Điểm luyện nói phản ánh nội dung và ngữ pháp, chưa đánh giá phát âm. Dữ liệu trò chuyện riêng, bản ghi âm và bài viết nháp không hiển thị ở đây.'),text('Lần học gần nhất trong kỳ: '+(s.last_activity_at?date(s.last_activity_at)+' lúc '+time(s.last_activity_at):'chưa ghi nhận')+'. Thời lượng ước tính: '+s.estimated_minutes+' phút.')]);
 const subjects=d.subjects.length>1?section('Kết quả theo môn','Chỉ tính điểm từ các lượt đã hoàn thành và được chấm.',[el('div',{class:'g-subject-grid'},d.subjects.map(subject=>el('article',{},[el('strong',{text:subject.title}),el('b',{text:subject.average==null?'—':subject.average+'/100'}),text(subject.completed+' hoạt động hoàn thành')])))]):null;
 reportHost.replaceChildren(headline,metrics,...(courseCards?[courseCards]:[]),...(subjects?[subjects]:[]),el('div',{class:'g-report-columns'},[main,aside]),historyPanel(d),info);
}
function rhythm(d){
 const max=Math.max(1,...d.daily.map(day=>day.completed)),chart=el('div',{class:d.days===30?'g-calendar-chart':'g-week-chart','aria-label':'Hoạt động hoàn thành từng ngày'});
 for(const day of d.daily){
  const full=date(day.date+'T12:00:00+07:00'),dayNumber=Number(day.date.slice(-2)),label=d.days===30?String(dayNumber):new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'short'}).format(new Date(day.date+'T12:00:00+07:00'));
  const content=d.days===7?[el('strong',{text:day.completed||'—'}),el('div',{class:'g-bar-track'},[el('span',{style:'height:'+Math.max(4,Math.round(day.completed/max*100))+'%'})]),el('span',{text:label})]:[el('span',{text:label}),el('small',{text:day.completed?day.completed+' lượt':'—'})];
  chart.append(el('div',{class:'g-chart-day '+(day.completed?'has-activity':''),title:full+': '+day.completed+' hoạt động','aria-label':full+': '+day.completed+' hoạt động'},content));
 }
 return section('Nhịp học của con',d.days===7?'Mỗi cột là số hoạt động hoàn thành trong một ngày.':'Những ngày có hoạt động hoàn thành được tô màu.',[chart,el('div',{class:'g-rhythm-footer'},[el('span',{},[el('i'), 'Có hoạt động được lưu']),el('strong',{text:d.summary.active_days+' ngày có học / '+days+' ngày'})])]);
}
function attention(d){
 return section('Bố mẹ cần chú ý','Những việc có thể cùng con làm tiếp.',d.attention.map(item=>el('article',{class:'g-attention '+item.tone},[el('span',{class:'g-attention-symbol',text:item.tone==='positive'?'✓':item.tone==='warning'?'!':'i','aria-hidden':'true'}),el('div',{},[el('h4',{text:item.title}),text(item.text),el('a',{href:'#guardian-'+item.section,text:item.section==='assignments'?'Xem bài được giao →':item.section==='lessons'?'Xem kết quả từng bài →':'Xem hoạt động →'})])])));
}
function lessons(d){
 const list=el('div',{class:'g-lessons'}),panel=section('Con đang học những gì?','Kết quả từng nội dung; không phải đánh giá năng lực tổng thể.',[list],'guardian-lessons');let expanded=false;
 const render=()=>{
  list.replaceChildren(...(expanded?d.lessons:d.lessons.slice(0,6)).map(lesson=>{
   const tone=lesson.average==null?'neutral':lesson.average<70?'warning':lesson.average>=80?'positive':'neutral';
   const label=lesson.average==null?(lesson.completed?'Đã tự luyện':'Chưa hoàn thành'):lesson.average<70?'Nên ôn thêm':lesson.average>=80?'Kết quả tốt':'Đang củng cố';
   return el('article',{class:'g-lesson'},[el('div',{class:'g-lesson-top'},[el('div',{},[el('h4',{text:lesson.title}),text(lesson.course_title,'g-muted')]),el('span',{class:'g-badge '+tone,text:label})]),el('div',{class:'g-lesson-bottom'},[el('span',{text:lesson.completed+' hoạt động hoàn thành'}),el('strong',{text:lesson.average==null?'Chưa có điểm':lesson.average+'/100'})]),el('div',{class:'g-progress-track','aria-hidden':'true'},[el('span',{class:tone,style:'width:'+(lesson.average==null?0:Math.max(0,Math.min(100,lesson.average)))+'%'})])]);
  }));
  if(!d.lessons.length)list.append(empty('Chưa có kết quả trong khoảng đã chọn','Thử xem 30 ngày hoặc chọn một khóa học khác.'));
 };
 render();if(d.lessons.length>6)panel.append(button('Xem tất cả '+d.lessons.length+' nội dung',event=>{expanded=!expanded;render();event.currentTarget.textContent=expanded?'Thu gọn nội dung':'Xem tất cả '+d.lessons.length+' nội dung';},'g-text-button g-show-more'));
 return panel;
}
function assignments(d){
 const pending=d.assignments.filter(a=>!a.completed),feedback=d.assignments.filter(a=>a.feedback),children=[];
 for(const item of pending.slice(0,4)){
  const overdue=item.due_at&&new Date(item.due_at)<new Date();children.push(el('article',{class:'g-assignment'},[el('strong',{text:item.title}),text(item.course_title,'g-muted'),el('span',{class:'g-badge '+(overdue?'warning':'neutral'),text:item.due_at?(overdue?'Quá hạn · ':'Hạn nộp · ')+date(item.due_at):'Chưa đặt hạn nộp'})]));
 }
 if(!pending.length)children.push(text(d.assignments.length?'Con đã hoàn thành các bài được giao đang hiển thị.':'Chưa có bài được giáo viên giao trong khóa đang chọn.','g-empty-copy'));
 if(pending.length>4)children.push(text('Còn '+(pending.length-4)+' bài chưa hoàn thành. Cùng con mở mục Bài được giao để xem đầy đủ.','g-muted'));
 for(const item of feedback.slice(0,2))children.push(el('div',{class:'g-teacher-feedback'},[el('span',{text:'LỜI NHẮN TỪ GIÁO VIÊN'}),el('strong',{text:item.title}),text(item.feedback),...(item.teacher_score!=null?[el('b',{text:item.teacher_score+'/100'})]:[])]));
 return section('Bài cô giao',pending.length?pending.length+' bài chưa hoàn thành':'Theo dõi bài giao và lời nhắn của cô.',children,'guardian-assignments');
}
function historyPanel(d){
 const select=el('select',{'aria-label':'Lọc hoạt động'},[['all','Tất cả hoạt động'],['weak','Lượt dưới 70 điểm'],['pending','Chưa hoàn thành / chờ chấm'],['practice','Hoạt động tự luyện']].map(([value,label])=>el('option',{value,text:label})));
 const list=el('div',{class:'g-history-list'}),paging=el('div',{class:'g-pagination'}),panel=section('Hoạt động gần đây','Con đã làm gì, lúc nào và kết quả ra sao.',[list,paging],'guardian-history');
 panel.querySelector('.g-section-head').append(select);
 const render=()=>{
  const rows=d.recent.filter(r=>historyFilter==='all'||historyFilter==='weak'&&r.completed_at&&r.score!=null&&r.score<70||historyFilter==='pending'&&(!r.completed_at||r.status==='pending_review')||historyFilter==='practice'&&r.category==='practice'),pages=Math.max(1,Math.ceil(rows.length/8));historyPage=Math.min(historyPage,pages);
  list.replaceChildren(...rows.slice((historyPage-1)*8,historyPage*8).map(row=>{
   const extra=el('details',{class:'g-history-detail'},[el('summary',{text:'Chi tiết'}),text(row.course_title+' · '+row.subject),text(row.correct!=null&&row.total?row.correct+'/'+row.total+' câu trả lời đúng':row.items_completed?row.items_completed+' mục đã hoàn thành':row.score==null?'Hoạt động này chưa có điểm được chấm.':'Điểm của lượt này: '+row.score+'/100'),...(row.detail?[text(row.detail)]:[]),...(row.feedback?[el('div',{class:'g-feedback'},[el('strong',{text:'Nhận xét'}),text(row.feedback)])]:[])]);
   return el('article',{class:'g-history-row'},[el('span',{class:'g-history-icon '+(row.category==='practice'?'practice':'')},[icon(row.category==='practice'?'check':'book')]),el('div',{class:'g-history-copy'},[el('span',{class:'g-history-kind',text:row.kind}),el('h4',{text:row.title}),text(date(row.completed_at||row.started_at)+' · '+time(row.completed_at||row.started_at),'g-muted'),extra]),el('div',{class:'g-history-result'},[badge(row)])]);
  }));
  if(!rows.length)list.append(empty('Chưa có hoạt động phù hợp','Chọn bộ lọc khác hoặc xem khoảng thời gian dài hơn.'));
  const prev=button('← Trước',()=>{historyPage--;render();},'g-btn g-btn-plain'),next=button('Sau →',()=>{historyPage++;render();},'g-btn g-btn-plain');prev.disabled=historyPage===1;next.disabled=historyPage===pages;
  paging.replaceChildren(text(rows.length+' hoạt động'+(d.recent_total>d.recent.length?' · hiển thị 100 lượt gần nhất':'')),el('div',{},[prev,el('span',{text:historyPage+' / '+pages}),next]));
 };
 select.onchange=()=>{historyFilter=select.value;historyPage=1;render();};render();return panel;
}
function downloadReport(){
 if(!report||reportLoading){tell('Báo cáo chưa sẵn sàng. Bạn chờ tải xong rồi thử lại.');return;}
 const safe=value=>{let s=String(value??'');if(/^\s*[=+\-@]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const rows=[['Con','Khóa học','Hoạt động','Nội dung','Thời điểm','Trạng thái','Điểm / 100','Câu đúng','Tổng câu'],...report.recent.map(r=>[report.child.display_name,r.course_title,r.kind,r.title,date(r.completed_at||r.started_at)+' '+time(r.completed_at||r.started_at),r.status,r.completed_at?r.score:null,r.correct,r.total])];
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=el('a',{href:url,download:'bao-cao-cua-con-'+report.day+'.csv'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function manageLinks(){
 const dialog=el('dialog',{class:'g-dialog','aria-labelledby':'guardian-dialog-title'}),close=button('×',()=>dialog.close(),'g-dialog-close');close.setAttribute('aria-label','Đóng quản lý liên kết');
 const form=el('form'),code=el('input',{class:'g-pair-code',id:'guardian-pair-code',maxlength:12,minlength:12,pattern:'[A-Fa-f0-9]{12}',autocomplete:'off',required:true,placeholder:'Ví dụ: A1B2C3D4E5F6'}),status=text('','g-dialog-status'),submit=el('button',{type:'submit',class:'g-btn g-btn-primary',text:'Gửi yêu cầu liên kết'});
 form.append(el('label',{for:'guardian-pair-code',text:'Mã ghép từ tài khoản con'}),code,submit,status);
 form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;status.textContent='Đang gửi yêu cầu…';try{await request('/guardian/links',{method:'POST',body:{code:code.value.trim().toUpperCase()}});await loadLinks();renderChildren();status.textContent='Đã gửi. Con cần đồng ý tại Cá nhân → Liên kết phụ huynh.';code.value='';renderLinks();}catch(e){status.textContent=e.message;}finally{submit.disabled=false;}};
 const list=el('div',{class:'g-managed-links'});
 function renderLinks(){list.replaceChildren(...links.map(item=>el('article',{},[el('div',{},[el('strong',{text:item.student_name}),text(statuses[item.status]||item.status,'g-muted')]),...(['pending','accepted'].includes(item.status)?[button('Ngừng liên kết',guarded(async()=>{if(!confirm('Ngừng liên kết với '+item.student_name+'?'))return;await request('/guardian/links/'+item.id,{method:'POST',body:{action:'revoke'}});await loadLinks();if(!selectedChild()){controller?.abort();version++;report=null;await chooseInitialChild();}else renderChildren();renderLinks();}),'g-text-button g-danger')]:[])])));}
 renderLinks();dialog.append(close,el('p',{class:'g-eyebrow',text:'GIA ĐÌNH CÙNG ĐỒNG HÀNH'}),el('h2',{id:'guardian-dialog-title',text:'Liên kết với con'}),el('ol',{class:'g-link-steps'},['Con mở Cá nhân → Liên kết phụ huynh và tạo mã ghép.','Nhập mã bên dưới để gửi yêu cầu.','Con đồng ý liên kết; báo cáo sẽ tự mở khi bạn cập nhật.'].map(value=>el('li',{text:value}))),form,list);
 document.body.append(dialog);dialog.addEventListener('close',async()=>{dialog.remove();try{await loadLinks();if(!selectedChild())await chooseInitialChild();else renderChildren();}catch(e){tell(e.message,true);}},{once:true});dialog.showModal();
}
async function chooseInitialChild(){
 const accepted=links.filter(l=>l.status==='accepted');layout();
 if(accepted.length){const initial=accepted.find(l=>l.student_id===childId)||accepted[0];await selectChild(initial.student_id);}
 else workspace.append(empty('Bắt đầu đồng hành cùng con','Liên kết tài khoản để xem nhịp học, kết quả từng bài và những nội dung con cần hỗ trợ.',button('Liên kết với con',()=>manageLinks(),'g-btn g-btn-primary')), ...(links.some(l=>l.status==='pending')?[text('Đã có yêu cầu liên kết đang chờ. Nhờ con mở Cá nhân để đồng ý, sau đó bấm Cập nhật liên kết.','g-pending'),button('↻ Cập nhật liên kết',guarded(async()=>{await loadLinks();await chooseInitialChild();}),'g-btn g-btn-plain')]:[]));
}
async function main(){
 profile=(await api('/api/v1/auth/me')).data.profile;if(profile.role!=='student'){location.replace('/');return;}
 document.getElementById('guardian-account').replaceChildren(el('span',{class:'g-parent-name',text:profile.displayName}),button('Đăng xuất',guarded(async()=>{await api('/api/v1/auth/logout',{method:'POST'});location.replace('/pages/login/');}),'g-btn g-btn-plain'));
 if(profile.accountKind!=='guardian'){root.replaceChildren(empty('Góc dành cho tài khoản phụ huynh','Đăng nhập tài khoản phụ huynh đã xác minh Gmail để liên kết và theo dõi báo cáo của con.',el('a',{class:'g-btn g-btn-primary',href:'/pages/student/courses/',text:'Về góc học tập'})));tell('');return;}
 await loadLinks();await chooseInitialChild();tell('');
}
window.addEventListener('pagehide',()=>{controller?.abort();version++;});
main().catch(e=>{tell(e.message,true);root.replaceChildren(empty('Chưa tải được Góc phụ huynh','Dữ liệu của con chưa được hiển thị. Bạn có thể thử tải lại trang.',button('Tải lại trang',()=>location.reload(),'g-btn g-btn-primary')));});
