import {api,el} from './api.js';
import {initPage} from './ui-core.js';
import {ITEM_TYPES,renderItem,resultBlock,imageUrl} from './worksheet-player.js';
import {answerFields,collectFields} from './worksheet-fields.js';
import {loadReviews} from './admin-worksheet-reviews.js';
import {store} from './admin-questions-context.js';
import {selectedScope} from './admin-content-curriculum.js';
import {subjectsFor,subjectName} from './primary-subjects.js';
import {adminGrades} from './admin-permissions.js';
import {paperPeriods} from './school-paper-periods.js';
const base='/api/v1/worksheets',workspace=document.querySelector('#ws-workspace'),notice=document.querySelector('#ws-notice'),dialog=document.querySelector('#ws-preview');
let sheet=null,index=0,dirty=false,previewAnswer,previewItem,availableGrades=adminGrades();
if(new URLSearchParams(location.search).has('exams')){document.querySelector('main h1').textContent='Soạn và quản lý đề thi';document.querySelector('#ws-new').textContent='+ Tạo đề thi';document.querySelector('.worksheet-layout aside h2').textContent='Danh sách đề thi';}
const button=(text,fn,ghost=false)=>el('button',{type:'button',class:'btn'+(ghost?' btn-ghost':''),text,onclick:()=>Promise.resolve().then(fn).catch(fail)});
function fail(e){notice.textContent=e.message+(e.details?.some?.(d=>d.path?.[0]==='items')?' — Kiểm tra đề bài và đáp án của từng câu.':'');}
async function list(){
 if(document.body.dataset.contentHub==='unified'){document.dispatchEvent(new Event('content:changed'));return;}
 const {data}=await api(base+'/admin');const root=document.querySelector('#ws-list'),rows=new URLSearchParams(location.search).has('exams')?data.filter(row=>row.exam_config):data;
 root.replaceChildren(...(rows.length?rows.map(s=>{const b=button(s.title+' · Lớp '+s.grade+' · '+s.item_count+' câu · '+({draft:'Nháp',published:'Đã đăng',hidden:'Đang ẩn'}[s.status]),()=>open(s.id),true);if(s.id===sheet?.id)b.setAttribute('aria-current','true');return b;}):[el('p',{class:'muted',text:'Chưa có bộ bài. Nội dung sẽ do bạn tự nhập.'})]));
}
export async function openWorksheet(id){if(dirty&&!confirm('Bỏ các thay đổi chưa lưu để mở bộ khác?'))return false;sheet=(await api(base+'/admin/'+id)).data;index=0;dirty=false;render();await list();return true;}
const open=openWorksheet;
export function closeWorksheet(){if(dirty&&!confirm('Bỏ thay đổi chưa lưu?'))return false;sheet=null;dirty=false;workspace.replaceChildren();return true;}
export async function removeWorksheet(id,version){
 if(!confirm('Xóa bộ bài này? Nếu đã có học sinh làm, bộ bài sẽ được ẩn để giữ lịch sử.'))return;
 if(sheet?.id===id&&dirty&&!confirm('Bộ đang có thay đổi chưa lưu. Vẫn tiếp tục xóa?'))return;
 const {data}=await api(base+'/admin/'+id+'?version='+version,{method:'DELETE'});
 if(sheet?.id===id){dirty=false;sheet=null;workspace.replaceChildren();document.querySelector('#content-worksheets').hidden=true;}
 notice.textContent=data.message;const hubNotice=document.querySelector('#content-hub-error');if(hubNotice)hubNotice.textContent=data.message;await list();return data;
}
function field(label,name,value,type='input'){
 const input=el(type,{class:type==='textarea'?'textarea':type==='select'?'select':'input',name,...(type==='input'?{type:'text'}:{})});if(type!=='select')input.value=value??'';return el('label',{class:'field'},[el('span',{text:label}),input]);
}
function commit(){
 if(!sheet)return;sheet.title=workspace.querySelector('[name=title]').value.trim();sheet.grade=Number(workspace.querySelector('[name=grade]').value);sheet.subject_id=workspace.querySelector('[name=subject_id]').value;
 const exam=workspace.querySelector('[name=exam-purpose]');if(exam?.checked)sheet.exam_config={...(sheet.exam_config||{}),duration_minutes:Number(workspace.querySelector('[name=exam-minutes]').value),semester:workspace.querySelector('[name=exam-semester]').value,period:workspace.querySelector('[name=exam-period]').value,short_points:Number(workspace.querySelector('[name=exam-short-points]').value),scoring:workspace.querySelector('[name=exam-scoring]').value};else sheet.exam_config=null;
 const item=sheet.items[index];if(!item)return;item.prompt=workspace.querySelector('[name=prompt]').value;item.explanation=workspace.querySelector('[name=explanation]').value;Object.assign(item,collectFields(item.type,workspace.querySelector('.worksheet-fields')));
 item.grading=workspace.querySelector('[name=grading]')?.value||'active';item.review_note=workspace.querySelector('[name=review-note]')?.value||'';
 const points=workspace.querySelector('[name=item-points]');if(points){if(points.value.trim())item.points=Number(points.value.replace(',','.'));else delete item.points;}
}
function render(){
 const placement=el('div',{class:'worksheet-placement'}),scope=selectedScope();
 let path='Chưa xếp bài học';
 for(const grade of store.tree?.grades||[])for(const semester of grade.semesters)for(const subject of semester.subjects)for(const chapter of subject.chapters)for(const lesson of chapter.lessons)if(lesson.id===sheet.lesson_id)path=[grade.name,semester.name,subject.name,chapter.name,lesson.name].join(' › ');
 if(sheet.exam_config&&!sheet.lesson_id)path='Bài thi · Lớp '+sheet.grade+' · '+subjectName(sheet.subject_id,sheet.grade);
 placement.append(el('p',{text:path}));
 if(scope?.lessonId&&scope.lessonId!==sheet.lesson_id)placement.append(button('Xếp vào bài đang chọn',()=>{commit();sheet.lesson_id=scope.lessonId;sheet.grade=scope.grade;sheet.subject_id=scope.subjectId;dirty=true;render();},true));
 if(!sheet.lesson_id)placement.append(el('p',{class:'muted',text:'Chọn đến bài học trong chương trình ở trên, mở lại bộ bài và bấm Xếp vào bài đang chọn.'}));
 const meta=el('div',{class:'worksheet-meta'},[field('Tên bộ bài','title',sheet.title),field('Lớp','grade','','select'),field('Môn học','subject_id','','select')]);
 const grades=meta.querySelector('[name=grade]');for(const n of store.tree?.grades.map(g=>g.grade)||availableGrades)grades.append(el('option',{value:n,text:'Lớp '+n}));grades.value=sheet.grade;
 const subjects=meta.querySelector('[name=subject_id]');
 const labelSubjects=()=>{const selected=subjects.value||sheet.subject_id;subjects.replaceChildren(...subjectsFor({grade:grades.value}).map(([id])=>el('option',{value:id,text:subjectName(id,grades.value)})));subjects.value=selected;if(!subjects.value)subjects.value='toan';};
 labelSubjects();grades.onchange=()=>{labelSubjects();if(!sheet.items.length){const mode=workspace.querySelector('[name=exam-scoring]');if(mode){mode.value=Number(grades.value)<10?'school-points':'thpt-2025';commit();render();}}};
 if(sheet.lesson_id){grades.disabled=true;subjects.disabled=true;}
 const tabs=el('div',{class:'worksheet-question-tabs','aria-label':'Các câu hỏi'});
 sheet.items.forEach((item,n)=>{const b=button('Câu '+(n+1),()=>{commit();index=n;render();},true);if(n===index)b.setAttribute('aria-current','true');tabs.append(b);});
 const type=el('select',{class:'select',id:'ws-add-type','aria-label':'Dạng bài mới'});Object.entries(ITEM_TYPES).forEach(([value,text])=>type.append(el('option',{value,text})));
 const add=button('+ Thêm câu',()=>{commit();sheet.items.push({id:crypto.randomUUID(),type:type.value,prompt:'',explanation:'',imageId:null,config:{},answer:{}});index=sheet.items.length-1;dirty=true;render();});
 workspace.replaceChildren(meta,el('p',{class:'worksheet-status',text:sheet.status==='published'?'Đã đăng cho học sinh':sheet.status==='hidden'?'Đang ẩn':'Bản nháp'}),el('div',{class:'worksheet-toolbar'},[button('Lưu nháp',()=>save('draft')),button('Đăng bài',()=>save('published')),button('Ẩn bài',()=>save('hidden'),true),button('Xóa bộ bài',()=>removeWorksheet(sheet.id,sheet.version),true)]),tabs,el('div',{class:'worksheet-toolbar'},[type,add]));
 workspace.prepend(placement);
 const purpose=el('input',{type:'checkbox',name:'exam-purpose'});purpose.checked=Boolean(sheet.exam_config);
 const minutes=field('Thời gian làm bài (phút)','exam-minutes',sheet.exam_config?.duration_minutes||50),semester=field('Học kì của đề','exam-semester','','select'),shortPoints=field('Điểm mỗi câu trả lời ngắn','exam-short-points','','select');
 for(const [value,text]of [['hk1','Học kì 1'],['hk2','Học kì 2'],['year','Cả năm']])semester.lastChild.append(el('option',{value,text}));semester.lastChild.value=sheet.exam_config?.semester||'hk1';
 for(const value of [.25,.5])shortPoints.lastChild.append(el('option',{value,text:String(value)}));shortPoints.lastChild.value=sheet.exam_config?.short_points||.25;
 const period=field('Đợt thi','exam-period','','select');for(const [value,text]of paperPeriods)period.lastChild.append(el('option',{value,text}));period.lastChild.value=sheet.exam_config?.period||'other';period.lastChild.onchange=()=>{const choice=paperPeriods.find(([id])=>id===period.lastChild.value);if(choice&&choice[0]!=='other')semester.lastChild.value=choice[2];dirty=true;};
 const scoring=field('Cách tính điểm','exam-scoring','','select');for(const [value,text]of [['school-points','Điểm riêng cho từng câu / ý'],['thpt-2025','Đề THPT ba phần']])scoring.lastChild.append(el('option',{value,text}));scoring.lastChild.value=sheet.exam_config?.scoring||(sheet.grade<10?'school-points':'thpt-2025');scoring.lastChild.onchange=()=>{commit();dirty=true;render();};
 shortPoints.hidden=scoring.lastChild.value==='school-points';
 const settings=el('div',{class:'worksheet-toolbar'},[period,minutes,semester,scoring,shortPoints]);settings.hidden=!purpose.checked;purpose.onchange=()=>{commit();dirty=true;render();};
 workspace.prepend(el('section',{class:'card worksheet-exam-settings'},[el('label',{},[purpose,el('strong',{text:' Đăng trong Đề thi (đề do giáo viên soạn, có thời gian)'})]),settings,el('p',{class:'muted',text:scoring.lastChild.value==='school-points'?'Nhập điểm tối đa cho từng câu hoặc ý, cộng đủ 10 điểm. Các ý đúng/sai được chia đều điểm của câu. Học sinh nhập đáp án, nộp bài rồi xem lời giải.':'Đề THPT: chọn đáp án 0,25 điểm/câu; đúng/sai bốn ý 0,1 / 0,25 / 0,5 / 1 điểm.'})]));
 const item=sheet.items[index];if(item){
  const editor=el('div',{class:'worksheet-editor'},[el('h2',{text:'Câu '+(index+1)+' · '+ITEM_TYPES[item.type]}),field('Đề bài','prompt',item.prompt,'textarea'),answerFields(item,{schoolPoints:sheet.exam_config?.scoring==='school-points'}),field('Lời giải / hướng dẫn sau khi làm','explanation',item.explanation,'textarea')]);
  const grading=field('Cách tính điểm câu này','grading','','select');for(const [value,text]of [['active','Tính điểm theo đáp án'],['excluded','Câu tham khảo, không tính điểm']])grading.lastChild.append(el('option',{value,text}));grading.lastChild.value=item.grading||'active';editor.append(grading,field('Ghi chú kiểm tra đề / lý do không tính điểm','review-note',item.review_note||'','textarea'));
  if(sheet.exam_config?.scoring==='school-points'){const points=field('Điểm tối đa của câu / ý này','item-points',item.points??'');points.lastChild.inputMode='decimal';editor.prepend(points);}
  const image=el('input',{type:'file',accept:'image/png,image/jpeg','aria-label':'Tải ảnh minh họa'});
  image.onchange=async()=>{try{commit();const file=image.files[0];if(!file)return;const body=new FormData();body.append('image',file);item.imageId=(await api(base+'/admin/'+sheet.id+'/images',{method:'POST',body})).data.id;dirty=true;render();}catch(e){fail(e);}};
  editor.append(el('label',{class:'field'},[el('span',{text:'Hình minh họa (không bắt buộc; PNG/JPEG, tối đa 2 MB)'}),image]));
  if(item.imageId)editor.append(el('img',{class:'worksheet-illustration',src:imageUrl(item.imageId),alt:'Hình minh họa đã tải'}),button('Bỏ hình',()=>{commit();item.imageId=null;dirty=true;render();},true));
  const solutions=el('input',{type:'file',accept:'image/png,image/jpeg',multiple:true,'aria-label':'Tải ảnh hướng dẫn giải'});
  solutions.onchange=async()=>{try{commit();const files=[...solutions.files];if((item.solutionImageIds?.length||0)+files.length>8)throw new Error('Mỗi câu có tối đa 8 ảnh hướng dẫn giải.');for(const file of files){const body=new FormData();body.append('image',file);item.solutionImageIds||=[];item.solutionImageIds.push((await api(base+'/admin/'+sheet.id+'/images?purpose=solution',{method:'POST',body})).data.id);}dirty=true;render();}catch(e){fail(e);}};
  editor.append(el('label',{class:'field'},[el('span',{text:'Ảnh hướng dẫn giải (học sinh chỉ xem được sau khi nộp bài)'}),solutions]));
  for(const [n,id]of (item.solutionImageIds||[]).entries())editor.append(el('img',{class:'worksheet-solution-image',src:imageUrl(id),alt:'Ảnh hướng dẫn giải '+(n+1)}),button('Bỏ ảnh hướng dẫn '+(n+1),()=>{commit();item.solutionImageIds.splice(n,1);dirty=true;render();},true));
  editor.append(el('div',{class:'worksheet-editor-actions'},[button('Xem thử câu này',preview,true),button('Xóa câu',()=>{if(!confirm('Xóa câu này khỏi bộ bài?'))return;sheet.items.splice(index,1);index=Math.max(0,index-1);dirty=true;render();},true)]));workspace.append(editor);
 }else workspace.append(el('p',{class:'muted',text:'Chọn dạng bài và bấm Thêm câu. Bạn có thể nhập nội dung từ tài liệu của mình sau.'}));
 workspace.oninput=workspace.onchange=()=>dirty=true;
}
async function save(status){
 commit();notice.textContent='Đang lưu…';const data=structuredClone(sheet);data.status=status;
 sheet=(await api(base+'/admin/'+sheet.id,{method:'PUT',body:data})).data;dirty=false;render();await list();notice.textContent=status==='published'?'Đã đăng. Học sinh của khóa Lớp '+sheet.grade+' có thể vào làm.':'Đã lưu bộ bài.';
}
function preview(){
 commit();dialog.classList.toggle('worksheet-exam-player',Boolean(sheet.exam_config));previewItem=structuredClone(sheet.items[index]);previewAnswer=undefined;const publicItem=structuredClone(previewItem);if(publicItem.type==='ordering')publicItem.config.tokens=[...(publicItem.config.tokens||[])].reverse();
 document.querySelector('#ws-preview-content').replaceChildren(renderItem(publicItem,undefined,v=>previewAnswer=v));document.querySelector('#ws-preview-feedback').replaceChildren();dialog.showModal();
}
document.querySelector('#ws-preview-close').onclick=()=>dialog.close();
document.querySelector('#ws-preview-check').onclick=async()=>{try{const {data}=await api(base+'/admin/preview',{method:'POST',body:{item:previewItem,answer:previewAnswer,exam_config:sheet.exam_config}});document.querySelector('#ws-preview-feedback').replaceChildren(resultBlock(data));}catch(e){document.querySelector('#ws-preview-feedback').textContent=e.message+' — Nhập đủ đề bài, cấu hình và đáp án trước khi xem thử.';}};
export async function createWorksheet(scope=selectedScope(),examMode=new URLSearchParams(location.search).has('exams')){
 if(dirty&&!confirm('Bỏ thay đổi chưa lưu để tạo bộ mới?'))return;
 const grade=scope?.grade||store.tree?.grades[0]?.grade||availableGrades[0];
 sheet=(await api(base+'/admin',{method:'POST',body:{title:examMode?'Đề thi mới':'Bộ bài tập mới',grade,subject_id:scope?.subjectId||'toan',lesson_id:scope?.lessonId||null,status:'draft',exam_config:examMode?{duration_minutes:50,semester:scope?.semester==='hk2'?'hk2':'hk1',scoring:grade<10?'school-points':'thpt-2025',short_points:.25}:null,items:[]}})).data;index=0;dirty=false;render();await list();
 return true;
}
document.querySelector('#ws-new').onclick=()=>createWorksheet().catch(fail);
document.querySelector('#ws-review-tab').onclick=()=>{document.querySelector('#ws-authoring').hidden=true;document.querySelector('#ws-reviews').hidden=false;loadReviews().catch(fail);};
document.querySelector('#ws-edit-tab').onclick=()=>{document.querySelector('#ws-authoring').hidden=false;document.querySelector('#ws-reviews').hidden=true;};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
document.addEventListener('curriculum:selected',()=>{if(sheet){commit();render();}});
if(document.body.dataset.contentHub!=='unified')initPage('admin','worksheets').then(profile=>{availableGrades=adminGrades(profile);return list();}).catch(fail);
