import {api,el} from './api.js';
import {studyKnowledge,studyExamples} from './school-study-guide.js';
import {schoolAdminDestination,schoolContentStatus} from './admin-school-context.js';
export async function editSchoolGuide(grade,id,{section='knowledge',yearId}={}){
 const headers={'X-Course-Id':'grade-'+grade},path='/api/v1/school-study/guides/'+encodeURIComponent(id)+(yearId?'?yearId='+encodeURIComponent(yearId):''),{data}=await api(path,{headers});
 const content=structuredClone(data.content),dialog=el('dialog',{class:'school-guide-editor school-author-dialog','aria-label':'Soạn kiến thức và ví dụ'}),body=el('div'),notice=el('p',{class:'school-save-receipt',role:'status','aria-live':'polite'}),preview=el('div',{class:'school-guide-preview',hidden:true});
 let fields=[],dirty=false,version=data.revision,status=data.status,exists=data.exists,busy=false;
 const commit=()=>fields.forEach(update=>update());
 const button=(text,onclick,primary=false)=>el('button',{type:'button',class:'btn'+(primary?'':' btn-ghost'),text,onclick});
 const close=()=>{if(busy)return;if(dirty&&!confirm('Bản đang soạn chưa lưu. Bạn muốn đóng?'))return;dialog.close();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>dialog.remove());
 function field(label,value,object,key,max){const input=el('textarea',{class:'textarea',maxlength:max,'aria-label':label});input.value=value||'';fields.push(()=>object[key]=input.value.trim());return el('label',{class:'field'},[el('span',{text:label}),input]);}
 function records(key,title,properties,max){
  const group=el('section',{class:'school-author-records'},[el('h3',{text:title})]);
  for(const [index,item]of content[key].entries()){const card=el('article',{class:'school-author-record'});card.append(el('div',{class:'school-author-record-head'},[el('strong',{text:title+' '+(index+1)}),button('Bỏ mục này',()=>{commit();content[key].splice(index,1);dirty=true;draw();})]));for(const [name,label,limit]of properties)card.append(field(label,item[name],item,name,limit));group.append(card);}
  if(!content[key].length)group.append(el('p',{class:'muted',text:'Phần này chưa có nội dung. Bấm thêm để bắt đầu.'}));
  const add=button('+ Thêm '+title.toLocaleLowerCase('vi'),()=>{commit();content[key].push(Object.fromEntries(properties.map(([name])=>[name,''])));dirty=true;draw();});add.disabled=content[key].length>=max;group.append(add);return group;
 }
 async function save(next){
  if(busy)return;commit();busy=true;body.querySelectorAll('button,textarea').forEach(b=>b.disabled=true);notice.textContent='Đang lưu nội dung…';
  try{const {data:saved}=await api(path,{method:'PUT',headers,body:{...content,status:next,expected_revision:version}});version=saved.revision;status=saved.status;exists=true;dirty=false;document.dispatchEvent(new Event('content:changed'));draw();notice.textContent=next==='published'?'Đã đăng tại '+schoolAdminDestination({grade,subjectId:data.group.subjectId,group:data.group,part:section}):next==='hidden'?'Đã ẩn nội dung với học sinh.':'Đã lưu nháp — học sinh chưa thấy.';}
  catch(error){notice.textContent=error.message+(error.details?.length?' Kiểm tra các mục còn trống hoặc lưu nháp để làm tiếp.':'');}
  finally{busy=false;draw();}
 }
 function draw(){
  fields=[];const destination=el('section',{class:'school-destination'},[el('span',{class:'school-eyebrow',text:'HỌC SINH SẼ THẤY Ở'}),el('strong',{text:schoolAdminDestination({grade,subjectId:data.group.subjectId,group:data.group,part:section})}),el('p',{text:schoolContentStatus(exists?status:null)})]);
  const tabs=el('nav',{class:'school-part-tabs','aria-label':'Phần nội dung'});for(const [key,label]of [['knowledge','Cần nhớ / công thức'],['examples','Ví dụ hướng dẫn']])tabs.append(el('button',{type:'button',class:'btn btn-ghost','aria-pressed':String(section===key),text:label,onclick:()=>{commit();section=key;preview.hidden=true;draw();}}));
  body.replaceChildren(destination,tabs);
  if(data.group.parts.length>1)body.append(el('p',{class:'school-context-note',text:'Kiến thức và ví dụ dùng chung cho toàn bộ '+data.group.title+'.'}));
  if(section==='knowledge'){
   body.append(records('summary','Mục kiến thức',[['heading','Tiêu đề',180],['body','Nội dung kiến thức',20000]],30),records('formulas','Công thức / quy tắc',[['name','Tên công thức / quy tắc',180],['expression','Công thức / quy tắc',3000],['conditions','Điều kiện áp dụng',3000]],40));
   const mistakes=el('textarea',{class:'textarea','aria-label':'Những chỗ dễ nhầm'});mistakes.value=content.mistakes.join('\n');fields.push(()=>content.mistakes=mistakes.value.split('\n').map(s=>s.trim()).filter(Boolean));body.append(el('label',{class:'field'},[el('span',{text:'Những chỗ dễ nhầm — mỗi dòng một ý'}),mistakes]));
  }else body.append(records('examples','Ví dụ',[['prompt','Đề bài ví dụ',10000],['solution','Cách làm / lời giải ví dụ',20000]],15));
  body.append(el('div',{class:'school-author-actions'},[button('Lưu nháp',()=>save('draft')),button('Cho học sinh xem',()=>save('published'),true),...(exists?[button('Ẩn nội dung',()=>save('hidden'))]:[]),button('Xem như học sinh',()=>{commit();preview.replaceChildren(section==='knowledge'?studyKnowledge(content):studyExamples(content));preview.hidden=!preview.hidden;})]));
 }
 body.oninput=()=>dirty=true;dialog.append(el('header',{class:'school-author-header'},[el('div',{},[el('span',{class:'school-eyebrow',text:'CHẾ ĐỘ GIÁO VIÊN'}),el('h2',{text:data.group.title})]),button('Đóng',close)]),body,notice,preview);document.body.append(dialog);draw();dialog.showModal();
}
