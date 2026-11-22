import {api,el} from './api.js';
import {renderItem} from './worksheet-player.js';
import {worksheetPlacement} from './admin-school-context.js';
import {studyKnowledge,studyExamples} from './school-study-guide.js';
export async function previewSchoolGroup(scope,group,part){
 const {data}=await api('/api/v1/school-study/guides/'+encodeURIComponent(group.id)+'?yearId='+encodeURIComponent(scope.yearId),{headers:{'X-Course-Id':'grade-'+scope.grade}});
 const dialog=el('dialog',{class:'worksheet-dialog school-paper-preview','aria-label':'Xem bài như học sinh'});
 dialog.append(el('header',{class:'school-author-header'},[el('h2',{text:group.title}),el('button',{class:'btn btn-ghost',type:'button',text:'Đóng',onclick:()=>dialog.close()})]),el('p',{class:'school-context-note',text:'Xem trước dành cho giáo viên · '+(data.status==='published'?'Nội dung đang được đăng.':'Nội dung chưa được đăng cho học sinh.')}),part==='examples'?studyExamples(data.content):studyKnowledge(data.content));
 document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}
export async function previewSchoolPaper(value,tree){
 const sheet=value.items?structuredClone(value):(await api('/api/v1/worksheets/admin/'+encodeURIComponent(value.id))).data;
 const dialog=el('dialog',{class:'worksheet-dialog school-paper-preview worksheet-exam-player','aria-label':'Xem đề như học sinh'});
 dialog.append(el('header',{class:'school-author-header'},[el('h2',{text:sheet.title}),el('button',{class:'btn btn-ghost',type:'button',text:'Đóng',onclick:()=>dialog.close()})]),el('p',{class:'school-row-destination',text:worksheetPlacement(sheet,tree)}),el('p',{class:'school-context-note',text:'Xem trước dành cho giáo viên · '+(sheet.exam_config?.duration_minutes||0)+' phút · Không tạo lượt làm hoặc lưu câu trả lời.'}));
 if(!sheet.items.length)dialog.append(el('p',{text:'Đề chưa có câu hỏi. Thêm câu để xem trước.'}));
 for(const question of sheet.items){const {answer,explanation,solutionImageIds,...publicQuestion}=question;dialog.append(renderItem(publicQuestion,undefined,()=>{}));}
 document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}
