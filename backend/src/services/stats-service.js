import { query, dialectSql } from '../config/db.js';
import { studentProgramCondition } from '../utils/admin-permissions.js';
import { schoolGradeCondition, schoolPrograms } from '../middlewares/school-admin.js';
import {schoolSubjectName} from '../utils/school-subjects.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {AppError} from '../utils/errors.js';

function ledgerCondition(scope) {
  if(scope==='chinese')return `(dl.ref_type='chinese' OR (dl.ref_type='quest' AND EXISTS(SELECT 1 FROM student_quest_claims sq JOIN courses c ON c.id=sq.course_id WHERE sq.id=dl.ref_id AND sq.profile_id=dl.profile_id AND c.kind='chinese')))`;
  if (!schoolPrograms.includes(scope)) return '1=1';
  const grade = schoolGradeCondition(scope,'t.grade');
  return `((dl.ref_type='practice' AND EXISTS(SELECT 1 FROM practice_sessions x JOIN topics t ON t.id=x.topic_id WHERE x.id=dl.ref_id AND ${grade}))
    OR (dl.ref_type='exam' AND EXISTS(SELECT 1 FROM exam_attempts x JOIN topics t ON t.id=x.topic_id WHERE x.id=dl.ref_id AND ${grade}))
    OR (dl.ref_type='challenge' AND EXISTS(SELECT 1 FROM challenges x WHERE x.id=dl.ref_id AND ${schoolGradeCondition(scope,'x.grade')}))
    OR (dl.ref_type='quest' AND EXISTS(SELECT 1 FROM student_quest_claims sq JOIN courses c ON c.id=sq.course_id WHERE sq.id=dl.ref_id AND sq.profile_id=dl.profile_id AND c.kind='${scope}')))`;
}
async function topStudentsFor(scope,ledger){
  const studentFilter=schoolPrograms.includes(scope)||scope==='chinese'?` AND ${studentProgramCondition('p',scope)}`:'';
  const rows=await query(`SELECT p.id,p.display_name,p.avatar_key,p.grade,COALESCE(SUM(dl.amount),0) diamonds
    FROM diamond_ledger dl JOIN profiles p ON p.id=dl.profile_id
    WHERE dl.created_at>=${dialectSql('DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)',"CURRENT_TIMESTAMP(3) - INTERVAL '7 days'")}
    AND dl.amount>0 AND dl.reason<>'store_refund' AND p.deleted_at IS NULL AND ${ledger}${studentFilter}
    GROUP BY p.id,p.display_name,p.avatar_key,p.grade ORDER BY diamonds DESC,p.display_name ASC LIMIT 5`);
  return rows.map(row=>({profileId:row.id,displayName:row.display_name,avatarKey:row.avatar_key,grade:row.grade===null?null:Number(row.grade),diamonds:Number(row.diamonds),program:scope}));
}
export async function getAdminDiamondLeaders(viewer){
  const scope=adminScopeOf(viewer);
  if(!['super','chinese',...schoolPrograms].includes(scope))throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','You cannot view the diamond leaderboard.');
  return topStudentsFor(scope,ledgerCondition(scope));
}
export async function getAdminStats(scope = 'super') {
  const ledger = ledgerCondition(scope);
  const grade = schoolGradeCondition(scope,'t.grade');
  const studentFilter = schoolPrograms.includes(scope) ? ' AND '+studentProgramCondition('p',scope) : '';
  const [students] = await query(`SELECT COUNT(*) total,
    SUM(CASE WHEN banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP THEN 1 ELSE 0 END) active
    FROM profiles p WHERE role='student' AND p.deleted_at IS NULL${studentFilter}`);
  const [bank] = await query(`SELECT
    (SELECT COUNT(*) FROM subjects s WHERE EXISTS(SELECT 1 FROM topics t WHERE t.subject_id=s.id AND ${grade})) subjects,
    (SELECT COUNT(*) FROM topics t WHERE ${grade}) topics,
    COUNT(*) questions,
    COALESCE(SUM(CASE WHEN q.status='published' THEN 1 ELSE 0 END),0) published_questions,
    COALESCE(SUM(CASE WHEN q.status IN ('draft','visible') THEN 1 ELSE 0 END),0) draft_questions,
    COALESCE(SUM(CASE WHEN q.status='hidden' THEN 1 ELSE 0 END),0) hidden_questions
    FROM questions q JOIN topics t ON t.id=q.topic_id WHERE ${grade}`);
  const [practice] = await query(`SELECT COUNT(*) total FROM practice_sessions x JOIN topics t ON t.id=x.topic_id WHERE x.status='finished' AND ${grade}`);
  const [exam] = await query(`SELECT COUNT(*) total FROM exam_attempts x JOIN topics t ON t.id=x.topic_id WHERE x.status='submitted' AND ${grade}`);
  const [diamonds] = await query(`SELECT COALESCE(SUM(dl.amount),0) total FROM diamond_ledger dl WHERE dl.amount>0 AND dl.reason<>'store_refund' AND ${ledger}`);
  const bySubject = await query(`SELECT s.id,s.name,s.color,
    (SELECT COUNT(*) FROM practice_sessions x JOIN topics t ON t.id=x.topic_id WHERE t.subject_id=s.id AND x.status='finished' AND ${grade}) practices,
    (SELECT COUNT(*) FROM exam_attempts x JOIN topics t ON t.id=x.topic_id WHERE t.subject_id=s.id AND x.status='submitted' AND ${grade}) exams
    FROM subjects s ${['primary','secondary'].includes(scope)?"WHERE s.id IN ('toan','tieng-viet','tieng-anh')":''} ORDER BY s.sort_order`);
  const topStudents = await topStudentsFor(scope,ledger);
  return {
    scope,
    students:{total:Number(students.total),active:Number(students.active)},
    bank:{subjects:Number(bank.subjects),topics:Number(bank.topics),questions:Number(bank.questions),publishedQuestions:Number(bank.published_questions),draftQuestions:Number(bank.draft_questions),hiddenQuestions:Number(bank.hidden_questions)},
    practiceSessions:Number(practice.total),examAttempts:Number(exam.total),
    diamondsAwarded:Number(diamonds.total),
    bySubject:bySubject.map(row=>({id:row.id,name:schoolSubjectName(row.id,scope==='highschool'?10:scope==='secondary'?6:0,row.name),color:row.color,practices:Number(row.practices),exams:Number(row.exams)})),
    topStudents,
  };
}
