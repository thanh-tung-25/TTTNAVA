import {createHash} from 'node:crypto';
import {z} from 'zod';
import {parseJson} from '../utils/normalize.js';
import {schoolGuideSchema} from './school-study-schema.js';
import {badRequest,AppError} from '../utils/errors.js';

export const guideStatusSchema=z.enum(['draft','published','hidden']);
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
export const guideRevision=row=>row?createHash('sha256').update(JSON.stringify([stable(parseJson(row.content_json)),row.status])).digest('hex'):null;
export function visibleGuideContent(raw){const value=parseJson(raw)||{};return Object.fromEntries(['summary','formulas','mistakes','examples'].map(key=>[key,Array.isArray(value[key])?value[key]:[]]));}
const looseText=max=>z.string().trim().max(max);
const draftSchema=z.object({
 summary:z.array(z.object({heading:looseText(180),body:looseText(20000)})).max(30),
 formulas:z.array(z.object({name:looseText(180),expression:looseText(3000),conditions:looseText(3000).default('')})).max(40),
 mistakes:z.array(looseText(1000)).max(20),
 examples:z.array(z.object({prompt:looseText(10000),solution:looseText(20000)})).max(15),
}).strict();
const publishSchema=schoolGuideSchema.extend({summary:z.array(schoolGuideSchema.shape.summary.element).max(30),examples:z.array(schoolGuideSchema.shape.examples.element).max(15)});
export function parseGuideAuthoring(body,status){
 const {status:requested,expected_revision,...fields}=body;
 const content=(status==='published'?publishSchema:draftSchema).parse(fields);
 if(status==='published'&&!content.summary.length&&!content.formulas.length&&!content.examples.length)throw badRequest('Thêm kiến thức, công thức hoặc ví dụ trước khi cho học sinh xem.');
 return {content,expectedRevision:z.string().regex(/^[a-f0-9]{64}$/u).nullable().optional().parse(expected_revision)};
}
export function mergeGuideContent(raw,content){return {...parseJson(raw)||{},...content};}
export function createSchoolGuideWriter({withTransaction,resolveGroup}){
 return async function update(user,courseId,id,body,yearId){
  if(user.role!=='admin')throw new AppError(403,'FORBIDDEN','Chỉ quản trị viên được sửa kiến thức bài học.');
  await resolveGroup(user,courseId,id,yearId);
  return withTransaction(async connection=>{
   const run=async(sql,params=[])=>(await connection.query(sql,params))[0];await run('SELECT id FROM courses WHERE id=? FOR UPDATE',[courseId]);
   const [row]=await run('SELECT content_json,status FROM school_study_guides WHERE group_id=? FOR UPDATE',[id]);
   const status=guideStatusSchema.parse(body.status??row?.status??'draft'),{content,expectedRevision}=parseGuideAuthoring(body,status);
   if(expectedRevision!==undefined&&expectedRevision!==guideRevision(row))throw new AppError(409,'GUIDE_CHANGED','Bài đã được sửa ở nơi khác. Bản đang soạn vẫn được giữ; mở lại bài trước khi lưu.');
   const value=JSON.stringify(mergeGuideContent(row?.content_json,content));
   if(row)await run('UPDATE school_study_guides SET content_json=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE group_id=?',[value,status,id]);
   else await run('INSERT INTO school_study_guides(group_id,content_json,source_sha256,status) VALUES (?,?,?,?)',[id,value,createHash('sha256').update(value).digest('hex'),status]);
   return {saved:true,status,revision:guideRevision({content_json:value,status})};
  });
 };
}
