import {createHash} from 'node:crypto';
import {z} from 'zod';
import {query} from '../config/db.js';
import {AppError,notFound} from '../utils/errors.js';

const alias=name=>{if(!/^[a-z][a-z0-9_]*$/u.test(name))throw Error('Invalid SQL alias');return name;};
export function curriculumVisibleSql(chapter='c',lesson='l'){
 const targets=[`(scs.kind='chapter' AND scs.target_id=${alias(chapter)}.id)`,...(lesson?[`(scs.kind='lesson' AND scs.target_id=${alias(lesson)}.id)`]:[])];
 return `NOT EXISTS (SELECT 1 FROM school_curriculum_state scs WHERE (${targets.join(' OR ')}) AND scs.status<>'published')`;
}
export function topicVisibleSql(topic='t'){
 const id=alias(topic)+'.id';
 return `(NOT EXISTS (SELECT 1 FROM curriculum_lessons mapped WHERE mapped.topic_id=${id}) OR EXISTS (
 SELECT 1 FROM curriculum_lessons vl JOIN curriculum_chapters vc ON vc.id=vl.chapter_id
 WHERE vl.topic_id=${id} AND ${curriculumVisibleSql('vc','vl')}))`;
}
export async function assertCurriculumLessonVisible(id,run=query){
 const rows=await run(`SELECT l.id FROM curriculum_lessons l JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.id=? AND ${curriculumVisibleSql()}`,[id]);
 if(!rows.length)throw notFound('Bài học đang ẩn hoặc đã được chuyển khỏi danh sách học.');
}
export const curriculumRevision=value=>createHash('sha256').update(JSON.stringify([value.kind,value.id,value.name,Number(value.sortOrder),value.status||'published'])).digest('hex');
export function curriculumSettings(kind,id,name,sortOrder,status='published'){
 const value={kind,id,name,sortOrder:Number(sortOrder||0),status:status||'published'};return {...value,revision:curriculumRevision(value)};
}
export const curriculumEditSchema=z.object({name:z.string().trim().min(1).max(255),sortOrder:z.number().int().min(0).max(255),status:z.enum(['published','draft','hidden']),expected_revision:z.string().regex(/^[a-f0-9]{64}$/u)}).strict();
export const curriculumDeleteSchema=z.object({expected_revision:z.string().regex(/^[a-f0-9]{64}$/u)}).strict();
export function assertCurriculumRevision(current,expected){if(curriculumRevision(current)!==expected)throw new AppError(409,'CURRICULUM_CHANGED','Bài đã được sửa ở nơi khác. Nội dung bạn đang nhập vẫn được giữ; tải lại danh sách trước khi sửa tiếp.');}
