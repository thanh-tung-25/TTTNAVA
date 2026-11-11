import {request,el,root,link,card,field,values,formSubmit,notice,kinds} from './chinese-common.js';
import {adminModeHeader} from './chinese-admin-modes.js';
import {chineseMode,itemMode} from './chinese-learning-modes.js';
import {adminAction as action,adminDetails as extra,adminStatus as statusText} from './chinese-admin-ui.js';
import {questionAudio} from './question-audio.js';
const adminLink=(text,p={})=>link(text,p,'admin');
export async function adminSetEditor(id,{catalog,profile:adminProfile,params}){
 const result=await request('/sets/'+id),set=result.set;let items=result.items.map(i=>({id:i.id,kind:i.kind,data:{...i.data}})),page=0;
 const lesson=catalog.lessons.find(l=>l.id===set.lesson_id),mode=chineseMode(params.get('mode'))||chineseMode(items[0]&&itemMode(items[0]))||chineseMode('cards');let dirty=false;
 const modeParams={lesson:set.lesson_id,mode:mode.key};
 document.querySelector('main>h1').textContent=mode.label;
 const onlySpeaking=items.every(i=>i.data.practice==='speaking'||i.kind==='unknown');
 if(params.get('mode')==='speak'||onlySpeaking&&!params.get('mode')&&items.some(i=>i.data.practice==='speaking')){const {speakingEditor}=await import('/assets/js/chinese-speaking-editor.js');return speakingEditor(result,{lesson,profile:adminProfile,catalog,add:params.get('add')==='1'});}
 const belongs=i=>mode.key==='cards'?['vocabulary','question','unknown'].includes(i.kind):i.kind==='unknown'||itemMode(i)===(['words','listen'].includes(mode.key)?'words':mode.key);
 const allowedKinds={cards:['vocabulary','question'],words:['vocabulary'],listen:['vocabulary'],quiz:['question'],read:['reading','grammar','dialogue'],speak:['dialogue']}[mode.key]||['question'];
 const available=kinds.filter(([k])=>allowedKinds.includes(k)||k==='unknown'&&items.some(i=>i.kind==='unknown'));let tab=params.get('tab')||available.find(([k])=>items.some(i=>i.kind===k&&belongs(i)))?.[0]||allowedKinds[0];
 adminModeHeader(root(),lesson,catalog,mode.key,set.id);
 const docPicker=field('Tài liệu đang soạn','document',set.id,'text',catalog.sets.filter(s=>s.lesson_id===set.lesson_id&&s.status!=='archived').map(s=>[s.id,s.title]));docPicker.querySelector('select').onchange=e=>{location.href='?set='+e.target.value+'&mode='+mode.key;};
 root().append(el('div',{class:'admin-document-toolbar'},[docPicker,el('span',{class:'simple-status',text:set.status==='published'&&set.lesson_status!=='published'?'Đã duyệt tài liệu · bài học chưa mở':statusText(set.status)})]));
 const panels=el('div'),tabs=el('div',{class:'chinese-tools'});
 const collect=()=>{panels.querySelectorAll('form[data-index]').forEach(form=>{const i=items[Number(form.dataset.index)];for(const [key,value]of Object.entries(values(form)))i.data[key]=['options','targets','accepted'].includes(key)?value.split('\n').map(t=>t.trim()).filter(Boolean):value;});};
 const render=()=>{
  panels.replaceChildren();const filtered=items.map((i,index)=>({i,index})).filter(({i})=>i.kind===tab&&belongs(i)),pages=Math.max(1,Math.ceil(filtered.length/15));page=Math.min(page,pages-1);
  available.forEach(([key,title],n)=>{if(tabs.children[n]){tabs.children[n].textContent=`${title} (${items.filter(i=>i.kind===key&&belongs(i)).length})`;tabs.children[n].setAttribute('aria-current',tab===key?'page':'false');}});
  for(const {i,index}of filtered.slice(page*15,page*15+15)){
   const d=i.data,box=el('section',{class:'simple-question'});box.append(el('h3',{class:'read-text',text:`${index+1}. ${d.prompt||d.hanzi||d.title||d.text||'Nội dung cần kiểm tra'}`}),el('span',{class:'admin-item-destination',text:'Học sinh → '+(chineseMode(itemMode(i))?.label||'Cần kiểm tra')}));
   if(i.kind==='question'){if(d.options?.length)box.append(el('ol',{type:'A',class:'simple-options'},d.options.map(option=>el('li',{text:option}))));box.append(el('p',{class:'simple-answer',text:'Đáp án: '+(d.accepted?.join(' / ')||'Chưa có đáp án')}));if(d.explanation)box.append(el('p',{class:'read-text muted',text:d.explanation}));}
   else if(i.kind==='vocabulary')box.append(el('p',{class:'pinyin',text:d.pinyin||''}),el('p',{text:d.meaning||''}));else box.append(el('p',{class:'read-text',text:d.text||''}));
   if(i.kind==='vocabulary')box.append(questionAudio(d.hanzi,{language:'zh-CN',label:'Nghe từ này'}));else if(i.kind==='question')box.append(questionAudio(d.prompt));else if(i.data.practice==='speaking')box.append(questionAudio(d.text,{language:'zh-CN'}));
   if(d.audio_url)box.append(el('audio',{src:d.audio_url,controls:true}));if(d.image_url)box.append(el('img',{src:d.image_url,alt:'Hình minh họa',width:200}));
   const form=el('form',{'data-index':index});
   if(i.kind==='question'){form.append(field('Câu hỏi','prompt',d.prompt,'textarea'),field('Loại câu hỏi','type',d.type,'text',[['choice','Chọn đáp án'],['text','Nhập câu trả lời'],['pinyin','Nhập pinyin'],['ordering','Xếp từ'],['matching','Ghép cặp'],['listening','Nghe và chọn'],['dictation','Nghe và viết'],['fill','Điền từ']]));form.append(field('Các lựa chọn (mỗi dòng một lựa chọn)','options',d.options?.join('\n'),'textarea'));form.append(field('Các nghĩa để ghép (mỗi dòng một nghĩa)','targets',d.targets?.join('\n'),'textarea'));form.append(field('Đáp án đúng (ghi nguyên nội dung, mỗi dòng một đáp án)','accepted',d.accepted?.join('\n'),'textarea'),field('Giải thích','explanation',d.explanation,'textarea'),field('Âm thanh (đường dẫn HTTPS hoặc nội bộ)','audio_url',d.audio_url||''));}
   else if(i.kind==='vocabulary')form.append(field('Chữ Hán','hanzi',d.hanzi),field('Pinyin','pinyin',d.pinyin),field('Nghĩa tiếng Việt','meaning',d.meaning),extra('Ví dụ, hình & âm thanh',[field('Câu ví dụ','example',d.example||'','textarea'),field('Pinyin ví dụ','example_pinyin',d.example_pinyin||''),field('Nghĩa ví dụ','example_meaning',d.example_meaning||''),field('Hình ảnh (đường dẫn HTTPS hoặc nội bộ)','image_url',d.image_url||''),field('Âm thanh (đường dẫn HTTPS hoặc nội bộ)','audio_url',d.audio_url||'')]));
   else form.append(field(d.practice==='speaking'?'Câu hỏi tiếng Trung':'Nội dung','text',d.text,'textarea'),...(d.practice==='speaking'?[field('Nghĩa tiếng Việt (chỉ để cô kiểm tra)','meaning',d.meaning||'','textarea')]:[]));
   box.append(extra(i.kind==='question'?'Sửa câu hỏi':'Sửa nội dung',[form]));
   if(i.kind==='unknown')box.append(el('p',{class:'muted',text:'Đoạn này chưa được nhận diện. Nếu là câu hỏi, hãy sửa định dạng file gốc rồi đọc lại.'}));
   box.querySelector(':scope>details').append(action('Bỏ mục này',()=>{if(!confirm('Bỏ mục này khỏi tài liệu? Thay đổi chỉ được lưu khi bạn bấm nút Lưu.'))return;collect();items.splice(index,1);dirty=true;render();notice('Đã bỏ mục khỏi bản đang sửa. Bấm Lưu để lưu thay đổi.');}));panels.append(box);
  }
  if(!filtered.length)panels.append(el('p',{class:'simple-empty',text:'Không có nội dung trong nhóm này.'}));
  if(pages>1){const prev=action('← Trước',()=>{collect();page--;render();}),next=action('Tiếp →',()=>{collect();page++;render();});prev.disabled=page===0;next.disabled=page>=pages-1;panels.append(el('div',{class:'simple-pagination'},[prev,el('span',{text:`Trang ${page+1}/${pages}`}),next]));}
 };
 for(const [key,title]of available)tabs.append(action(`${title} (${items.filter(i=>i.kind===key).length})`,()=>{collect();tab=key;page=0;render();}));
 const addForm=el('form',{},[field('Loại nội dung','kind',allowedKinds[0],'text',kinds.filter(([k])=>allowedKinds.includes(k)))]);
 const addItem=()=>{collect();const kind=values(addForm).kind;items.push({kind,data:kind==='question'?{type:'choice',prompt:'',options:['Lựa chọn A','Lựa chọn B'],accepted:[],approved:false}:kind==='vocabulary'?{hanzi:'',pinyin:'',meaning:''}:{text:'',...(mode.key==='speak'?{practice:'speaking'}:{})}});dirty=true;tab=kind;page=Math.floor((items.filter(i=>i.kind===kind&&belongs(i)).length-1)/15);render();const last=panels.querySelectorAll('.simple-question');const details=last[last.length-1]?.querySelector(':scope>details');if(details){details.open=true;details.querySelector('textarea,input')?.focus();}};
 formSubmit(addForm,addItem,'Thêm nội dung');
 const titleForm=el('form',{},[field('Tên tài liệu','title',set.title)]),settings=[titleForm,action('Xóa tài liệu',async()=>{if(!confirm(`Xóa tài liệu “${set.title}” cùng nội dung và tiến độ học? Lịch sử làm bài vẫn được giữ. Không thể hoàn tác.`))return;await request('/sets/'+id,'DELETE');dirty=false;location.href='?'+new URLSearchParams(modeParams);})];
 if(set.document_id){settings.push(el('a',{href:'/api/v1/chinese/documents/'+set.document_id,text:'Tải lại file Word gốc'}));if(set.status==='draft')settings.push(action('Đọc lại file Word',async()=>{if(!confirm('Đọc lại file gốc sẽ thay nội dung bản nháp và các chỉnh sửa hiện tại. Tiếp tục?'))return;await request('/sets/'+id+'/reparse','POST');location.reload();}));}
 const save=async (publish,draft=false)=>{
  collect();let savedItems=items;
  if(draft&&set.status==='published'&&!confirm('Lưu bản nháp sẽ ẩn tài liệu này với học sinh. Tiếp tục?'))return;
  if(publish){if(!confirm(`Bạn xác nhận đã kiểm tra nội dung và đáp án? Tài liệu “${titleForm.querySelector('input').value}” sẽ được duyệt và cho học sinh xem. Bài “${set.lesson_title}” cũng sẽ được mở nếu chưa mở.`))return;savedItems=items.map(i=>i.kind==='question'?{...i,data:{...i.data,approved:true}}:i);}
  await request('/sets/'+id,'PUT',{title:values(titleForm).title,status:publish?'published':draft?'draft':set.status,items:savedItems});
  if(publish&&set.lesson_status!=='published'){const lesson=catalog.lessons.find(l=>l.id===set.lesson_id);try{await request('/lessons/'+lesson.id,'PUT',{...lesson,description:lesson.description||'',image_url:lesson.image_url||'',status:'published'});}catch(e){throw new Error('Đã lưu tài liệu, nhưng chưa mở được bài học. Bấm “Cho học sinh xem” để thử lại. '+e.message);}}
  dirty=false;location.href='?'+new URLSearchParams(modeParams);
 };
 const preview=el('div',{hidden:true}),edit=el('div',{class:'admin-edit-section'});let disposePreview;
 const footer=el('div',{class:'simple-footer'},[action('Lưu bản nháp',()=>save(false,true)),action('Lưu thay đổi',()=>save(false)),action('Cho học sinh xem',()=>save(true),true)]);
 const back=()=>{disposePreview?.();disposePreview=null;preview.hidden=true;preview.replaceChildren();edit.hidden=false;footer.hidden=false;};
 const showPreview=async()=>{collect();const {mountAdminStudentPreview}=await import('/assets/js/chinese-admin-preview.js');const activities=await request('/lessons/'+set.lesson_id+'/activities');disposePreview?.();preview.hidden=false;edit.hidden=true;footer.hidden=true;disposePreview=mountAdminStudentPreview(preview,{set:{...set,title:values(titleForm).title},items,activities,profile:adminProfile,mode:mode.key});preview.scrollIntoView({block:'start',behavior:'smooth'});};
 const addLabel=['words','listen'].includes(mode.key)?'+ Thêm từ mới':mode.key==='quiz'?'+ Thêm câu hỏi':mode.key==='read'?'+ Thêm bài đọc':mode.key==='speak'?'+ Thêm câu tiếng Trung':'+ Thêm nội dung';
 const tools=el('div',{class:'admin-author-tools'},[action(addLabel,()=>{back();addItem();},true),adminLink('Thêm tài liệu Word',{...modeParams,upload:'1'}),action('Xem như học sinh',showPreview),action('Tiếp tục soạn',back)]);
 edit.append(el('div',{class:'admin-source-heading'},[el('h2',{text:mode.label+' · '+set.title}),el('p',{text:'Thêm và sửa ngay tại phần này. Các mục khác trong tài liệu được giữ nguyên khi lưu.'})]),...(available.length>1?[tabs]:[]),panels,extra('+ Thêm nội dung',[addForm]),extra('Tên tài liệu, Word gốc & quản lý',settings));
 root().append(tools,preview,edit,footer);render();
 edit.addEventListener('input',()=>{dirty=true;});edit.addEventListener('change',()=>{dirty=true;});window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 if(params.get('add')==='1')addItem();
 const other=(result.issues||[]).filter(e=>e.message!=='Câu hỏi chưa được duyệt');if(other.length)notice(`${other.length} nội dung cần kiểm tra. `+other.slice(0,4).map(e=>`Mục ${e.index}: ${e.message}`).join('\n'));
}
