import {query,dialectSql,isPostgres} from '../config/db.js';
import {callConfig} from './chat-call-config.js';
export const requiredTables=['profiles','registration_otps','account_deletion_confirmations','courses','course_enrollments','questions','practice_sessions','practice_answers','exam_attempts','challenges','challenge_answers','chinese_lessons','chinese_sets','chinese_items','chinese_reviews','chinese_attempts','chinese_activities','worksheets','worksheet_attempts','chat_rooms','chat_members','chat_messages','chat_blocks','chat_reports','chat_friendships','learning_feedback','learning_goals','student_preferences','student_focus','learning_runs','learning_skill_state','learning_events','student_quest_claims','student_inventory','student_badges','student_gallery','study_assignments','study_assignment_members','guardian_pair_codes','guardian_links',...(isPostgres?['request_limits','file_assets']:[])];
requiredTables.push('chinese_speaking_submissions','chinese_speaking_clips');
requiredTables.push('chinese_ai_chat_settings','chinese_ai_chat_sessions');
requiredTables.push('chinese_street_lessons','chinese_street_progress');
requiredTables.push('user_access_tracking','user_access_events');
requiredTables.push('study_activity_sessions');
requiredTables.push('course_paid_access','course_payment_migrations','course_free_periods','course_momo_settings','course_momo_payments');
requiredTables.push('course_free_grants');
requiredTables.push('course_registration_free');
requiredTables.push('course_free_registrations');
requiredTables.push('school_lesson_materials');
requiredTables.push('school_study_guides','school_quiz_links');
requiredTables.push('password_reset_requests','password_reset_sessions');
requiredTables.push('school_curriculum_state');
export async function deploymentCheck(run=query){
 const expected=[...requiredTables,...(callConfig().enabled?['chat_call_control','chat_call_preferences','chat_calls','chat_call_reports','chat_push_subscriptions']:[])];
 const tables=await run(dialectSql('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()','SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema()'));
 const available=new Set(tables.map(r=>r.table_name||r.TABLE_NAME));
 const missing=expected.filter(name=>!available.has(name));
 const feedbackColumns=await run(dialectSql("SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='learning_feedback' AND column_name='reply_admin_id'","SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='learning_feedback' AND column_name='reply_admin_id'"));
 const replyAdminColumn=feedbackColumns.length>0;if(!replyAdminColumn)missing.push('learning_feedback.reply_admin_id');
 return {ready:!missing.length,database:isPostgres?'PostgreSQL':'MySQL',release:process.env.VERCEL_GIT_COMMIT_SHA||'local',missing,tables:[...expected.map(name=>({name,ready:available.has(name)})),{name:'learning_feedback.reply_admin_id',ready:replyAdminColumn}],features:['Đọc đề và lựa chọn','Học hôm nay','Báo cáo phụ huynh','Bạn bè và lời mời'],note:missing.length?'Cập nhật các migration còn thiếu trước khi triển khai. Kiểm tra này không tự sửa database.':'Các bảng và cột bắt buộc đã có. Cần thử đăng nhập, đọc âm thanh và gửi tin trên môi trường đích để xác nhận toàn bộ chức năng.'};
}
