import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {query,dialectSql} from '../config/db.js';
import {AppError,notFound} from '../utils/errors.js';
import {adminScopeOf,studentProgramCondition} from '../utils/admin-permissions.js';
import {studentVisibleCondition} from '../utils/student-visibility.js';
export const ACCESS_RETENTION_DAYS=90;
export const accessPages={student_courses:'Chọn khóa học',student_home:'Trang chủ học sinh',student_today:'Học hôm nay',student_progress:'Tiến độ học tập',student_history:'Lịch sử học tập',student_profile:'Cá nhân',student_practice:'Ôn luyện',student_exam:'Thử sức',student_worksheets:'Phiếu bài tập',student_session:'Buổi học',student_assignments:'Bài được giao',student_activities:'Hoạt động tương tác',student_study_hub:'Góc học tập',chinese_lessons:'Tiếng Trung · Bài học',chinese_cards:'Tiếng Trung · Thẻ lật',chinese_words:'Tiếng Trung · Từ mới',chinese_listen:'Tiếng Trung · Luyện nghe',chinese_quiz:'Tiếng Trung · Quiz',chinese_apply:'Tiếng Trung · Vận dụng',chinese_speak:'Tiếng Trung · Luyện nói',chinese_read:'Tiếng Trung · Bài đọc',chinese_history:'Tiếng Trung · Kết quả',chinese_notebook:'Tiếng Trung · Sổ từ',chinese_tests:'Tiếng Trung · Kiểm tra',chinese_ai_chat:'Tiếng Trung · Giao tiếp AI',chinese_street:'Tiếng Trung · Phố tiếng Trung',admin_students:'Quản trị · Học sinh',admin_chinese:'Quản trị · Tiếng Trung',admin_access_history:'Quản trị · Lịch sử truy cập',admin_stats:'Quản trị · Thống kê',admin_team:'Quản trị · Quản trị viên',admin_courses:'Quản trị · Khóa học',admin_assignments:'Quản trị · Giao bài',admin_feedback:'Quản trị · Phản ánh',admin_questions:'Quản trị · Nội dung',admin_deployment:'Quản trị · Cập nhật hệ thống',guardian_portal:'Cổng phụ huynh',student_other:'Khu học sinh',admin_other:'Khu quản trị'};
export function accessPageKey(originalUrl){
 let url;try{url=new URL(originalUrl,'http://internal');}catch{return null;}
 const match=url.pathname.match(/^\/pages\/(student|admin|guardian)(?:\/([a-z-]+))?(?:\/index\.html|\/)?$/u);if(!match)return null;
 const [,role,folder='']=match;if(role==='guardian')return 'guardian_portal';
 if(role==='student'&&folder==='chinese'){
  if(url.searchParams.has('attempt'))return 'chinese_quiz';
  const view=url.searchParams.get('view'),mode=url.searchParams.get('mode');if(['ai-chat','street','history','notebook','tests'].includes(view))return 'chinese_'+view.replaceAll('-','_');
  if(['cards','words','listen','apply','speak','read','quiz'].includes(mode))return 'chinese_'+mode;return 'chinese_lessons';
 }
 const key=role+'_'+folder.replaceAll('-','_');return key in accessPages?key:role+'_other';
}
export function accessDevice(userAgent=''){
 const ua=String(userAgent).slice(0,1000),device=/ipad|tablet|android(?!.*mobile)/i.test(ua)?'tablet':/mobile|iphone|ipod/i.test(ua)?'mobile':'desktop';
 const browser=/edg\//i.test(ua)?'Edge':/firefox|fxios/i.test(ua)?'Firefox':/samsungbrowser/i.test(ua)?'Samsung Internet':/chrome|crios/i.test(ua)?'Chrome':/safari/i.test(ua)?'Safari':'Khác';return {device,browser};
}
let cleanupDay='',warned=false;
export async function pruneAccessHistory(){
 const claimed=await query('UPDATE user_access_tracking SET last_cleanup_at=CURRENT_TIMESTAMP(3) WHERE id=1 AND last_cleanup_at<?',[new Date(Date.now()-86400000)]);
 if(claimed.affectedRows)await query('DELETE FROM user_access_events WHERE id IN (SELECT id FROM (SELECT id FROM user_access_events WHERE last_seen_at<? ORDER BY last_seen_at LIMIT 2000) expired)',[new Date(Date.now()-ACCESS_RETENTION_DAYS*86400000)]);
}
export async function recordUserAccess(user,event,request){
 if(!user?.id||!['login','page','logout'].includes(event))return;
 if(event==='page'&&(request.method!=='GET'||/prefetch/i.test(request.get?.('sec-purpose')||request.get?.('purpose')||'')))return;
 const page=event==='page'?accessPageKey(request.originalUrl):'';if(event==='page'&&!page)return;
 const {device,browser}=accessDevice(request.get?.('user-agent'));
 const cookieCourse=request.cookies?.ttnava_course,course=event==='page'&&user.role==='student'&&/^(hsk|grade)-[1-9]$/u.test(cookieCourse||'')?cookieCourse:null;
 const dedup=event==='page'?createHash('sha256').update(JSON.stringify([user.id,page,course,device,browser,Math.floor(Date.now()/60000)])).digest('hex'):null;
 try{
  await query(dialectSql('INSERT INTO user_access_events(id,profile_id,event_type,page_key,course_id,device_type,browser,dedup_key) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE last_seen_at=CURRENT_TIMESTAMP(3),visits_count=LEAST(visits_count+1,9999)','INSERT INTO user_access_events(id,profile_id,event_type,page_key,course_id,device_type,browser,dedup_key) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(dedup_key) DO UPDATE SET last_seen_at=CURRENT_TIMESTAMP(3),visits_count=LEAST(user_access_events.visits_count+1,9999)'),[randomUUID(),user.id,event,page,course,device,browser,dedup]);
  const day=new Date().toISOString().slice(0,10);if(cleanupDay!==day){cleanupDay=day;await pruneAccessHistory();}
 }catch{if(!warned){warned=true;console.warn('Access history recording unavailable; authentication and page access continue.');}}
}
const optionsSchema=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),limit:z.coerce.number().int().min(1).max(50).default(20),q:z.string().trim().max(100).default(''),role:z.enum(['','student','admin']).default(''),program:z.enum(['','chinese','primary','secondary']).default('')});
function visibility(viewer){
 const scope=adminScopeOf(viewer);if(!scope)throw new AppError(403,'FORBIDDEN','Bạn không có quyền xem nhật ký.');
 return scope==='super'?"p.role IN ('student','admin')":`p.role='student' AND ${studentVisibleCondition(viewer,'p')} AND ${studentProgramCondition('p',scope)}`;
}
async function tracking(){const [row]=await query('SELECT enabled_at FROM user_access_tracking WHERE id=1');return {tracking_since:row?.enabled_at||null,retention_days:ACCESS_RETENTION_DAYS,page_labels:accessPages};}
export async function accessAccounts(viewer,input){
 const d=optionsSchema.parse(input),conditions=[visibility(viewer),'p.deleted_at IS NULL'],params=[];
 if(d.q){conditions.push('(p.username LIKE ? OR p.display_name LIKE ?)');params.push('%'+d.q+'%','%'+d.q+'%');}
 if(d.role){conditions.push('p.role=?');params.push(d.role);}
 if(d.program){conditions.push("p.role='student'",studentProgramCondition('p',d.program));}
 const where=conditions.join(' AND '),cutoff=new Date(Date.now()-ACCESS_RETENTION_DAYS*86400000);
 const [count]=await query('SELECT COUNT(*) total FROM profiles p WHERE '+where,params);
 const items=await query(`SELECT p.id,p.username,p.display_name,p.role,p.admin_scope,p.account_kind,a.latest_at,COALESCE(a.page_views,0) page_views,COALESCE(a.logins,0) logins,r.event_type last_event,r.page_key last_page,r.device_type last_device,r.browser last_browser FROM profiles p LEFT JOIN (SELECT profile_id,MAX(last_seen_at) latest_at,SUM(CASE WHEN event_type='page' THEN visits_count ELSE 0 END) page_views,SUM(CASE WHEN event_type='login' THEN 1 ELSE 0 END) logins FROM user_access_events WHERE last_seen_at>=? GROUP BY profile_id) a ON a.profile_id=p.id LEFT JOIN user_access_events r ON r.id=(SELECT e.id FROM user_access_events e WHERE e.profile_id=p.id AND e.last_seen_at>=? ORDER BY e.last_seen_at DESC,e.id DESC LIMIT 1) WHERE ${where} ORDER BY CASE WHEN a.latest_at IS NULL THEN 1 ELSE 0 END,a.latest_at DESC,p.username,p.id LIMIT ? OFFSET ?`,[cutoff,cutoff,...params,d.limit,(d.page-1)*d.limit]);
 return {...await tracking(),items:items.map(item=>({...item,page_views:Number(item.page_views),logins:Number(item.logins)})),total:Number(count.total),page:d.page,limit:d.limit};
}
const eventFilters=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),limit:z.coerce.number().int().min(1).max(50).default(25),type:z.enum(['','login','page','logout']).default(''),from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}).strict();
function filterDate(value){const [year,month,day]=value.split('-').map(Number),check=new Date(Date.UTC(year,month-1,day));if(!Number.isFinite(check.getTime())||check.toISOString().slice(0,10)!==value)throw new AppError(400,'BAD_DATE','Ngày lọc chưa hợp lệ.');return new Date(value+'T00:00:00+07:00');}
export async function accessHistory(viewer,id,input){
 id=z.string().uuid().parse(id);const scope=visibility(viewer),[profile]=await query(`SELECT p.id,p.username,p.display_name,p.role,p.admin_scope,p.account_kind,p.deleted_at FROM profiles p WHERE p.id=? AND ${scope}`,[id]);if(!profile||profile.deleted_at&&adminScopeOf(viewer)!=='super')throw notFound('Không tìm thấy tài khoản trong quyền quản lý.');
 const d=eventFilters.parse(input),conditions=['profile_id=?','last_seen_at>=?'],params=[id,new Date(Date.now()-ACCESS_RETENTION_DAYS*86400000)];
 if(d.type){conditions.push('event_type=?');params.push(d.type);}
 if(d.from){conditions.push('last_seen_at>=?');params.push(filterDate(d.from));}
 if(d.to){const date=filterDate(d.to);if(d.from&&d.from>d.to)throw new AppError(400,'BAD_DATE','Khoảng ngày chưa hợp lệ.');conditions.push('created_at<?');params.push(new Date(date.getTime()+86400000));}
 const where=conditions.join(' AND '),[count]=await query('SELECT COUNT(*) total FROM user_access_events WHERE '+where,params),items=await query('SELECT id,event_type,page_key,course_id,device_type,browser,visits_count,created_at,last_seen_at FROM user_access_events WHERE '+where+' ORDER BY last_seen_at DESC,id DESC LIMIT ? OFFSET ?',[...params,d.limit,(d.page-1)*d.limit]);
 return {...await tracking(),profile,items:items.map(item=>({...item,visits_count:Number(item.visits_count)})),total:Number(count.total),page:d.page,limit:d.limit};
}
