import {scopeLabels} from './admin-question-scope.js';
import {schoolAdminDestination} from './admin-school-context.js';
export function questionStudentPlacement(tree,ids){
 const labels=scopeLabels(tree,ids),group=Number(ids.grade)>=6&&['tieng-anh','tieng-viet'].includes(ids.subjectId)?labels.chapterName:labels.lessonName;
 return schoolAdminDestination({grade:ids.grade,subjectId:ids.subjectId,group,part:'quiz'});
}
export function schoolSaveReceipt(message){const host=document.querySelector('#school-save-receipt');if(host)host.textContent=message;}
export function questionSaveReceipt(tree,ids,status){return status==='published'?'Đã đăng tại '+questionStudentPlacement(tree,ids):status==='hidden'?'Đã ẩn câu hỏi với học sinh.':'Đã lưu nháp — học sinh chưa thấy. Vị trí sau khi đăng: '+questionStudentPlacement(tree,ids);}
