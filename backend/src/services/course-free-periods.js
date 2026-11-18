import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {withTransaction} from '../config/db.js';
import {AppError} from '../utils/errors.js';

export const activeFreePeriod=`EXISTS(SELECT 1 FROM course_free_periods f WHERE f.course_id=c.id AND f.cancelled_at IS NULL AND f.starts_at<=CURRENT_TIMESTAMP(3) AND f.ends_at>CURRENT_TIMESTAMP(3))`;
export const nextFreePeriod=column=>`(SELECT f.${column} FROM course_free_periods f WHERE f.course_id=c.id AND f.cancelled_at IS NULL AND f.ends_at>CURRENT_TIMESTAMP(3) ORDER BY f.starts_at LIMIT 1)`;
export async function saveFreePeriod(admin,courseId,body){
 const d=z.object({enabled:z.boolean(),starts_at:z.iso.datetime().optional(),ends_at:z.iso.datetime().optional()}).strict().parse(body);
 if(d.enabled&&(!d.starts_at||!d.ends_at||new Date(d.ends_at)<=new Date(d.starts_at)||new Date(d.ends_at)<=new Date()))throw new AppError(400,'FREE_DATES_INVALID','Chọn ngày bắt đầu và ngày kết thúc hợp lệ; ngày kết thúc phải ở tương lai.');
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  const [course]=await run('SELECT id FROM courses WHERE id=? FOR UPDATE',[courseId]);
  if(!course)throw new AppError(404,'COURSE_NOT_FOUND','Không tìm thấy khóa học.');
  await run('UPDATE course_free_periods SET cancelled_at=CURRENT_TIMESTAMP(3) WHERE course_id=? AND cancelled_at IS NULL AND ends_at>CURRENT_TIMESTAMP(3)',[courseId]);
  if(d.enabled)await run('INSERT INTO course_free_periods(id,course_id,starts_at,ends_at,created_by) VALUES (?,?,?,?,?)',[randomUUID(),courseId,new Date(d.starts_at),new Date(d.ends_at),admin]);
  return {saved:true};
 });
}
export function freeCourseFields(){return `${nextFreePeriod('starts_at')} AS free_starts_at,${nextFreePeriod('ends_at')} AS free_ends_at,CASE WHEN ${activeFreePeriod} THEN 1 ELSE 0 END free_now`;}
