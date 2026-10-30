import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withTransaction, query } from '../config/db.js';
import { one, json } from '../repositories/chinese.js';
import { parse } from '../validators/chinese.js';

export async function createSet(body) {
 const d=parse(z.object({lesson_id:z.string().uuid(),title:z.string().trim().min(1).max(255)}),body);
 await one('SELECT id FROM chinese_lessons WHERE id=?',[d.lesson_id]);
 const id=randomUUID();await query('INSERT INTO chinese_sets (id,lesson_id,title) VALUES (?,?,?)',[id,d.lesson_id,d.title]);return {id};
}
export async function removeContent(kind,id) {
 id=parse(z.string().uuid(),id);
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  const table={lesson:'chinese_lessons',set:'chinese_sets',test:'chinese_tests'}[kind];
  await one(`SELECT id FROM ${table} WHERE id=? FOR UPDATE`,[id],run);
  if(kind==='test'){
   await run('UPDATE chinese_attempts SET test_id=NULL WHERE test_id=?',[id]);
   await run('DELETE FROM chinese_tests WHERE id=?',[id]);return {id};
  }
  const sets=await run(`SELECT id,document_id FROM chinese_sets WHERE ${kind==='lesson'?'lesson_id':'id'}=? FOR UPDATE`,[id]);
  const removed=new Set(sets.map(s=>s.id));
  const tests=await run('SELECT id,set_ids FROM chinese_tests FOR UPDATE');
  for(const test of tests){
   const sources=json(test.set_ids),remaining=sources.filter(s=>!removed.has(s));
   if(remaining.length!==sources.length)await run("UPDATE chinese_tests SET set_ids=?,status='draft' WHERE id=?",[JSON.stringify(remaining),test.id]);
  }
  for(const set of sets){
   // Attempts contain a complete snapshot, so their results survive source deletion.
   await run('UPDATE chinese_attempts SET set_id=NULL WHERE set_id=?',[set.id]);
   await run('DELETE FROM chinese_progress WHERE set_id=?',[set.id]);
   await run('DELETE r FROM chinese_review_events r JOIN chinese_items i ON i.id=r.item_id WHERE i.set_id=?',[set.id]);
   await run('DELETE r FROM chinese_reviews r JOIN chinese_items i ON i.id=r.item_id WHERE i.set_id=?',[set.id]);
   await run('DELETE FROM chinese_items WHERE set_id=?',[set.id]);
   await run('DELETE FROM chinese_sets WHERE id=?',[set.id]);
   if(set.document_id)await run('DELETE FROM chinese_documents WHERE id=? AND NOT EXISTS (SELECT 1 FROM chinese_sets WHERE document_id=?)',[set.document_id,set.document_id]);
  }
  if(kind==='lesson')await run('DELETE FROM chinese_lessons WHERE id=?',[id]);
  return {id};
 });
}
