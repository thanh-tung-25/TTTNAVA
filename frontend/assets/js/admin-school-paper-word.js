import {api} from './api.js';
import {importWorksheetWord} from './worksheet-word-import.js';
import {paperPeriods} from './school-paper-periods.js';
import {schoolSaveReceipt} from './admin-school-question-placement.js';
import {schoolAdminDestination} from './admin-school-context.js';

export function paperFromWord(scope,items,{title,durationMinutes,period}){
 const term=paperPeriods.find(([id])=>id===period);
 if(!term)throw Error('Chọn đợt thi trước khi lưu đề.');
 if(!items.length||items.length>50)throw Error('Một đề cần từ 1 đến 50 câu / ý.');
 // Equal weights total ten points even when the paper has e.g. 30 questions.
 const points=Math.floor(10/items.length*1000000)/1000000;
 return {title:title.trim(),grade:Number(scope.grade),subject_id:scope.subjectId,lesson_id:null,status:'draft',exam_config:{period,semester:term[2]||'year',duration_minutes:durationMinutes,scoring:'school-points',short_points:.25},items:items.map((item,index)=>({...item,points:index===items.length-1?10-points*(items.length-1):points}))};
}

export function uploadSchoolPaperWord(scope,onCreated){
 const sheet={title:'',grade:scope.grade,subject_id:scope.subjectId,items:[],exam_config:{period:scope.period,scoring:'school-points',duration_minutes:50}};
 return importWorksheetWord(sheet,async(items,meta)=>{
  const {data}=await api('/api/v1/worksheets/admin',{method:'POST',body:paperFromWord(scope,items,meta)});
  schoolSaveReceipt('Đã lưu đề nháp từ Word — học sinh chưa thấy. Vị trí sau khi đăng: '+schoolAdminDestination({grade:data.grade,subjectId:data.subject_id,mode:'papers',period:data.exam_config.period,title:data.title}));
  return data;
 },{createPaper:true,onApplied:onCreated});
}
