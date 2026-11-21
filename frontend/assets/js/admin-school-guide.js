import {api,el} from './api.js';
import {studyKnowledge,studyExamples} from './school-study-guide.js';
export async function editSchoolGuide(grade,id){
 const headers={'X-Course-Id':'grade-'+grade},path='/api/v1/school-study/guides/'+encodeURIComponent(id),{data}=await api(path,{headers});
 const dialog=el('dialog',{class:'school-guide-editor'}),form=el('form'),fields=[],status=el('p',{role:'status','aria-live':'polite'}),preview=el('div');
 const field=(label,value,object,key)=>{const input=el('textarea');input.required=key!=='conditions';input.value=value;fields.push(()=>object[key]=input.value.trim());return el('label',{},[el('span',{text:label}),input]);};
 const content=structuredClone(data.content);
 form.append(el('p',{text:'Nội dung này hiển thị trong bài học. Các Unit và bài Ngữ văn dùng chung bản tổng hợp cho cả bài.'}));
 form.append(el('h3',{text:'Tóm tắt kiến thức'}));for(const item of content.summary)form.append(field('Tiêu đề',item.heading,item,'heading'),field('Nội dung',item.body,item,'body'));
 form.append(el('h3',{text:'Công thức / quy tắc'}));for(const item of content.formulas)form.append(field('Tên',item.name,item,'name'),field('Công thức / quy tắc',item.expression,item,'expression'),field('Điều kiện áp dụng',item.conditions||'',item,'conditions'));
 form.append(el('h3',{text:'Ví dụ có hướng dẫn'}));for(const item of content.examples)form.append(field('Đề bài',item.prompt,item,'prompt'),field('Cách làm',item.solution,item,'solution'));
 const mistakes=el('textarea',{'aria-label':'Những chỗ dễ nhầm'});mistakes.value=(content.mistakes||[]).join('\n');form.append(el('label',{},[el('span',{text:'Những chỗ dễ nhầm (mỗi ý một dòng)'}),mistakes]));
 const save=el('button',{class:'btn btn-primary',type:'submit',text:'Lưu nội dung'}),toggle=el('button',{class:'btn btn-ghost',type:'button',text:'Xem trước'});
 toggle.onclick=()=>{fields.forEach(update=>update());content.mistakes=mistakes.value.split('\n').map(text=>text.trim()).filter(Boolean);preview.replaceChildren(studyKnowledge(content),studyExamples(content));preview.hidden=!preview.hidden;};preview.hidden=true;
 form.append(el('div',{},[save,toggle]),status);form.onsubmit=async event=>{event.preventDefault();save.disabled=true;status.textContent='Đang lưu…';try{fields.forEach(update=>update());content.mistakes=mistakes.value.split('\n').map(text=>text.trim()).filter(Boolean);const {summary,formulas,mistakes:notes,examples}=content;await api(path,{method:'PUT',headers,body:{summary,formulas,mistakes:notes,examples}});status.textContent='Đã lưu. Học sinh sẽ thấy nội dung mới khi mở lại bài.';}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
 const close=el('button',{class:'btn btn-ghost',type:'button',text:'Đóng',onclick:()=>dialog.close()});dialog.append(el('header',{},[el('h2',{text:data.group.title}),close]),form,preview);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}
