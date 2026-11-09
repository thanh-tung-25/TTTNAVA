import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query} from '../config/db.js';
import {one} from '../repositories/chinese.js';
import {parse} from '../validators/chinese.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {forbidden} from '../utils/errors.js';
export const categories=['question','answer','audio','image','display','account','payment','suggestion','other'];
export async function sendFeedback(user,body){
 const d=parse(z.object({category:z.enum(categories),message:z.string().trim().min(5).max(4000),page_url:z.string().max(1000).regex(/^\/(?!\/)/),context_text:z.string().max(2000).default(''),scope:z.enum(['general','primary','chinese']).default('general')}),body);
 // Categories about accounts and payments go to the general administrator.
 const scope=['account','payment'].includes(d.category)?'general':d.scope;
 const id=randomUUID();await query('INSERT INTO learning_feedback(id,reporter_id,scope,category,message,page_url,context_text) VALUES (?,?,?,?,?,?,?)',[id,user.id,scope,d.category,d.message,d.page_url,d.context_text]);return {id};
}
export async function listFeedback(user,manage=false){
 const scope=adminScopeOf(user);
 if(manage&&!scope)throw forbidden('Chỉ quản trị viên được xử lý phản ánh.');
 const where=manage?(scope==='super'?'1=1':'f.scope=?'):'f.reporter_id=?';
 const params=manage?(scope==='super'?[]:[scope]):[user.id];
 return query(`SELECT f.*,p.display_name FROM learning_feedback f JOIN profiles p ON p.id=f.reporter_id WHERE ${where} ORDER BY f.created_at DESC,f.id DESC LIMIT 200`,params);
}
export async function updateFeedback(user,id,body){
 id=parse(z.string().uuid(),id);const scope=adminScopeOf(user);
 if(!scope)throw forbidden('Chỉ quản trị viên được xử lý phản ánh.');
 const row=await one('SELECT scope FROM learning_feedback WHERE id=?',[id]);
 if(scope!=='super'&&scope!==row.scope)throw forbidden('Phản ánh thuộc phạm vi quản trị khác.');
 const d=parse(z.object({status:z.enum(['open','reviewing','resolved']),reply:z.string().trim().max(2000).default('')}),body);
 await query('UPDATE learning_feedback SET status=?,reply=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[d.status,d.reply,id]);return {id,...d};
}
