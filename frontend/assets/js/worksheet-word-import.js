import {api,el} from './api.js';
import {schoolAdminDestination} from './admin-school-context.js';
import {paperPeriods} from './school-paper-periods.js';
export function worksheetItemsFromWord(parsed,{scoring='thpt-2025',existingCount=0}={}){
 if(!parsed.questions?.length)throw Error('Chưa tìm thấy câu hỏi theo mẫu Word.');
 if(parsed.questions.length+existingCount>50)throw Error('Một đề có tối đa 50 câu / ý. Chia tài liệu thành các đề nhỏ hơn.');
 const unsupported=parsed.questions.filter(q=>!['single_choice','fill_in',...(scoring==='school-points'?['true_false']:[])].includes(q.type));
 if(unsupported.length)throw Error('Chưa nhập tự động được dạng câu '+unsupported.map(q=>q.sourceNumber).join(', ')+'. Câu nhiều đáp án và đúng/sai THPT bốn ý cần soạn bằng các công cụ của đề.');
 return parsed.questions.map(q=>{
  if(q.prompt.length>3000||(q.explanation||'').length>4000||(q.options||[]).some(o=>o.text.length>300)||(q.answer?.accepted||[]).some(a=>a.length>300)||(q.answer?.accepted||[]).length>20)throw Error('Câu '+q.sourceNumber+' vượt độ dài cho phép. Rút gọn nội dung hoặc dùng ảnh đề.');
  if(q.type==='single_choice'&&(q.options.length<2||q.options.length>6))throw Error('Câu '+q.sourceNumber+' cần từ 2 đến 6 lựa chọn riêng biệt A., B., C., D.');
  const item={id:crypto.randomUUID(),prompt:q.prompt,explanation:q.explanation||'',imageId:null};
  if(q.type==='single_choice'){const index=q.options.findIndex(o=>o.key===q.answer?.key);return {...item,type:'choice',config:{options:q.options.map(o=>o.text)},answer:index<0?null:{index}};}
  if(q.type==='true_false')return {...item,type:'true_false_group',config:{statements:[q.prompt]},answer:typeof q.answer?.value==='boolean'?{values:[q.answer.value]}:null};
  return {...item,type:'fill',config:{},answer:q.answer?.accepted?.length?{accepted:q.answer.accepted}:null};
 });
}
function inputField(label,value,{tag='input',max,type='text',required=false}={}){
 const input=el(tag,{class:tag==='textarea'?'textarea':tag==='select'?'select':'input','aria-label':label,...(tag==='input'?{type}:{}),...(max?{maxlength:max}:{}),...(required?{required:''}:{})});
 if(tag!=='select')input.value=value??'';
 return {input,node:el('label',{class:'field'},[el('span',{text:label}),input])};
}

function previewQuestions(items,host){
 host.replaceChildren();
 for(const [index,item]of items.entries()){
  const card=el('article',{class:'school-author-record'}),prompt=inputField('Đề bài câu '+(index+1),item.prompt,{tag:'textarea',max:3000,required:true});
  prompt.input.oninput=()=>{item.prompt=prompt.input.value;if(item.type==='true_false_group')item.config.statements=[item.prompt];};
  card.append(el('h3',{text:'Câu '+(index+1)}),prompt.node);
  const answer=inputField('Đáp án câu '+(index+1),'',{tag:item.type==='fill'?'textarea':'select',max:item.type==='fill'?6000:undefined});
  if(item.type==='choice'){
   answer.input.append(el('option',{value:'',text:'Chưa có đáp án'}));
   item.config.options.forEach((option,n)=>{
    const label=String.fromCharCode(65+n),field=inputField('Lựa chọn '+label+' câu '+(index+1),option,{tag:'textarea',max:300,required:true});
    field.input.oninput=()=>item.config.options[n]=field.input.value;card.append(field.node);answer.input.append(el('option',{value:n,text:label}));
   });
   answer.input.value=item.answer?String(item.answer.index):'';
   answer.input.onchange=()=>item.answer=answer.input.value===''?null:{index:Number(answer.input.value)};
  }else if(item.type==='true_false_group'){
   answer.input.append(...[['','Chưa có đáp án'],['true','Đúng'],['false','Sai']].map(([value,text])=>el('option',{value,text})));
   answer.input.value=item.answer?String(item.answer.values[0]):'';answer.input.onchange=()=>item.answer=answer.input.value===''?null:{values:[answer.input.value==='true']};
  }else{
   answer.input.value=item.answer?.accepted.join('\n')||'';answer.input.oninput=()=>{const accepted=answer.input.value.split('\n').map(s=>s.trim()).filter(Boolean);item.answer=accepted.length?{accepted}:null;};
  }
  const solution=inputField('Lời giải câu '+(index+1),item.explanation,{tag:'textarea',max:4000});solution.input.oninput=()=>item.explanation=solution.input.value;
  card.append(answer.node,el('details',{},[el('summary',{text:'Lời giải / hướng dẫn sau khi nộp'}),solution.node]));host.append(card);
 }
}

