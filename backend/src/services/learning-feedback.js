import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {parse} from '../validators/chinese.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {forbidden} from '../utils/errors.js';
import {studentVisibleCondition} from '../utils/student-visibility.js';
import {feedbackVersion,createFeedbackUpdater} from './feedback-reply.js';
export const categories=['question','answer','audio','image','display','account','payment','suggestion','other'];
export async function sendFeedback(user,body){
 const d=parse(z.object({category:z.enum(categories),message:z.string().trim().min(5).max(4000),page_url:z.string().max(1000).regex(/^\/(?!\/)/),context_text:z.string().max(2000).default(''),scope:z.enum(['general','primary','secondary','highschool','chinese']).default('general')}),body);
 // Categories about accounts and payments go to the general administrator.
 const scope=['account','payment'].includes(d.category)?'general':d.scope;
 const id=randomUUID();await query('INSERT INTO learning_feedback(id,reporter_id,scope,category,message,page_url,context_text) VALUES (?,?,?,?,?,?,?)',[id,user.id,scope,d.category,d.message,d.page_url,d.context_text]);return {id};
}
export async function listFeedback(user,manage=false){
 const scope=adminScopeOf(user);
 if(manage&&!scope)throw forbidden('Chỉ quản trị viên được xử lý phản ánh.');
 const where=manage?(scope==='super'?'1=1':'f.scope=?'):'f.reporter_id=?';
 const params=manage?(scope==='super'?[]:[scope]):[user.id];
 const rows=await query(`SELECT f.*,p.display_name FROM learning_feedback f JOIN profiles p ON p.id=f.reporter_id WHERE ${where} AND ${studentVisibleCondition(user,'p')} ORDER BY f.created_at DESC,f.id DESC LIMIT 200`,params);
 return rows.map(row=>({...row,reply_version:feedbackVersion(row)}));
}
export const updateFeedback=createFeedbackUpdater({withTransaction});
