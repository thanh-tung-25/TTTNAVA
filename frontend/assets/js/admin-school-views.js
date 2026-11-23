import {el} from './api.js';
import {schoolParts,schoolContentStatus,schoolAdminDestination} from './admin-school-context.js';
import {paperPeriods,paperPeriodLabel} from './school-paper-periods.js';
export const schoolButton=(text,action,primary=false)=>el('button',{type:'button',class:'btn'+(primary?'':' btn-ghost'),text,onclick:async event=>{const b=event.currentTarget;b.disabled=true;try{await action();}catch(error){document.querySelector('#content-hub-error').textContent=error.message;}finally{b.disabled=false;}}});
export function schoolEmpty(title,message){return el('div',{class:'school-empty'},[el('h3',{text:title}),el('p',{text:message})]);}
const tag=(text,status)=>el('span',{class:'school-content-tag '+(status||''),text});
export function lessonCards(groups,sheets,open){
 const grid=el('div',{class:'school-admin-lessons'});
 for(const [index,group]of groups.entries()){
  const related=sheets.filter(s=>!s.exam_config&&group.parts.some(p=>p.id===s.lesson_id)),card=el('article',{class:'school-admin-lesson','data-group':group.id});
  card.append(el('header',{},[el('div',{},[el('span',{class:'school-eyebrow',text:group.title===group.chapterName?'BÀI HỌC / UNIT':group.chapterName}),el('h3',{text:group.title})]),el('img',{src:'/assets/images/mascot-'+['panda','bunny','lion'][index%3]+'.svg',alt:'',width:60,height:65,loading:'lazy'})]),el('p',{class:'muted',text:group.questionCount+' câu khác nhau đã đăng · '+related.length+' bộ bài tập'}));
  const parts=el('div',{class:'school-admin-parts'});
  for(const [id,label,icon]of schoolParts){
   const count=id==='knowledge'?group.knowledgeCount:id==='examples'?group.exampleCount:id==='quiz'?group.questionCount:related.length;
   const state=id==='quiz'?(count>=20&&group.hasGuide?'Sẵn sàng':(count>=20?'Đủ câu':'Cần '+(20-count)+' câu nữa')+(!group.hasGuide?' · chưa đăng kiến thức':'')):id==='worksheets'?(count?related.filter(s=>s.status==='published').length+' bộ đã đăng':'Thêm bộ bài tập'):(count?count+' mục · '+schoolContentStatus(group.guideStatus):'Thêm nội dung');
   const b=schoolButton('',()=>open(group,id));b.setAttribute('aria-label',label+' · '+group.title);b.replaceChildren(el('span',{class:'school-part-icon',text:icon,'aria-hidden':'true'}),el('strong',{text:label}),el('small',{text:state}));parts.append(b);
  }
  card.append(parts);grid.append(card);
 }
 return groups.length?grid:schoolEmpty('Chưa có bài học phù hợp','Chọn chương hoặc thêm bài học để bắt đầu soạn nội dung.');
}
export function partTabs(active,change){return el('nav',{class:'school-part-tabs','aria-label':'Các phần của bài học'},schoolParts.map(([id,label])=>{const b=schoolButton(label,()=>change(id));b.setAttribute('aria-pressed',String(active===id));return b;}));}
export function paperList(papers,scope,{period,changePeriod,create,uploadWord,edit,preview,remove,query=''}){
 const box=el('div'),nav=el('nav',{class:'school-period-tabs','aria-label':'Chọn đợt thi'});
 for(const [id,label]of [['all','Tất cả'],...paperPeriods]){const count=papers.filter(p=>id==='all'||(p.exam_config.period||'other')===id).length,b=schoolButton(label+' · '+count,()=>changePeriod(id));b.setAttribute('aria-pressed',String(period===id));nav.append(b);}
 const add=schoolButton('+ Thêm đề thi',create,true);add.disabled=period==='all';
 box.append(el('section',{class:'school-word-upload','aria-label':'Nhập đề thi Word'},[el('span',{class:'school-word-upload-icon','aria-hidden':'true',text:'▤'}),el('div',{},[el('h3',{text:'Có sẵn đề trắc nghiệm trong Word?'}),el('p',{text:'Tải tệp .docx để đọc câu hỏi, lựa chọn và đáp án. Xem, sửa trước khi lưu thành đề nháp.'})]),schoolButton('Tải đề thi từ Word',uploadWord,true)]),nav,el('div',{class:'school-section-intro'},[el('div',{},[el('h3',{text:period==='all'?'Đề thi của môn học':paperPeriodLabel(period)}),el('p',{text:period==='all'?'Chọn đợt thi trước khi thêm đề thủ công, hoặc chọn trong cửa sổ tải Word.':'Đề mới được đặt sẵn đúng lớp, môn và đợt thi này.'})]),add]));
 const visible=papers.filter(p=>(period==='all'||(p.exam_config.period||'other')===period)&&p.title.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
 for(const paper of visible)box.append(el('article',{class:'school-paper-row','data-paper':paper.id},[el('div',{},[tag(schoolContentStatus(paper.status),paper.status),el('h3',{text:paper.title}),el('p',{text:paper.item_count+' câu / ý · '+paper.exam_config.duration_minutes+' phút'}),el('p',{class:'school-row-destination',text:schoolAdminDestination({grade:paper.grade,subjectId:paper.subject_id,mode:'papers',period:paper.exam_config.period})})]),el('div',{class:'school-row-actions'},[schoolButton('Mở soạn đề',()=>edit(paper)),schoolButton('Xem như học sinh',()=>preview(paper)),schoolButton('Xóa / lưu trữ',()=>remove(paper))])]));
 if(!visible.length)box.append(schoolEmpty('Chưa có đề phù hợp','Bạn có thể thêm đề vào đúng đợt thi đã chọn. Đề nháp sẽ chỉ hiện với giáo viên.'));return box;
}
export function checkCatalog(data,kind,change,source){
 const box=el('div'),nav=el('nav',{class:'school-period-tabs','aria-label':'Phạm vi bài kiểm tra'});
 for(const [id,label]of [['chapter','Theo chủ đề'],['semester','Theo học kì'],['annual','Cả năm']]){const b=schoolButton(label,()=>change(id));b.setAttribute('aria-pressed',String(kind===id));nav.append(b);}
 box.append(nav,el('p',{class:'school-context-note',text:'Học sinh nhận câu hỏi từ ngân hàng đã đăng của phạm vi này. Bổ sung câu hỏi trong bài học để mở đủ bài kiểm tra.'}));
 const entries=kind==='chapter'?data.chapters:kind==='semester'?data.semesters:[{...data.annual,name:'Kiểm tra cả năm'}],grid=el('div',{class:'school-check-grid'});
 for(const entry of entries){const missing=Math.max(0,entry.count-entry.questionCount);grid.append(el('article',{class:'school-check-card'},[tag(missing?'Cần thêm '+missing+' câu':'Đủ câu để tạo bài kiểm tra',missing?'draft':'published'),el('h3',{text:entry.name}),el('p',{text:entry.questionCount+' / '+entry.count+' câu đã đăng · '+entry.durationSeconds/60+' phút'}),schoolButton('Quản lý câu hỏi',()=>source(kind==='chapter'?{chapterId:entry.id,semester:entry.semester}:kind==='semester'?{semester:entry.id}:{}))]));}
 box.append(entries.length?grid:schoolEmpty('Chưa có chủ đề','Thêm chương và câu hỏi trong Bài học để tạo phạm vi kiểm tra.'));return box;
}
