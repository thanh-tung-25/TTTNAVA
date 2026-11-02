import {withTransaction} from '../config/db.js';
import {z} from 'zod';
import {AppError,notFound} from '../utils/errors.js';
export async function deleteWorksheet(id,version){
 const expected=z.coerce.number().int().min(1).parse(version);
 return withTransaction(async connection=>{
  const run=async(sql,p=[]) => (await connection.query(sql,p))[0];
  const [sheet]=await run('SELECT id,version FROM worksheets WHERE id=? FOR UPDATE',[id]);if(!sheet)throw notFound();
  if(sheet.version!==expected)throw new AppError(409,'WORKSHEET_CHANGED','Bộ bài đã thay đổi. Cập nhật danh sách trước khi xóa.');
  const [count]=await run('SELECT COUNT(*) total FROM worksheet_attempts WHERE worksheet_id=?',[id]);
  if(count.total){await run("UPDATE worksheets SET status='hidden',version=version+1 WHERE id=?",[id]);return {id,action:'hidden',message:'Đã ẩn bộ bài để giữ lịch sử học sinh.'};}
  await run('DELETE FROM worksheets WHERE id=?',[id]);return {id,action:'deleted',message:'Đã xóa bộ bài.'};
 });
}
