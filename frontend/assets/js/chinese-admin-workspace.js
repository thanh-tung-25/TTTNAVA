import {request,el,root,button,link,card,field,formSubmit,notice,kinds} from './chinese-common.js';
import {adminModeHeader,documentDestinations} from './chinese-admin-modes.js';
import {modeCounts} from './chinese-learning-modes.js';

export function adminLessonWorkspace(catalog,params){
 const lesson=catalog.lessons.find(l=>l.id===params.get('lesson'));if(!lesson)throw Error('Không tìm thấy bài học.');
 const mode=adminModeHeader(root(),lesson,catalog,params.get('mode'));
 document.querySelector('main>h1').textContent=mode.label;
 if(mode.key==='apply'){location.replace('?activities='+lesson.id);return;}
 const documents=catalog.sets.filter(s=>s.lesson_id===lesson.id&&s.status!=='archived'),related=documents.filter(s=>modeCounts(s,catalog.counts)[mode.key]>0||s.status==='draft'&&(!catalog.counts.some(c=>c.set_id===s.id)||catalog.counts.some(c=>c.set_id===s.id&&c.kind==='unknown')));
 const create=el('form',{class:'admin-create-document'},[field('Tên tài liệu mới','title',mode.label+' · '+lesson.title)]);
 formSubmit(create,async d=>{const s=await request('/sets','POST',{...d,lesson_id:lesson.id});location.href='?set='+s.id+'&mode='+mode.key+'&add=1';},'Tạo tài liệu');
 root().append(el('div',{class:'admin-section-intro'},[el('img',{src:'/assets/images/mascot-'+mode.image+'.svg',alt:'',width:72,height:80}),el('div',{},[el('span',{class:'admin-mode-eyebrow',text:'SOẠN '+mode.label.toLocaleUpperCase('vi')}),el('h2',{text:related.length?'Chọn tài liệu để chỉnh sửa':'Thêm nội dung đầu tiên cho phần này'}),el('p',{text:mode.description})])]));
 if(related.length)root().append(card('Tài liệu của '+mode.label,related.map(s=>{
  const countLabel=catalog.counts.filter(c=>c.set_id===s.id).map(c=>`${c.total} ${kinds.find(([key])=>key===c.kind)?.[1].toLowerCase()||'mục'}`).join(' · ');
  return el('div',{class:'simple-document'},[el('div',{},[el('strong',{text:s.title}),el('p',{class:'muted',text:mode.key==='speak'&&s.speaking_count?s.speaking_count+' câu luyện nói':countLabel||'Chưa có nội dung'}),el('p',{class:'admin-document-destination',text:'Học sinh → '+(documentDestinations(s,catalog.counts)||mode.label)}),el('span',{class:'admin-content-status '+(s.status==='published'&&lesson.status==='published'?'published':''),text:s.status==='published'&&lesson.status==='published'?'Đã cho học sinh xem':'Bản nháp / bài học chưa mở'})]),link('Mở tài liệu',{set:s.id,mode:mode.key},'admin')]);
 })));
 const upload=el('form',{class:'simple-upload'},[field('File Word (.docx, tối đa 20 MB)','file','','file'),field('Tên tài liệu','title'),el('input',{type:'hidden',name:'destination',value:mode.destination})]);
 const input=upload.querySelector('[name=file]');input.accept='.docx';input.required=true;upload.querySelector('[name=title]').placeholder='Tự lấy theo tên file';
 input.onchange=()=>{if(input.files[0]&&!upload.querySelector('[name=title]').value)upload.querySelector('[name=title]').value=input.files[0].name.replace(/\.docx$/i,'');};
 formSubmit(upload,async()=>{
  const file=input.files[0];if(!file)throw Error('Bạn chưa chọn file Word.');if(file.size>20*1024*1024)throw Error('File Word tối đa 20 MB.');
  const body=new FormData(upload);body.set('level_id',String(lesson.level_id));body.set('lesson_id',lesson.id);if(!body.get('title'))body.set('title',file.name.replace(/\.docx$/i,''));notice('Đang đọc file Word…');let result;
  try{result=await request('/imports','POST',body);}catch(e){if(e.code!=='DUPLICATE_DOCUMENT')throw e;if(!confirm('File này đã được nhập. Tạo thêm một tài liệu riêng?')){notice('Đã hủy nhập file.');return;}body.set('allow_duplicate','true');result=await request('/imports','POST',body);}
  location.href='?set='+result.id+'&mode='+mode.key;
 },'Tải lên và kiểm tra');
 const examples=mode.key==='speak'?[el('p',{class:'admin-import-note',text:'Mỗi dòng hoặc đoạn Word là một câu hỏi tiếng Trung. Cô nghe thử rồi đăng để học sinh nghe và trả lời. Nghĩa tiếng Việt, nếu có, chỉ để cô kiểm tra.'}),el('pre',{class:'admin-word-example',text:'Câu 1. 你叫什么名字？\nCâu 2. 你是哪国人？'})]:[el('p',{class:'admin-import-note',text:'Word được thêm thành tài liệu mới trong đúng bài và phần đang chọn. Cô kiểm tra nội dung trước khi cho học sinh xem.'})];
 root().append(card('Thêm Word vào '+mode.label,[...examples,upload,el('a',{href:mode.key==='speak'?'/assets/templates/chinese-speaking-template.docx':'/assets/templates/chinese-template.docx',text:mode.key==='speak'?'Tải mẫu Word luyện nói':'Tải mẫu Word'})]));
 const manual=el('details',{class:'admin-manual-document'},[el('summary',{text:'+ Tạo tài liệu trực tiếp (không cần Word)'}),create]);manual.open=!related.length;root().append(manual);
 const other=documents.filter(s=>!related.includes(s));if(other.length)root().append(el('details',{class:'admin-other-documents'},[el('summary',{text:'Thêm vào tài liệu đang có trong bài'}),el('p',{text:'Nội dung mới sẽ nằm cùng tài liệu được chọn, trong đúng phần '+mode.label+'.'}),...other.map(s=>link(s.title,{set:s.id,mode:mode.key},'admin'))]));
}
