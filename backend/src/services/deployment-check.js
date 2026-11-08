import {query,dialectSql,isPostgres} from '../config/db.js';
export const requiredTables=['profiles','courses','course_enrollments','questions','practice_sessions','practice_answers','exam_attempts','challenges','challenge_answers','chinese_lessons','chinese_sets','chinese_items','chinese_reviews','chinese_attempts','chinese_activities','worksheets','worksheet_attempts','chat_rooms','chat_members','chat_messages','chat_blocks','chat_reports','chat_friendships',...(isPostgres?['request_limits','file_assets']:[])];
export async function deploymentCheck(run=query){
 const tables=await run(dialectSql('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()','SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema()'));
 const available=new Set(tables.map(r=>r.table_name||r.TABLE_NAME));
 const missing=requiredTables.filter(name=>!available.has(name));
 return {ready:!missing.length,database:isPostgres?'PostgreSQL':'MySQL',release:process.env.VERCEL_GIT_COMMIT_SHA||'local',missing,tables:requiredTables.map(name=>({name,ready:available.has(name)})),features:['Đọc đề và lựa chọn','Học hôm nay','Báo cáo phụ huynh','Bạn bè và lời mời'],note:missing.length?'Cập nhật các migration còn thiếu trước khi triển khai. Kiểm tra này không tự sửa database.':'Các bảng bắt buộc đã có. Cần thử đăng nhập, đọc âm thanh và gửi tin trên môi trường đích để xác nhận toàn bộ chức năng.'};
}
