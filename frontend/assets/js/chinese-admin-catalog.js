import {request,el,root,button,field,formSubmit,notice} from './chinese-common.js';
import {renderChineseLessons} from './chinese-lesson-list.js';

export function adminCatalog(catalog,params){
 const lessonSettings=lesson=>{
  const details=el('details',{class:'admin-lesson-settings'}),form=el('form',{class:'admin-lesson-form'},[
   field('Tên bài','title',lesson.title),field('Thứ tự bài','position',lesson.position,'number'),field('Trạng thái bài','status',lesson.status,'text',[['draft','Bản nháp'],['published','Cho học sinh xem'],['archived','Lưu trữ']])
  ]);form.querySelector('[name=title]').required=true;form.querySelector('[name=position]').min=1;
  formSubmit(form,async d=>{await request('/lessons/'+lesson.id,'PUT',{...lesson,...d,description:lesson.description||'',image_url:lesson.image_url||''});location.reload();},'Lưu bài học');
  const remove=button('Xóa bài học',async()=>{if(!confirm(`Xóa bài “${lesson.title}” cùng toàn bộ tài liệu và nội dung? Lịch sử làm bài vẫn được giữ. Không thể hoàn tác.`))return;await request('/lessons/'+lesson.id,'DELETE');location.reload();});remove.classList.add('btn-danger');
  details.append(el('summary',{text:'Sửa tên, thứ tự & trạng thái bài'}),form,remove);return details;
 };
 const tools=level=>{
  const group=el('div',{class:'admin-catalog-tools'}),add=el('details',{class:'admin-create-lesson'}),form=el('form',{class:'admin-create-form'},[field('Tên bài mới','title')]);form.querySelector('input').required=true;form.querySelector('input').placeholder='Ví dụ: Bài 7 · 你家有几口人';
  formSubmit(form,async d=>{const position=Math.max(0,...catalog.lessons.filter(l=>l.level_id===level).map(l=>Number(l.position)||0))+1;const saved=await request('/lessons','POST',{...d,level_id:level,position,description:'',image_url:'',status:'draft'});location.href='?lesson='+saved.id+'&mode=cards';},'Tạo bài');
  add.append(el('summary',{text:'+ Thêm bài học'}),form);group.append(el('p',{text:'CHẾ ĐỘ SOẠN BÀI · Mọi phần đều có thể thêm nội dung'}),add);
  const archived=catalog.lessons.filter(l=>l.level_id===level&&l.status==='archived');
  if(archived.length){const box=el('details',{class:'admin-archived-lessons'},[el('summary',{text:`Bài đã lưu trữ (${archived.length})`})]);for(const l of archived)box.append(el('strong',{text:l.title}),lessonSettings(l));group.append(box);}
  return group;
 };
 document.body.classList.add('admin-chinese-catalog');document.querySelector('main>h1').textContent='Bài học Tiếng Trung';
 renderChineseLessons({catalog,params,role:'admin',manageTools:tools,manageLesson:lessonSettings});notice('');
}
