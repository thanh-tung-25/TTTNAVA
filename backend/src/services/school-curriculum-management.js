import {withTransaction} from '../config/db.js';
import {AppError,notFound,badRequest} from '../utils/errors.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {schoolProgramForGrade} from '../utils/school-programs.js';
import {curriculumSettings,curriculumEditSchema,curriculumDeleteSchema,assertCurriculumRevision} from './school-curriculum-state.js';

export function createCurriculumManager(transaction){
 return async function manage(user,kind,id,body,remove=false){
  const scope=adminScopeOf(user);
  if(!['super','primary','secondary','highschool'].includes(scope))throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bạn không có quyền sửa bài học này.');
  if(!['chapter','lesson'].includes(kind))throw badRequest('Loại mục học không hợp lệ.');
  const data=(remove?curriculumDeleteSchema:curriculumEditSchema).parse(body);
  if(!remove&&kind==='chapter'&&data.name.length>160)throw badRequest('Tên chương / Unit tối đa 160 ký tự.');
  return transaction(async connection=>{
   const run=async(sql,params=[])=>(await connection.query(sql,params))[0];
   const [target]=await run(kind==='chapter'?'SELECT id,name,sort_order,grade FROM curriculum_chapters WHERE id=? FOR UPDATE':'SELECT l.id,l.name,l.sort_order,c.grade FROM curriculum_lessons l JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.id=? FOR UPDATE',[id]);
   if(!target)throw notFound('Bài học không còn trong chương trình.');
   if(scope!=='super'&&scope!==schoolProgramForGrade(target.grade))throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bài học thuộc khối khác.');
   const [state]=await run('SELECT status FROM school_curriculum_state WHERE kind=? AND target_id=? FOR UPDATE',[kind,id]);
   const current=curriculumSettings(kind,id,target.name,target.sort_order,state?.status);assertCurriculumRevision(current,data.expected_revision);
   const next=remove?{...current,status:'deleted'}:{...current,name:data.name,sortOrder:data.sortOrder,status:data.status};
   if(!remove)await run(`UPDATE ${kind==='chapter'?'curriculum_chapters':'curriculum_lessons'} SET name=?,sort_order=? WHERE id=?`,[next.name,next.sortOrder,id]);
   if(state)await run('UPDATE school_curriculum_state SET status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE kind=? AND target_id=?',[next.status,user.id,kind,id]);
   else await run('INSERT INTO school_curriculum_state(kind,target_id,status,updated_by) VALUES (?,?,?,?)',[kind,id,next.status,user.id]);
   return {saved:true,settings:curriculumSettings(kind,id,next.name,next.sortOrder,next.status),message:remove?'Đã chuyển bài vào mục Bài đã xóa. Nội dung và lịch sử học được giữ; bạn có thể khôi phục.':'Đã lưu tên, thứ tự và trạng thái bài học.'};
  });
 };
}
export const manageCurriculum=createCurriculumManager(withTransaction);
