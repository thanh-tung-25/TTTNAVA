import {api,el} from './api.js';
import {schoolSaveReceipt} from './admin-school-question-placement.js';

export const lessonStatusLabel=status=>({published:'Cho học sinh xem',draft:'Bản nháp',hidden:'Đang ẩn',deleted:'Đã xóa khỏi danh sách học'}[status]||'Cho học sinh xem');
export function schoolLessonSettings(value,{beforeChange=()=>true,onChanged=()=>{},label='bài học'}={}){
 const details=el('details',{class:'school-lesson-settings'}),form=el('form'),name=el('input',{class:'input',name:'name',required:'',maxlength:value.kind==='chapter'?160:255,'aria-label':'Tên '+label}),order=el('input',{class:'input',name:'sortOrder',type:'number',min:0,max:255,step:1,required:'','aria-label':'Thứ tự '+label}),status=el('select',{class:'select',name:'status','aria-label':'Trạng thái '+label}),notice=el('p',{role:'status','aria-live':'polite'});
 name.value=value.name;order.value=value.sortOrder;
 status.append(...['published','draft','hidden'].map(id=>el('option',{value:id,text:lessonStatusLabel(id)})));status.value=value.status==='deleted'?'draft':value.status;
 const field=(text,input)=>el('label',{class:'field'},[el('span',{text}),input]),save=el('button',{class:'btn',type:'submit',text:value.status==='deleted'?'Khôi phục '+label:'Lưu '+label});let busy=false;
 async function mutate(remove=false){
  if(busy||!beforeChange())return;
  if(remove&&!confirm('Xóa “'+value.name+'” khỏi danh sách học? Bài sẽ chuyển vào Bài đã xóa và có thể khôi phục. Nội dung, bài làm và điểm của học sinh được giữ.'))return;
  const body=remove?{expected_revision:value.revision}:{name:name.value.trim(),sortOrder:Number(order.value),status:status.value,expected_revision:value.revision};
  busy=true;const controls=[...details.querySelectorAll('input,select,button')];controls.forEach(c=>c.disabled=true);notice.textContent=remove?'Đang chuyển bài vào mục đã xóa…':'Đang lưu bài học…';
  try{
   const {data}=await api('/api/v1/admin/content/'+(value.kind==='chapter'?'chapters/':'lessons/')+encodeURIComponent(value.id),{method:remove?'DELETE':'PUT',body});
   Object.assign(value,data.settings);notice.textContent=data.message;schoolSaveReceipt(data.message+' · '+value.name);await onChanged(data.settings);
  }catch(error){notice.textContent=error.message;}
  finally{busy=false;controls.forEach(c=>c.disabled=false);}
 }
 form.append(field('Tên '+label,name),field('Thứ tự '+label+' (0–255)',order),field('Trạng thái '+label,status),save);
 form.onsubmit=event=>{event.preventDefault();if(form.reportValidity())mutate();};
 details.append(el('summary',{text:'Sửa tên, thứ tự & trạng thái '+label}),form);
 if(value.kind==='chapter')details.append(el('p',{class:'school-context-note',text:'Thay đổi áp dụng cho toàn bộ chương / Unit và các phần trong đó.'}));
 if(value.status!=='deleted')details.append(el('button',{class:'btn btn-danger btn-ghost',type:'button',text:'Xóa '+label,onclick:()=>mutate(true)}));
 details.append(el('p',{class:'school-context-note',text:'Ẩn/xóa dừng hiển thị khi bắt đầu học mới. Lượt đang làm và kết quả cũ vẫn được giữ. Cho xem bài không tự đăng các câu hỏi hoặc kiến thức còn nháp.'}),notice);return details;
}

export function deletedSchoolLessons(values,options){
 const entries=[...new Map(values.filter(value=>value?.status==='deleted').map(value=>[value.kind+'/'+value.id,value])).values()];
 if(!entries.length)return null;
 return el('details',{class:'school-deleted-lessons'},[el('summary',{text:'Bài đã xóa ('+entries.length+')'}),el('p',{text:'Khôi phục sẽ đưa bài về danh sách quản trị. Mặc định khôi phục ở trạng thái nháp.'}),...entries.map(value=>el('article',{class:'school-author-record'},[el('h3',{text:value.name}),schoolLessonSettings(value,{...options,label:value.kind==='chapter'?'chương / Unit':'bài học'})]))]);
}
