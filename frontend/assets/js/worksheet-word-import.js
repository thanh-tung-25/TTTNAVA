import {api,el} from './api.js';
export function worksheetItemsFromWord(parsed,{scoring='thpt-2025',existingCount=0}={}){
 if(!parsed.questions?.length)throw Error('Chưa tìm thấy câu hỏi theo mẫu Word.');
 if(parsed.questions.length+existingCount>50)throw Error('Một đề có tối đa 50 câu / ý. Chia tài liệu thành các đề nhỏ hơn.');
 const unsupported=parsed.questions.filter(q=>!['single_choice','fill_in',...(scoring==='school-points'?['true_false']:[])].includes(q.type));
 if(unsupported.length)throw Error('Chưa nhập tự động được dạng câu '+unsupported.map(q=>q.sourceNumber).join(', ')+'. Câu nhiều đáp án và đúng/sai THPT bốn ý cần soạn bằng các công cụ của đề.');
 return parsed.questions.map(q=>{
  if(q.prompt.length>3000||(q.explanation||'').length>4000||(q.options||[]).some(o=>o.text.length>300)||(q.answer?.accepted||[]).some(a=>a.length>300)||(q.answer?.accepted||[]).length>20)throw Error('Câu '+q.sourceNumber+' vượt độ dài cho phép. Rút gọn nội dung hoặc dùng ảnh đề.');
  const item={id:crypto.randomUUID(),prompt:q.prompt,explanation:q.explanation||'',imageId:null};
  if(q.type==='single_choice'){const index=q.options.findIndex(o=>o.key===q.answer?.key);return {...item,type:'choice',config:{options:q.options.map(o=>o.text)},answer:index<0?null:{index}};}
  if(q.type==='true_false')return {...item,type:'true_false_group',config:{statements:[q.prompt]},answer:typeof q.answer?.value==='boolean'?{values:[q.answer.value]}:null};
  return {...item,type:'fill',config:{},answer:q.answer?.accepted?.length?{accepted:q.answer.accepted}:null};
 });
}
export async function importWorksheetWord(sheet,apply){
 const dialog=el('dialog',{class:'worksheet-dialog school-author-dialog','aria-label':'Nhập Word vào đề'}),file=el('input',{class:'input',type:'file',accept:'.docx','aria-label':'Chọn Word của đề'}),notice=el('p',{role:'status','aria-live':'polite'}),preview=el('div');let items;
 const add=el('button',{class:'btn',type:'button',text:'Thêm các câu vào bản đang soạn',disabled:true,onclick:()=>{apply(items);dialog.close();}}),read=el('button',{class:'btn btn-ghost',type:'button',text:'Đọc và xem trước Word'});
 read.onclick=async()=>{read.disabled=true;add.disabled=true;notice.textContent='Đang đọc Word…';try{if(!file.files[0]||!file.files[0].name.toLowerCase().endsWith('.docx'))throw Error('Chọn một tệp .docx.');if(file.files[0].size>20*1024*1024)throw Error('Word tối đa 20 MB.');const body=new FormData();body.append('file',file.files[0]);const {data}=await api('/api/v1/admin/questions/import/docx',{method:'POST',body});items=worksheetItemsFromWord(data,{scoring:sheet.exam_config?.scoring,existingCount:sheet.items.length});preview.replaceChildren(...items.map((q,n)=>el('article',{class:'school-author-record'},[el('strong',{text:'Câu '+(n+1)}),el('p',{text:q.prompt}),el('p',{text:q.answer?'Đã đọc được đáp án':'Cần nhập thêm đáp án trước khi đăng'})])));notice.textContent='Đã đọc '+items.length+' câu. '+[...data.extractionWarnings||[],...(data.issues?.length?['Có mục cần kiểm tra lại trong tài liệu.']:[])].join(' ');add.disabled=false;}catch(error){notice.textContent=error.message;items=null;}finally{read.disabled=false;}};
 file.onchange=()=>{items=null;add.disabled=true;preview.replaceChildren();};
 dialog.append(el('header',{class:'school-author-header'},[el('h2',{text:'Nhập Word vào '+sheet.title}),el('button',{class:'btn btn-ghost',type:'button',text:'Đóng',onclick:()=>dialog.close()})]),el('p',{class:'school-context-note',text:'Word theo mẫu: câu chọn một đáp án và điền đáp án. Đề theo điểm từng ý nhận thêm câu đúng/sai đơn. Chấm điểm và đúng/sai THPT bốn ý được soạn trong đề. Ảnh và công thức phức tạp cần tải ảnh riêng sau khi nhập.'}),el('a',{href:'/assets/templates/mau-nhap-de-thi.docx',download:'',text:'Tải mẫu Word nhập đề'}),file,read,notice,preview,add);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}
