import {api,el} from './api.js';
import {initPage} from './ui-core.js';
import {openWorksheet,createWorksheet,closeWorksheet,removeWorksheet,configureWorksheetGrades} from './admin-worksheets.js';
import {openCreate,openDetail,changeStatus} from './admin-question-editor.js';
import {initCurriculum,selectedScope,loadCurriculum,selectContentLesson,refreshCurriculumView,addCurriculum} from './admin-content-curriculum.js';
import {store} from './admin-questions-context.js';
import {openImport} from './admin-questions-import.js';
import {openWordHistory} from './admin-word-history.js';
import {editSchoolGuide} from './admin-school-guide.js';
import {schoolModes,schoolParts,schoolAdminDestination,schoolContentStatus,scopeForSchoolGroup} from './admin-school-context.js';
import {schoolButton as button,schoolEmpty,lessonCards,partTabs,paperList,checkCatalog} from './admin-school-views.js';
import {previewSchoolPaper,previewSchoolGroup} from './admin-school-preview.js';
const root=document.querySelector('#content-list'),notice=document.querySelector('#content-hub-error'),editor=document.querySelector('#content-worksheets'),filters=document.querySelector('#content-filters'),heading=document.querySelector('#school-workspace-heading'),tools=document.querySelector('#school-workspace-tools'),pagination=document.querySelector('.content-pagination');
const params=new URLSearchParams(location.search);store.workspace={mode:schoolModes.some(([id])=>id===params.get('mode'))?params.get('mode'):params.get('view')==='papers'?'papers':'lessons',part:schoolParts.some(([id])=>id===params.get('part'))?params.get('part'):'knowledge',period:params.get('period')||'all',checkKind:'chapter'};
let sequence=0,page=1,pages=1,sheets=[],catalog={groups:[]},cache=new Map(),advanced=false;
const workspace=store.workspace;
function persist(){const url=new URL(location.href);for(const key of ['mode','part','period'])url.searchParams.set(key,workspace[key]);url.searchParams.delete('view');history.replaceState(null,'',url);}
function guard(){if(!closeWorksheet())return false;editor.hidden=true;return true;}
function showEditor(){editor.hidden=false;document.querySelector('#ws-authoring').hidden=false;document.querySelector('#ws-reviews').hidden=true;editor.scrollIntoView({block:'start',behavior:'smooth'});}
function destination(scope,group){document.querySelector('#content-placement').textContent=schoolAdminDestination({grade:scope.grade,subjectId:scope.subjectId,mode:workspace.mode,part:workspace.part,group,period:workspace.period});document.querySelector('#content-placement-hint').textContent=workspace.mode==='papers'?'Đề thi được quản lý theo lớp, môn và đợt thi; không gắn vào một bài học.':workspace.mode==='checks'?'Chỉ câu hỏi đã đăng mới được đưa vào bài kiểm tra.':'Nội dung nháp chỉ dành cho giáo viên. Sau khi đăng, học sinh thấy ở đúng vị trí trên.';}
function nav(){document.querySelector('#school-mode-nav').replaceChildren(...schoolModes.map(([id,label,description])=>{const b=button('',()=>{if(!guard())return;workspace.mode=id;advanced=false;persist();if(selectedScope()?.unassigned)selectContentLesson({...selectedScope(),unassigned:undefined});else{refreshCurriculumView();load();}});b.setAttribute('aria-pressed',String(workspace.mode===id));b.replaceChildren(el('strong',{text:label}),el('small',{text:description}));return b;}));}
async function getCatalog(scope){const key=scope.grade+'/'+scope.yearId;if(!cache.has(key))cache.set(key,api('/api/v1/admin/content/study-catalog?'+new URLSearchParams({grade:scope.grade,yearId:scope.yearId})).then(p=>p.data).catch(error=>{cache.delete(key);throw error;}));return cache.get(key);}
function scopeFields(scope,{group,kind}={}){const fields={yearId:scope.yearId,grade:scope.grade,subjectId:scope.subjectId,purpose:'lesson',...(scope.semester?{semester:scope.semester}:{}),...(scope.chapterId?{chapterId:scope.chapterId}:{}),...(kind?{kind}:{})};if(group){if(group.parts.length===1)fields.lessonId=group.parts[0].id;else fields.chapterId=group.chapterId;}if(scope.unassigned)fields.unassigned='1';return fields;}
async function publishAll(group,scope){
 const targets=group.parts.length?group.parts.map(p=>p.id):[scope.lessonId],{data}=await api('/api/v1/admin/content/publish-questions',{method:'POST',body:{lessonIds:targets}}),total=data.published;
 notice.textContent=total?'Đã đăng '+total+' câu hỏi tại '+schoolAdminDestination({grade:scope.grade,subjectId:scope.subjectId,group,part:'quiz'}):'Không còn câu hỏi nháp cần đăng.';await refresh();
}
async function listBank(scope,group,kind,token){
 filters.hidden=false;pagination.hidden=false;
 const query=new URLSearchParams({...scopeFields(scope,{group,kind}),page,...Object.fromEntries([...new FormData(filters)].filter(([,v])=>v))}),payload=await api('/api/v1/admin/content?'+query);if(token!==sequence)return;
 pages=Math.max(1,Math.ceil(payload.pagination.total/20));if(page>pages){page=pages;return load();}
 root.replaceChildren(...payload.data.map(item=>el('article',{class:'school-content-row'},[el('div',{},[el('h3',{text:item.title}),el('span',{class:'school-content-tag '+item.status,text:schoolContentStatus(item.status)}),el('p',{text:item.kind==='worksheet'?item.item_count+' câu / ý':'Câu hỏi trong ngân hàng'})]),el('div',{class:'school-row-actions'},[button('Mở chỉnh sửa',async()=>{if(item.kind==='worksheet'){if(await openWorksheet(item.id))showEditor();}else{if(guard())await openDetail(item.id);}}),...(item.kind==='question'?[button(item.status==='published'?'Ẩn câu hỏi':'Đăng câu hỏi',()=>changeStatus(item.id,item.status==='published'?'hidden':'published'))]:[button('Xóa / lưu trữ',async()=>{if(await removeWorksheet(item.id,item.version))await refresh();})])])])));
 if(!payload.data.length)root.append(schoolEmpty('Chưa có nội dung phù hợp','Thêm nội dung mới hoặc thay đổi bộ lọc trạng thái.'));
 document.querySelector('#content-page').textContent='Trang '+page+'/'+pages+' · '+payload.pagination.total+' nội dung';document.querySelector('#content-prev').disabled=page<=1;document.querySelector('#content-next').disabled=page>=pages;
}
function partTarget(scope,group){
 if(group.parts.length<2)return;
 const select=el('select',{class:'select','aria-label':'Phần nhận câu hỏi mới'});for(const p of group.parts)select.append(el('option',{value:p.id,text:p.title}));select.value=scope.lessonId||group.parts[0].id;
 select.onchange=()=>selectContentLesson(scopeForSchoolGroup(scope,group,select.value));tools.append(el('label',{class:'field'},[el('span',{text:'Phần nhận nội dung mới trong bài / Unit'}),select]));
}
async function load(){
 const token=++sequence,scope=selectedScope();if(!scope)return;persist();nav();filters.hidden=true;pagination.hidden=true;tools.replaceChildren();heading.replaceChildren();
 root.replaceChildren(el('p',{role:'status',text:'Đang mở nội dung của lớp và môn đã chọn…'}));destination(scope);
 try{
  const [data,documents]=await Promise.all([getCatalog(scope),api('/api/v1/worksheets/admin').then(p=>p.data)]);if(token!==sequence)return;catalog=data;sheets=documents;
  const groups=catalog.groups.filter(g=>g.subjectId===scope.subjectId&&(!scope.semester||g.semester===scope.semester)&&(!scope.chapterId||g.chapterId===scope.chapterId)),group=groups.find(g=>g.id===scope.groupId||g.parts.some(p=>p.id===scope.lessonId));
  if(advanced){heading.append(el('h2',{text:scope.unassigned?'Nội dung chưa xếp bài':'Toàn bộ nội dung môn học'}));tools.append(button('Về bài học',()=>{advanced=false;selectContentLesson({...scope,unassigned:undefined,lessonId:undefined,groupId:undefined});}));return listBank(scope,null,undefined,token);}
  if(workspace.mode==='papers'){
   heading.append(el('h2',{text:'Soạn và quản lý đề thi'}));const query=el('input',{class:'input',type:'search',placeholder:'Tìm tên đề, trường, mã đề…','aria-label':'Tìm đề thi'});tools.append(query);
   const draw=()=>root.replaceChildren(paperList(sheets.filter(p=>p.exam_config&&Number(p.grade)===scope.grade&&p.subject_id===scope.subjectId),scope,{period:workspace.period,changePeriod:value=>{if(!guard())return;workspace.period=value;persist();load();},create:async()=>{if(await createWorksheet({...scope,lessonId:null,period:workspace.period},true))showEditor();},edit:async p=>{if(await openWorksheet(p.id))showEditor();},preview:p=>previewSchoolPaper(p,store.tree),remove:async p=>{if(await removeWorksheet(p.id,p.version))await refresh();},query:query.value}));query.oninput=draw;draw();return;
  }
  if(workspace.mode==='checks'){
   heading.append(el('h2',{text:'Bài kiểm tra từ ngân hàng câu hỏi'}));const {data:checks}=await api('/api/v1/admin/content/checks?'+new URLSearchParams({grade:scope.grade,subjectId:scope.subjectId,yearId:scope.yearId}));if(token!==sequence)return;
   const draw=()=>root.replaceChildren(checkCatalog(checks,workspace.checkKind,kind=>{workspace.checkKind=kind;draw();},range=>{if(!guard())return;workspace.mode='lessons';workspace.part='quiz';const found=catalog.groups.filter(g=>g.subjectId===scope.subjectId&&(!range.chapterId||g.chapterId===range.chapterId)&&(!range.semester||g.semester===range.semester));selectContentLesson(found.length===1?scopeForSchoolGroup(scope,found[0]):{grade:scope.grade,subjectId:scope.subjectId,...range});}));draw();return;
  }
  heading.append(el('h2',{text:group?group.title:'Bài học của môn'}));
  if(!group){
   const search=el('input',{class:'input',type:'search',placeholder:'Tìm tên bài học / Unit…','aria-label':'Tìm bài học'});tools.append(search,button('+ Thêm chương / chủ đề',()=>addCurriculum('chapters')),button('+ Thêm bài học',()=>addCurriculum('lessons')));tools.lastChild.disabled=!scope.chapterId;
   const draw=()=>root.replaceChildren(lessonCards(groups.filter(g=>(g.title+' '+g.chapterName).toLocaleLowerCase('vi').includes(search.value.toLocaleLowerCase('vi'))),sheets,(g,part)=>{if(!guard())return;workspace.part=part;selectContentLesson(scopeForSchoolGroup(scope,g));}));search.oninput=draw;draw();return;
  }
  destination(scope,group);tools.append(button('Danh sách bài học',()=>selectContentLesson({grade:scope.grade,subjectId:scope.subjectId,semester:scope.semester,chapterId:scope.chapterId})),partTabs(workspace.part,part=>{if(!guard())return;workspace.part=part;persist();load();}));
  if(['knowledge','examples'].includes(workspace.part)){
   const count=workspace.part==='knowledge'?group.knowledgeCount:group.exampleCount;root.replaceChildren(el('section',{class:'school-section-intro'},[el('div',{},[el('h3',{text:schoolParts.find(([id])=>id===workspace.part)[1]}),el('p',{text:(count||0)+' mục · '+schoolContentStatus(group.guideStatus)})]),el('div',{class:'school-author-actions'},[button(count?'Mở chỉnh sửa':'+ Thêm nội dung',()=>editSchoolGuide(scope.grade,group.id,{section:workspace.part,yearId:scope.yearId}),true),button('Xem như học sinh',()=>previewSchoolGroup(scope,group,workspace.part))])]));return;
  }
  partTarget(scope,group);
  if(workspace.part==='quiz')tools.append(button('+ Thêm câu hỏi',()=>openCreate(),true),button('Nhập Word vào bài này',()=>openImport()),button('Đăng các câu hỏi nháp',()=>publishAll(group,scope)),el('p',{class:'school-context-note',text:group.questionCount+' câu khác nhau đã đăng · Quiz cần 20 câu và kiến thức đã đăng. Các câu này cũng được dùng cho Bài kiểm tra theo phạm vi.'}));
  else tools.append(button('+ Tạo bộ bài tập',async()=>{if(await createWorksheet(scope,false))showEditor();},true));
  await listBank(scope,group,workspace.part==='quiz'?'question':'worksheet',token);
 }catch(error){if(token===sequence){notice.textContent=error.message;root.replaceChildren(schoolEmpty('Chưa tải được nội dung','Bạn có thể thử mở lại mục vừa chọn.'));}}
}
async function refresh(){cache.clear();await loadCurriculum();await load();}
filters.onsubmit=event=>{event.preventDefault();page=1;load();};filters.querySelector('select').onchange=()=>{page=1;load();};
document.querySelector('#content-prev').onclick=()=>{if(page>1){page--;load();}};document.querySelector('#content-next').onclick=()=>{if(page<pages){page++;load();}};
document.querySelector('#content-word-history').onclick=openWordHistory;
document.querySelector('#content-reviews').onclick=()=>{if(!guard())return;editor.hidden=false;document.querySelector('#ws-review-tab').click();};
document.querySelector('#content-close-editor').onclick=guard;
document.querySelector('#school-unassigned').onclick=()=>{if(!guard())return;advanced=true;selectContentLesson({grade:selectedScope().grade,subjectId:selectedScope().subjectId,unassigned:'1'});};
document.querySelector('#school-all-content').onclick=()=>{if(!guard())return;advanced=true;load();};
document.addEventListener('content:changed',()=>refresh().catch(e=>notice.textContent=e.message));
initPage('admin','questions').then(async profile=>{configureWorksheetGrades(profile);await initCurriculum(()=>{page=1;load();},guard);await load();}).catch(error=>notice.textContent=error.message);
