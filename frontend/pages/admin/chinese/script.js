import {initPage} from '/assets/js/ui-core.js';
import {request,el,root,button,link,card,field,values,formSubmit,error,notice,kinds,table} from '/assets/js/chinese-common.js';
const params=new URLSearchParams(location.search),adminLink=(text,p={})=>link(text,p,'admin');
const extra=(title,children)=>el('details',{class:'simple-extra'},[el('summary',{text:title}),...children]);
const statusText=s=>s==='published'?'Học sinh đang xem được':s==='archived'?'Đã lưu trữ':'Chưa cho học sinh xem';
let catalog;
function message(e){
 if(Array.isArray(e.details)){const errors=e.details.filter(i=>i.message!=='Câu hỏi chưa được duyệt');if(errors.length)e=new Error('Cần sửa trước khi cho học sinh xem:\n'+errors.slice(0,6).map(i=>`Mục ${i.index}: ${i.message}`).join('\n')+(errors.length>6?`\nCòn ${errors.length-6} lỗi khác.`:''));}
 error(e);document.querySelector('#notice').scrollIntoView({block:'center',behavior:'smooth'});
}
function action(text,fn,primary=false){const b=button(text,async()=>{b.disabled=true;try{await fn();}catch(e){message(e);}finally{b.disabled=false;}});if(primary)b.className='btn btn-primary';if(text.startsWith('Xóa'))b.classList.add('btn-danger');return b;}
async function boot(){
 if(['levels','tests'].includes(params.get('view'))){await import('./advanced.js');return;}
 await initPage('admin','chinese');catalog=await request('/catalog');notice('');
 document.querySelector('#chinese-nav').append(adminLink('Bài học'),el('a',{class:'btn btn-secondary',href:'/pages/admin/students/?program=chinese',text:'Học sinh Tiếng Trung'}),adminLink('Bài kiểm tra',{view:'tests'}),adminLink('Tiến độ',{view:'progress'}));
 if(params.has('set'))return editor(params.get('set'));if(params.get('view')==='progress')return progress();workspace();
}
function workspace(){
 const selected=catalog.lessons.find(l=>l.id===params.get('lesson')),level=selected?.level_id||Number(params.get('level'))||1;
 const lessons=catalog.lessons.filter(l=>l.level_id===level&&l.status!=='archived'),lesson=selected||lessons[0];
 root().append(el('p',{class:'simple-intro',text:'Chọn bài, tải file Word, rồi kiểm tra để cho học sinh học.'}));
 const scope=el('div',{class:'simple-scope'},[field('Cấp HSK','level_id',level,'text',catalog.levels.map(l=>[l.id,l.title])),field('Bài học','lesson_id',lesson?.id||'','text',lessons.length?lessons.map(l=>[l.id,l.title]):[['','Chưa có bài học']])]);
 scope.querySelector('[name=level_id]').onchange=e=>{location.href='?level='+e.target.value;};scope.querySelector('[name=lesson_id]').onchange=e=>{location.href='?lesson='+e.target.value;};
 const create=el('form',{},[field('Tên bài mới','title')]);create.querySelector('input').placeholder='Ví dụ: Bài 1 – Xin chào';create.querySelector('input').required=true;
 formSubmit(create,async d=>{const position=Math.max(0,...catalog.lessons.filter(l=>l.level_id===level).map(l=>l.position))+1;const saved=await request('/lessons','POST',{...d,level_id:level,position,description:'',image_url:'',status:'draft'});location.href='?lesson='+saved.id;},'Tạo bài');
 root().append(card('1. Chọn bài học',[scope,extra('+ Thêm bài học',[create])]));
 if(!lesson){root().append(el('p',{class:'simple-empty',text:'Chưa có bài học ở cấp này. Bấm “+ Thêm bài học” để bắt đầu.'}));return;}
 const upload=el('form',{class:'simple-upload'},[field('File Word (.docx, tối đa 20 MB)','file','','file'),field('Tên tài liệu','title')]);
 const fileInput=upload.querySelector('[name=file]');fileInput.accept='.docx';fileInput.required=true;upload.querySelector('[name=title]').placeholder='Tự lấy theo tên file';
 fileInput.onchange=()=>{if(fileInput.files[0]&&!upload.querySelector('[name=title]').value)upload.querySelector('[name=title]').value=fileInput.files[0].name.replace(/\.docx$/i,'');};
 formSubmit(upload,async()=>{
  const file=fileInput.files[0];if(!file)throw Error('Bạn chưa chọn file Word.');if(file.size>20*1024*1024)throw Error('File Word tối đa 20 MB.');
  const body=new FormData(upload);body.set('level_id',String(level));body.set('lesson_id',lesson.id);if(!body.get('title'))body.set('title',file.name.replace(/\.docx$/i,''));notice('Đang đọc file Word…');let result;
  try{result=await request('/imports','POST',body);}catch(e){if(e.code!=='DUPLICATE_DOCUMENT')throw e;if(!confirm('File này đã được nhập. Bạn có muốn tạo thêm một tài liệu riêng?')){notice('Đã hủy nhập file.');return;}body.set('allow_duplicate','true');result=await request('/imports','POST',body);}
  location.href='?set='+result.id;
 },'Tải lên và kiểm tra');
 root().append(card('2. Thêm tài liệu cho '+lesson.title,[upload,el('a',{href:'/assets/templates/chinese-template.docx',text:'Tải mẫu Word'})]));
 const documents=catalog.sets.filter(s=>s.lesson_id===lesson.id&&s.status!=='archived');
 root().append(card('Tài liệu trong bài',documents.length?documents.map(s=>{
  const countLabel=catalog.counts.filter(c=>c.set_id===s.id).map(c=>`${c.total} ${kinds.find(([key])=>key===c.kind)?.[1].toLowerCase()||'mục'}`).join(' · ');
  return el('div',{class:'simple-document'},[el('div',{},[el('strong',{text:s.title}),el('p',{class:'muted',text:countLabel||'Chưa có nội dung'}),el('span',{class:s.status==='published'?'simple-status published':'simple-status',text:s.status==='published'&&lesson.status!=='published'?'Bài học chưa mở cho học sinh':statusText(s.status)})]),adminLink('Mở tài liệu',{set:s.id})]);
 }):[el('p',{class:'muted',text:'Chưa có tài liệu. Tải file Word ở phía trên.'})]));
 const manual=el('form',{},[field('Tên tài liệu mới','title')]);formSubmit(manual,async d=>{const s=await request('/sets','POST',{...d,lesson_id:lesson.id});location.href='?set='+s.id;},'Tạo tài liệu');root().append(extra('+ Tạo tài liệu trực tiếp (không cần Word)',[manual]));
 const rename=el('form',{},[field('Tên bài','title',lesson.title),field('Trạng thái','status',lesson.status,'text',[['draft','Bản nháp'],['published','Đã đăng'],['archived','Lưu trữ']])]);formSubmit(rename,async d=>{await request('/lessons/'+lesson.id,'PUT',{...lesson,...d,description:lesson.description||'',image_url:lesson.image_url||''});location.reload();},'Lưu bài học');root().append(card('Quản lý bài học',[rename,action('Xóa bài học',async()=>{if(!confirm(`Xóa bài “${lesson.title}” cùng toàn bộ tài liệu, nội dung và tiến độ học trong bài? Lịch sử làm bài vẫn được giữ. Không thể hoàn tác.`))return;await request('/lessons/'+lesson.id,'DELETE');location.href='?level='+level;})]));
}
async function editor(id){
 const result=await request('/sets/'+id),set=result.set;let items=result.items.map(i=>({id:i.id,kind:i.kind,data:{...i.data}})),page=0;
 const available=kinds;let tab=params.get('tab')|| (items.some(i=>i.kind==='question')?'question':items[0]?.kind||'question');
 root().append(adminLink('← Quay lại bài học',{lesson:set.lesson_id}),el('h2',{text:set.title}),el('p',{class:'muted',text:`HSK ${set.level_id} / ${set.lesson_title}`}),el('p',{class:'simple-status',text:set.status==='published'&&set.lesson_status!=='published'?'Tài liệu đã duyệt, nhưng bài học chưa mở cho học sinh.':statusText(set.status)}));
 const panels=el('div'),tabs=el('div',{class:'chinese-tools'});
 const collect=()=>{panels.querySelectorAll('form[data-index]').forEach(form=>{const i=items[Number(form.dataset.index)];for(const [key,value]of Object.entries(values(form)))i.data[key]=['options','accepted'].includes(key)?value.split('\n').map(t=>t.trim()).filter(Boolean):value;});};
 const render=()=>{
  panels.replaceChildren();const filtered=items.map((i,index)=>({i,index})).filter(({i})=>i.kind===tab),pages=Math.max(1,Math.ceil(filtered.length/15));page=Math.min(page,pages-1);
  available.forEach(([key,title],n)=>{if(tabs.children[n])tabs.children[n].textContent=`${title} (${items.filter(i=>i.kind===key).length})`;});
  for(const {i,index}of filtered.slice(page*15,page*15+15)){
   const d=i.data,box=el('section',{class:'simple-question'});box.append(el('h3',{class:'read-text',text:`${index+1}. ${d.prompt||d.hanzi||d.title||'Nội dung cần kiểm tra'}`}));
   if(i.kind==='question'){if(d.options?.length)box.append(el('ol',{type:'A',class:'simple-options'},d.options.map(option=>el('li',{text:option}))));box.append(el('p',{class:'simple-answer',text:'Đáp án: '+(d.accepted?.join(' / ')||'Chưa có đáp án')}));if(d.explanation)box.append(el('p',{class:'read-text muted',text:d.explanation}));}
   else if(i.kind==='vocabulary')box.append(el('p',{class:'pinyin',text:d.pinyin||''}),el('p',{text:d.meaning||''}));else box.append(el('p',{class:'read-text',text:d.text||''}));
   if(d.audio_url)box.append(el('audio',{src:d.audio_url,controls:true}));if(d.image_url)box.append(el('img',{src:d.image_url,alt:'Hình minh họa',width:200}));
   const form=el('form',{'data-index':index});
   if(i.kind==='question'){form.append(field('Câu hỏi','prompt',d.prompt,'textarea'));if(d.options?.length||['choice','listening','ordering','matching'].includes(d.type))form.append(field('Các lựa chọn (mỗi dòng một lựa chọn)','options',d.options?.join('\n'),'textarea'));form.append(field('Đáp án đúng (ghi nguyên nội dung, mỗi dòng một đáp án)','accepted',d.accepted?.join('\n'),'textarea'),field('Giải thích','explanation',d.explanation,'textarea'));}
   else if(i.kind==='vocabulary')form.append(field('Chữ Hán','hanzi',d.hanzi),field('Pinyin','pinyin',d.pinyin),field('Nghĩa tiếng Việt','meaning',d.meaning));else form.append(field('Nội dung','text',d.text,'textarea'));
   box.append(extra(i.kind==='question'?'Sửa câu hỏi':'Sửa nội dung',[form]));
   if(i.kind==='unknown')box.append(el('p',{class:'muted',text:'Đoạn này chưa được nhận diện. Nếu là câu hỏi, hãy sửa định dạng file gốc rồi đọc lại.'}));
   box.querySelector('details').append(action('Bỏ mục này',()=>{if(!confirm('Bỏ mục này khỏi tài liệu? Thay đổi chỉ được lưu khi bạn bấm nút Lưu.'))return;collect();items.splice(index,1);render();notice('Đã bỏ mục khỏi bản đang sửa. Bấm Lưu để lưu thay đổi.');}));panels.append(box);
  }
  if(!filtered.length)panels.append(el('p',{class:'simple-empty',text:'Không có nội dung trong nhóm này.'}));
  if(pages>1){const prev=action('← Trước',()=>{collect();page--;render();}),next=action('Tiếp →',()=>{collect();page++;render();});prev.disabled=page===0;next.disabled=page>=pages-1;panels.append(el('div',{class:'simple-pagination'},[prev,el('span',{text:`Trang ${page+1}/${pages}`}),next]));}
 };
 for(const [key,title]of available)tabs.append(action(`${title} (${items.filter(i=>i.kind===key).length})`,()=>{collect();tab=key;page=0;render();}));
 const addForm=el('form',{},[field('Loại nội dung','kind','question','text',kinds.filter(([k])=>k!=='unknown'))]);formSubmit(addForm,()=>{collect();const kind=values(addForm).kind;items.push({kind,data:kind==='question'?{type:'choice',prompt:'',options:['Lựa chọn A','Lựa chọn B'],accepted:[],approved:false}:kind==='vocabulary'?{hanzi:'',pinyin:'',meaning:''}:{text:''}});tab=kind;page=Math.floor((items.filter(i=>i.kind===kind).length-1)/15);render();notice('Đã thêm mục mới. Mở “Sửa nội dung” hoặc “Sửa câu hỏi”, điền thông tin rồi bấm Lưu.');},'Thêm nội dung');
 const titleForm=el('form',{},[field('Tên tài liệu','title',set.title)]),settings=[titleForm,action('Xóa tài liệu',async()=>{if(!confirm(`Xóa tài liệu “${set.title}” cùng nội dung và tiến độ học? Lịch sử làm bài vẫn được giữ. Không thể hoàn tác.`))return;await request('/sets/'+id,'DELETE');location.href='?lesson='+set.lesson_id;})];
 if(set.document_id){settings.push(el('a',{href:'/api/v1/chinese/documents/'+set.document_id,text:'Tải lại file Word gốc'}));if(set.status==='draft')settings.push(action('Đọc lại file Word',async()=>{if(!confirm('Đọc lại file gốc sẽ thay nội dung bản nháp và các chỉnh sửa hiện tại. Tiếp tục?'))return;await request('/sets/'+id+'/reparse','POST');location.reload();}));}
 const save=async (publish,draft=false)=>{
  collect();let savedItems=items;
  if(publish){if(!confirm(`Bạn xác nhận đã kiểm tra nội dung và đáp án? Tài liệu “${titleForm.querySelector('input').value}” sẽ được duyệt và cho học sinh xem. Bài “${set.lesson_title}” cũng sẽ được mở nếu chưa mở.`))return;savedItems=items.map(i=>i.kind==='question'?{...i,data:{...i.data,approved:true}}:i);}
  await request('/sets/'+id,'PUT',{title:values(titleForm).title,status:publish?'published':draft?'draft':set.status,items:savedItems});
  if(publish&&set.lesson_status!=='published'){const lesson=catalog.lessons.find(l=>l.id===set.lesson_id);try{await request('/lessons/'+lesson.id,'PUT',{...lesson,description:lesson.description||'',image_url:lesson.image_url||'',status:'published'});}catch(e){throw new Error('Đã lưu tài liệu, nhưng chưa mở được bài học. Bấm “Cho học sinh xem” để thử lại. '+e.message);}}
  location.href='?lesson='+set.lesson_id;
 };
 root().append(el('p',{class:'simple-intro',text:'Thêm, sửa hoặc bỏ nội dung bên dưới rồi bấm Lưu. Tài liệu đã đăng vẫn chỉnh sửa được.'}),extra('+ Thêm nội dung',[addForm]),tabs,panels,card('Quản lý tài liệu',settings),el('div',{class:'simple-footer'},[action('Lưu bản nháp',()=>save(false,true)),action('Lưu thay đổi',()=>save(false)),action('Cho học sinh xem',()=>save(true),true)]));render();
 const other=result.issues.filter(e=>e.message!=='Câu hỏi chưa được duyệt');if(other.length)notice(`${other.length} nội dung cần kiểm tra. `+other.slice(0,4).map(e=>`Mục ${e.index}: ${e.message}`).join('\n'));
}
async function progress(){
 const {progress:rows}=await request('/stats'),students=[...new Map(rows.map(r=>[r.student_id,r.display_name])).entries()];
 const filter=field('Học sinh','student','','text',[['','Tất cả học sinh'],...students]),list=el('div');
 const render=()=>{const id=filter.querySelector('select').value;const filtered=rows.filter(r=>!id||r.student_id===id);list.replaceChildren(table(['Học sinh','Cấp','Tài liệu','Đã học'],filtered.map(r=>[r.display_name,'HSK '+r.level_id,r.title,r.percent+'%'])));};
 filter.onchange=render;root().append(card('Tiến độ học',[filter,list]));render();if(!rows.length)notice('Chưa có lượt học. Tiến độ sẽ xuất hiện khi học sinh bắt đầu học tài liệu.');
}
boot().catch(message);
