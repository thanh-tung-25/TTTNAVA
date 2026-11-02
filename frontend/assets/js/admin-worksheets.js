import {api,el} from './api.js';
import {initPage} from './ui-core.js';
import {ITEM_TYPES,renderItem,resultBlock,imageUrl} from './worksheet-player.js';
import {answerFields,collectFields} from './worksheet-fields.js';
import {loadReviews} from './admin-worksheet-reviews.js';
import {store} from './admin-questions-context.js';
import {selectedScope} from './admin-content-curriculum.js';
import {SUBJECTS} from './primary-subjects.js';
const base='/api/v1/worksheets',workspace=document.querySelector('#ws-workspace'),notice=document.querySelector('#ws-notice'),dialog=document.querySelector('#ws-preview');
let sheet=null,index=0,dirty=false,previewAnswer,previewItem;
const button=(text,fn,ghost=false)=>el('button',{type:'button',class:'btn'+(ghost?' btn-ghost':''),text,onclick:()=>Promise.resolve().then(fn).catch(fail)});
function fail(e){notice.textContent=e.message+(e.details?.some?.(d=>d.path?.[0]==='items')?' — Kiểm tra đề bài và đáp án của từng câu.':'');}
async function list(){
 if(document.body.dataset.contentHub==='unified'){document.dispatchEvent(new Event('content:changed'));return;}
 const {data}=await api(base+'/admin');const root=document.querySelector('#ws-list');
 root.replaceChildren(...(data.length?data.map(s=>{const b=button(s.title+' · Lớp '+s.grade+' · '+s.item_count+' câu · '+({draft:'Nháp',published:'Đã đăng',hidden:'Đang ẩn'}[s.status]),()=>open(s.id),true);if(s.id===sheet?.id)b.setAttribute('aria-current','true');return b;}):[el('p',{class:'muted',text:'Chưa có bộ bài. Nội dung sẽ do bạn tự nhập.'})]));
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
 const item=sheet.items[index];if(!item)return;item.prompt=workspace.querySelector('[name=prompt]').value;item.explanation=workspace.querySelector('[name=explanation]').value;Object.assign(item,collectFields(item.type,workspace.querySelector('.worksheet-fields')));
}
function render(){
 const placement=el('div',{class:'worksheet-placement'}),scope=selectedScope();
 let path='Chưa xếp bài học';
 for(const grade of store.tree?.grades||[])for(const semester of grade.semesters)for(const subject of semester.subjects)for(const chapter of subject.chapters)for(const lesson of chapter.lessons)if(lesson.id===sheet.lesson_id)path=[grade.name,semester.name,subject.name,chapter.name,lesson.name].join(' › ');
 placement.append(el('p',{text:path}));
 if(scope?.lessonId&&scope.lessonId!==sheet.lesson_id)placement.append(button('Xếp vào bài đang chọn',()=>{commit();sheet.lesson_id=scope.lessonId;sheet.grade=scope.grade;sheet.subject_id=scope.subjectId;dirty=true;render();},true));
 if(!sheet.lesson_id)placement.append(el('p',{class:'muted',text:'Chọn đến bài học trong chương trình ở trên, mở lại bộ bài và bấm Xếp vào bài đang chọn.'}));
 const meta=el('div',{class:'worksheet-meta'},[field('Tên bộ bài','title',sheet.title),field('Lớp','grade','','select'),field('Môn học','subject_id','','select')]);
 const grades=meta.querySelector('[name=grade]');for(let n=1;n<=5;n++)grades.append(el('option',{value:n,text:'Lớp '+n}));grades.value=sheet.grade;
 const subjects=meta.querySelector('[name=subject_id]');for(const [id,title]of SUBJECTS)subjects.append(el('option',{value:id,text:title}));subjects.value=sheet.subject_id;
 if(sheet.lesson_id){grades.disabled=true;subjects.disabled=true;}
 const tabs=el('div',{class:'worksheet-question-tabs','aria-label':'Các câu hỏi'});
 sheet.items.forEach((item,n)=>{const b=button('Câu '+(n+1),()=>{commit();index=n;render();},true);if(n===index)b.setAttribute('aria-current','true');tabs.append(b);});
 const type=el('select',{class:'select',id:'ws-add-type','aria-label':'Dạng bài mới'});Object.entries(ITEM_TYPES).forEach(([value,text])=>type.append(el('option',{value,text})));
 const add=button('+ Thêm câu',()=>{commit();sheet.items.push({id:crypto.randomUUID(),type:type.value,prompt:'',explanation:'',imageId:null,config:{},answer:{}});index=sheet.items.length-1;dirty=true;render();});
 workspace.replaceChildren(meta,el('p',{class:'worksheet-status',text:sheet.status==='published'?'Đã đăng cho học sinh':sheet.status==='hidden'?'Đang ẩn':'Bản nháp'}),el('div',{class:'worksheet-toolbar'},[button('Lưu nháp',()=>save('draft')),button('Đăng bài',()=>save('published')),button('Ẩn bài',()=>save('hidden'),true),button('Xóa bộ bài',()=>removeWorksheet(sheet.id,sheet.version),true)]),tabs,el('div',{class:'worksheet-toolbar'},[type,add]));
 workspace.prepend(placement);
 const item=sheet.items[index];if(item){
  const editor=el('div',{class:'worksheet-editor'},[el('h2',{text:'Câu '+(index+1)+' · '+ITEM_TYPES[item.type]}),field('Đề bài','prompt',item.prompt,'textarea'),answerFields(item),field('Lời giải / hướng dẫn sau khi làm','explanation',item.explanation,'textarea')]);
  const image=el('input',{type:'file',accept:'image/png,image/jpeg','aria-label':'Tải ảnh minh họa'});
  image.onchange=async()=>{try{commit();const file=image.files[0];if(!file)return;const body=new FormData();body.append('image',file);item.imageId=(await api(base+'/admin/'+sheet.id+'/images',{method:'POST',body})).data.id;dirty=true;render();}catch(e){fail(e);}};
  editor.append(el('label',{class:'field'},[el('span',{text:'Hình minh họa (không bắt buộc; PNG/JPEG, tối đa 2 MB)'}),image]));
  if(item.imageId)editor.append(el('img',{class:'worksheet-illustration',src:imageUrl(item.imageId),alt:'Hình minh họa đã tải'}),button('Bỏ hình',()=>{commit();item.imageId=null;dirty=true;render();},true));
  editor.append(el('div',{class:'worksheet-editor-actions'},[button('Xem thử câu này',preview,true),button('Xóa câu',()=>{if(!confirm('Xóa câu này khỏi bộ bài?'))return;sheet.items.splice(index,1);index=Math.max(0,index-1);dirty=true;render();},true)]));workspace.append(editor);
 }else workspace.append(el('p',{class:'muted',text:'Chọn dạng bài và bấm Thêm câu. Bạn có thể nhập nội dung từ tài liệu của mình sau.'}));
 workspace.oninput=workspace.onchange=()=>dirty=true;
}
async function save(status){
 commit();notice.textContent='Đang lưu…';const data=structuredClone(sheet);data.status=status;
 sheet=(await api(base+'/admin/'+sheet.id,{method:'PUT',body:data})).data;dirty=false;render();await list();notice.textContent=status==='published'?'Đã đăng. Học sinh của khóa Lớp '+sheet.grade+' có thể vào làm.':'Đã lưu bộ bài.';
}
function preview(){
 commit();previewItem=structuredClone(sheet.items[index]);previewAnswer=undefined;const publicItem=structuredClone(previewItem);if(publicItem.type==='ordering')publicItem.config.tokens=[...(publicItem.config.tokens||[])].reverse();
 document.querySelector('#ws-preview-content').replaceChildren(renderItem(publicItem,undefined,v=>previewAnswer=v));document.querySelector('#ws-preview-feedback').replaceChildren();dialog.showModal();
}
document.querySelector('#ws-preview-close').onclick=()=>dialog.close();
document.querySelector('#ws-preview-check').onclick=async()=>{try{const {data}=await api(base+'/admin/preview',{method:'POST',body:{item:previewItem,answer:previewAnswer}});document.querySelector('#ws-preview-feedback').replaceChildren(resultBlock(data));}catch(e){document.querySelector('#ws-preview-feedback').textContent=e.message+' — Nhập đủ đề bài, cấu hình và đáp án trước khi xem thử.';}};
export async function createWorksheet(scope=selectedScope()){
 if(dirty&&!confirm('Bỏ thay đổi chưa lưu để tạo bộ mới?'))return;
 sheet=(await api(base+'/admin',{method:'POST',body:{title:'Bộ bài tập mới',grade:scope?.grade||1,subject_id:scope?.subjectId||'toan',lesson_id:scope?.lessonId||null,status:'draft',items:[]}})).data;index=0;dirty=false;render();await list();
 return true;
}
document.querySelector('#ws-new').onclick=()=>createWorksheet().catch(fail);
document.querySelector('#ws-review-tab').onclick=()=>{document.querySelector('#ws-authoring').hidden=true;document.querySelector('#ws-reviews').hidden=false;loadReviews().catch(fail);};
document.querySelector('#ws-edit-tab').onclick=()=>{document.querySelector('#ws-authoring').hidden=false;document.querySelector('#ws-reviews').hidden=true;};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
document.addEventListener('curriculum:selected',()=>{if(sheet){commit();render();}});
if(document.body.dataset.contentHub!=='unified')initPage('admin','worksheets').then(list).catch(fail);