export async function importWorksheetWord(sheet,apply,{createPaper=false,onApplied}={}){
 const dialog=el('dialog',{class:'worksheet-dialog school-author-dialog','aria-label':createPaper?'Tải đề thi từ Word':'Nhập Word vào đề'}),form=el('form'),file=el('input',{class:'input',type:'file',accept:'.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document','aria-label':'Chọn Word của đề'}),notice=el('p',{role:'status','aria-live':'polite'}),preview=el('div');
 const title=inputField('Tên đề thi',sheet.title,{max:180,required:true}),duration=inputField('Thời gian làm bài (phút)',sheet.exam_config?.duration_minutes||50,{type:'number',required:true}),period=inputField('Đợt thi','',{tag:'select',required:true}),placement=el('section',{class:'school-destination'});
 duration.input.min='1';duration.input.max='300';duration.input.step='1';
 period.input.append(el('option',{value:'',text:'Chọn đợt thi'}),...paperPeriods.map(([value,text])=>el('option',{value,text})));period.input.value=sheet.exam_config?.period==='all'?'':sheet.exam_config?.period||'';
 const updatePlacement=()=>placement.replaceChildren(el('span',{class:'school-eyebrow',text:'HỌC SINH SẼ THẤY Ở'}),el('strong',{text:schoolAdminDestination({grade:sheet.grade,subjectId:sheet.subject_id,mode:'papers',period:period.input.value||'all',title:title.input.value})}),el('p',{text:'Chỉ lưu thành đề nháp khi bạn xác nhận. Sau đó có thể kiểm tra và đăng cho học sinh.'}));
 title.input.oninput=period.input.onchange=updatePlacement;updatePlacement();
 let items=null,requestNumber=0,busy=false,saved=false;
 const add=el('button',{class:'btn',type:'submit',text:createPaper?'Lưu đề nháp':'Thêm các câu vào bản đang soạn',disabled:true}),read=el('button',{class:'btn btn-ghost',type:'button',text:'Đọc và xem trước Word'});
 async function readWord(){
  const number=++requestNumber,selected=file.files[0];items=null;preview.replaceChildren();read.disabled=true;add.disabled=true;notice.textContent='Đang đọc Word…';
  try{
   if(!selected||!selected.name.toLowerCase().endsWith('.docx'))throw Error('Chọn một tệp .docx.');
   if(selected.size>20*1024*1024)throw Error('Word tối đa 20 MB.');
   const body=new FormData();body.append('file',selected);const {data}=await api('/api/v1/admin/questions/import/docx',{method:'POST',body});
   if(number!==requestNumber||!dialog.isConnected)return;
   items=worksheetItemsFromWord(data,{scoring:sheet.exam_config?.scoring,existingCount:sheet.items.length});previewQuestions(items,preview);
   const missing=items.filter(item=>!item.answer).length;
   notice.textContent='Đã đọc '+items.length+' câu · '+(items.length-missing)+' câu có đáp án'+(missing?' · '+missing+' câu cần bổ sung đáp án':'')+'. Bạn có thể sửa ngay bên dưới. '+[...data.extractionWarnings||[],...(data.issues?.length?data.issues:[])].join(' ');add.disabled=false;
  }catch(error){if(number===requestNumber){notice.textContent=error.message;items=null;}}
  finally{if(number===requestNumber)read.disabled=false;}
 }
 read.onclick=readWord;
 file.onchange=()=>{if(createPaper&&!title.input.value.trim()){title.input.value=(file.files[0]?.name||'').replace(/\.docx$/iu,'').slice(0,180);updatePlacement();}readWord();};
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||saved||!items||!form.reportValidity())return;
  busy=true;const controls=[...form.querySelectorAll('input,textarea,select,button')],disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);notice.textContent=createPaper?'Đang lưu đề nháp…':'Đang thêm câu vào bản soạn…';
  try{
   const result=await apply(structuredClone(items),{title:title.input.value,durationMinutes:Number(duration.input.value),period:period.input.value});saved=true;dialog.close();
   if(onApplied)try{await onApplied(result);}catch(error){const host=document.querySelector('#content-hub-error');if(host)host.textContent='Đã lưu đề nháp nhưng chưa mở được trình sửa. Mở lại đề trong danh sách. '+error.message;}
  }catch(error){notice.textContent=error.message;}
  finally{busy=false;if(!saved)controls.forEach((c,index)=>c.disabled=disabled[index]);}
 };
 const close=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{requestNumber++;dialog.remove();});
 form.append(el('header',{class:'school-author-header'},[el('h2',{text:createPaper?'Tải đề thi từ Word':'Nhập Word vào '+sheet.title}),el('button',{class:'btn btn-ghost',type:'button',text:'Đóng',onclick:close})]));
 if(createPaper)form.append(placement,el('div',{class:'school-word-meta'},[title.node,duration.node,period.node]),el('p',{class:'school-context-note',text:'Đề mới chấm trên thang 10, chia đều điểm cho các câu. Có thể chỉnh điểm trong trình soạn sau khi lưu.'}));
 form.append(el('p',{class:'school-context-note',text:'Dùng cách trình bày như nhập Quiz: Câu 1. …, các dòng A. / B. / C. / D., Đáp án: A, Lời giải: … (nếu có). Hỗ trợ chọn một đáp án, điền và đúng/sai đơn ở đề chấm điểm từng ý. Ảnh và công thức phức tạp cần tải ảnh riêng. Câu thiếu đáp án được giữ để bạn bổ sung; hệ thống không tự đoán.'}),el('a',{href:createPaper?'/assets/templates/mau-de-thi-trac-nghiem.docx':'/assets/templates/mau-nhap-de-thi.docx',download:'',text:createPaper?'Tải mẫu Word đề trắc nghiệm':'Tải mẫu Word nhập đề'}),el('label',{class:'field'},[el('span',{text:'Tệp Word .docx · tối đa 20 MB · tối đa 50 câu / ý'}),file]),read,notice,preview,add);
 dialog.append(form);document.body.append(dialog);dialog.showModal();
}
