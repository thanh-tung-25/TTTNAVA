import { query } from '../config/db.js';
import { notFound } from '../utils/errors.js';
export const json = value => typeof value === 'string' ? JSON.parse(value) : value;
export async function one(sql, params = [], run = query) { const rows = await run(sql,params); if (!rows[0]) throw notFound(); return rows[0]; }
export const setSelect = `SELECT s.*, l.level_id, l.title lesson_title, l.status lesson_status, d.filename, d.created_at uploaded_at
 FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id LEFT JOIN chinese_documents d ON d.id=s.document_id`;
export async function getSet(id, admin = false, run = query) {
 return one(`${setSelect} WHERE s.id=? ${admin ? '' : "AND s.status='published' AND l.status='published'"}`, [id],run);
}
export async function getItems(id, run = query) {
 return (await run('SELECT * FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id',[id])).map(i => ({...i,data:json(i.data)}));
}
export function publicItem(i) {
 if (i.kind !== 'question') return i;
 const {accepted,explanation,...data} = i.data; return {...i,data};
}
export async function catalog(admin, student) {
 const levels = await query('SELECT * FROM chinese_levels ORDER BY id');
 const lessons = await query(`SELECT * FROM chinese_lessons ${admin ? '' : "WHERE status='published'"} ORDER BY level_id,position,title`);
 const sets = await query(`${setSelect} ${admin ? '' : "WHERE s.status='published' AND l.status='published'"} ORDER BY s.position,s.created_at`);
 const counts = await query(`SELECT i.set_id,i.kind,COUNT(*) total FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE i.active=1 ${admin?'':"AND s.status='published' AND l.status='published'"} GROUP BY i.set_id,i.kind`);
 const reviews = admin ? [] : await query('SELECT r.* FROM chinese_reviews r WHERE student_id=?',[student]);
 const progress = admin ? [] : await query('SELECT * FROM chinese_progress WHERE student_id=? ORDER BY updated_at DESC',[student]);
 const completion=[];
 if(!admin) {
  const reviewed=new Set(reviews.filter(r=>r.review_count>0).map(r=>r.item_id));
  const read=new Set(progress.flatMap(p=>json(p.read_items)));
  const attempts=await query('SELECT snapshot,answers FROM chinese_attempts WHERE student_id=?',[student]);
  const locked=new Set(); for(const a of attempts)for(const [id,answer]of Object.entries(json(a.answers)))if(answer.locked&&answer.value)locked.add(id);
  const rows=await query(`SELECT i.id,i.kind,i.set_id FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE i.active=1 AND s.status='published' AND l.status='published'`);
  for(const s of sets)completion.push({set_id:s.id,done:rows.filter(i=>i.set_id===s.id&&(i.kind==='vocabulary'?reviewed.has(i.id):i.kind==='question'?locked.has(i.id):read.has(i.id))).length});
 }
 return {levels,lessons,sets,counts,reviews,progress,completion};
}
