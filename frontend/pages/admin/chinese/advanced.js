import {initPage} from '/assets/js/ui-core.js';
import {request,el,root,link,card,field,statuses,formSubmit,error,notice} from '/assets/js/chinese-common.js';
import {adminAction} from '/assets/js/chinese-admin-ui.js';
const params=new URLSearchParams(location.search);let data;
const adminLink=(text,p)=>link(text,p,'admin');
const heading=(title,description,animal='lion')=>el('header',{class:'admin-section-intro'},[el('img',{src:'/assets/images/mascot-'+animal+'.svg',width:78,height:86,alt:''}),el('div',{},[el('span',{class:'admin-mode-eyebrow',text:'QUẢN TRỊ TIẾNG TRUNG'}),el('h2',{text:title}),el('p',{text:description})])]);
async function boot(){
 await initPage('admin','chinese');data=await request('/catalog');notice('');
 if(params.get('view')==='levels')return levels();return tests();
}
function levels(){
 document.querySelector('main>h1').textContent='Các cấp HSK';root().append(heading('Chăm chút từng cấp học','Đổi tên và mô tả cấp HSK. Bài học vẫn nằm trong đúng cấp đang có.'));
 const grid=el('div',{class:'admin-level-grid'});
 for(const l of data.levels){
  const lessons=data.lessons.filter(i=>i.level_id===l.id),f=el('form',{},[field('Tên cấp','title',l.title),field('Mô tả','description',l.description,'textarea')]);
  grid.append(card(`HSK ${l.id}`,[el('span',{class:'admin-role-badge',text:lessons.length+' bài học'}),formSubmit(f,async d=>{await request('/levels/'+l.id,'PUT',d);notice('Đã lưu cấp HSK '+l.id);},'Lưu cấp HSK')]));
 }root().append(grid);
}
async function tests(){
 document.querySelector('main>h1').textContent='Bài kiểm tra';const rows=await request('/tests');
 root().append(heading('Soạn bài kiểm tra từ những bài đã học','Chọn đúng tài liệu nguồn, đặt thời gian và mức đạt trước khi mở cho học sinh.','panda'));
 const tools=el('div',{class:'admin-author-tools'},[adminLink('+ Tạo bài kiểm tra',{view:'tests',test:'new'})]);tools.firstElementChild.classList.add('btn-primary');root().append(tools);
 const list=el('div',{class:'admin-assessment-list'});
 for(const t of rows)list.append(el('article',{class:'card admin-assessment-card'},[el('div',{},[el('span',{class:'admin-content-status '+(t.status==='published'?'published':''),text:t.status==='published'?'Đã cho học sinh xem':t.status==='archived'?'Đã lưu trữ':'Bản nháp'}),el('h2',{text:t.title}),el('p',{class:'muted',text:t.set_ids.map(id=>data.sets.find(s=>s.id===id)?.title||'Nguồn đã xóa').join(' · ')}),el('small',{text:(t.duration_seconds?Math.ceil(t.duration_seconds/60)+' phút':'Không giới hạn thời gian')+' · Đạt từ '+t.pass_percent+'%'})]),adminLink('Sửa bài kiểm tra',{view:'tests',test:t.id})]));
 if(!rows.length)list.append(el('div',{class:'admin-section-empty'},[el('h2',{text:'Chưa có bài kiểm tra'}),el('p',{text:'Thêm bài kiểm tra đầu tiên từ câu hỏi đã soạn trong các bài học.'})]));root().append(list);
 const t=rows.find(t=>t.id===params.get('test'));
 if(rows.length&&!params.has('test'))return;
 const f=el('form',{class:'admin-test-form'},[field('Tên bài kiểm tra','title',t?.title),field('Thời gian (giây, trống = không giới hạn)','duration_seconds',t?.duration_seconds,'number'),field('Phần trăm đạt','pass_percent',t?.pass_percent||70,'number'),field('Trạng thái','status',t?.status||'draft','text',statuses)]);
 f.querySelector('[name=title]').required=true;f.querySelector('[name=pass_percent]').min=1;f.querySelector('[name=pass_percent]').max=100;f.querySelector('[name=duration_seconds]').min=30;
 const sources=el('fieldset',{class:'admin-test-sources'},[el('legend',{text:'Tài liệu nguồn · câu hỏi theo thứ tự tài liệu và thứ tự trong tài liệu'})]);
 for(const lesson of data.lessons){
  const sets=data.sets.filter(s=>s.lesson_id===lesson.id&&(t?.set_ids.includes(s.id)||data.counts.some(c=>c.set_id===s.id&&c.kind==='question'&&Number(c.total)>0)));if(!sets.length)continue;
  const group=el('div',{class:'admin-source-group'},[el('h3',{text:'HSK '+lesson.level_id+' · '+lesson.title})]);
  for(const s of sets){const input=el('input',{type:'checkbox',value:s.id});input.checked=t?.set_ids.includes(s.id)||false;group.append(el('label',{class:'admin-source-choice'},[input,el('span',{text:s.title})]));}sources.append(group);
 }if(!sources.querySelector('input'))sources.append(el('p',{text:'Chưa có tài liệu chứa câu hỏi quiz. Vào bài học → Quiz 20 câu để thêm câu hỏi.'}));f.append(sources);
 const box=card(t?'Sửa bài kiểm tra':'Tạo bài kiểm tra',[formSubmit(f,async d=>{d.set_ids=[...sources.querySelectorAll('input:checked')].map(i=>i.value);d.duration_seconds=d.duration_seconds?Number(d.duration_seconds):null;await request('/tests'+(t?'/'+t.id:''),t?'PUT':'POST',d);location.href='?view=tests';},'Lưu bài kiểm tra')]);
 if(t)box.append(adminAction('Xóa bài kiểm tra',async()=>{if(!confirm(`Xóa bài kiểm tra “${t.title}”? Lịch sử làm bài vẫn được giữ. Không thể hoàn tác.`))return;await request('/tests/'+t.id,'DELETE');location.href='?view=tests';}));root().append(box);
}
boot().catch(error);
