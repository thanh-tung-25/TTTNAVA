import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config({path:new URL('../.env.vercel',import.meta.url),quiet:true});
dotenv.config({path:new URL('../.env.supabase',import.meta.url),quiet:true});
process.env.DB_DRIVER='postgres';process.env.PGPORT='6543';process.env.PG_READ_ONLY='false';
const {query,withTransaction,closePool,isPostgres}=await import('../src/config/db.js');
const {startStudyActivity,finishStudyActivity}=await import('../src/services/study-activity.js');
const {getDiamondSummary}=await import('../src/services/ledger-service.js');
const rollback=new Error('ROLLBACK_STUDY_REWARD_CHECK');
let sessionId,checked=false;
try{
 assert.ok(isPostgres);
 const [student]=await query("SELECT p.id FROM profiles p JOIN course_enrollments e ON e.student_id=p.id WHERE p.role='student' AND p.account_kind<>'guardian' AND p.deleted_at IS NULL AND (p.banned_until IS NULL OR p.banned_until<=CURRENT_TIMESTAMP) AND e.course_id='hsk-1' AND e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP) LIMIT 1");
 assert.ok(student,'Cần một tài khoản có quyền học HSK 1 để kiểm tra transaction.');
 try{await withTransaction(async c=>{
  await c.query('SELECT id FROM profiles WHERE id=? FOR UPDATE',[student.id]);
  const before=await getDiamondSummary(student.id);
  const session=await startStudyActivity(student.id,'hsk-1',{activity:'lab',source_id:'chinese'});sessionId=session.id;
  const evidence={actions:['qa1','qa2','qa3','qa4','qa5']};
  const first=await finishStudyActivity(student.id,session.id,evidence);assert.equal(first.reward.earned,1);
  const again=await finishStudyActivity(student.id,session.id,evidence);assert.equal(again.reward.earned,0);
  const after=await getDiamondSummary(student.id);assert.equal(Number(after.total),Number(before.total)+1);assert.equal(Number(after.programs.chinese.total),Number(before.programs.chinese.total)+1);assert.equal(Number(after.programs.primary.total),Number(before.programs.primary.total));
  checked=true;throw rollback;
 });}catch(error){if(error!==rollback)throw error;}
 assert.ok(checked);assert.equal((await query('SELECT id FROM study_activity_sessions WHERE id=?',[sessionId])).length,0);
 console.log(JSON.stringify({passed:true,transaction_rolled_back:true,completion_and_credit:true,duplicate_prevented:true,program:'chinese',saved_test_sessions:0}));
}catch(error){console.error(JSON.stringify({passed:false,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Kiểm tra thất bại; transaction đã được hoàn tác.'}));process.exitCode=1;}finally{await closePool();}
