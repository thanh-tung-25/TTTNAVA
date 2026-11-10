import { query, dialectSql } from '../config/db.js';
import { studentProgramCondition } from '../utils/admin-permissions.js';
import { schoolGradeCondition, schoolPrograms } from '../middlewares/school-admin.js';
import {schoolSubjectName} from '../utils/school-subjects.js';

function ledgerCondition(scope) {
  if (!schoolPrograms.includes(scope)) return '1=1';
  const grade = schoolGradeCondition(scope,'t.grade');
  return `((dl.ref_type='practice' AND EXISTS(SELECT 1 FROM practice_sessions x JOIN topics t ON t.id=x.topic_id WHERE x.id=dl.ref_id AND ${grade}))
    OR (dl.ref_type='exam' AND EXISTS(SELECT 1 FROM exam_attempts x JOIN topics t ON t.id=x.topic_id WHERE x.id=dl.ref_id AND ${grade}))
    OR (dl.ref_type='challenge' AND EXISTS(SELECT 1 FROM challenges x WHERE x.id=dl.ref_id AND ${schoolGradeCondition(scope,'x.grade')})))`;
}
export async function getAdminStats(scope = 'super') {
  const grade = schoolGradeCondition(scope,'t.grade'), ledger = ledgerCondition(scope);
  const studentFilter = schoolPrograms.includes(scope) ? ' AND '+studentProgramCondition('p',scope) : '';
  const [students] = await query(`SELECT COUNT(*) total,
    SUM(CASE WHEN banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP THEN 1 ELSE 0 END) active
    FROM profiles p WHERE role='student'${studentFilter}`);
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
  const [challenge] = await query(`SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN bot_level IS NOT NULL THEN 1 ELSE 0 END),0) robot
    FROM challenges x WHERE ${schoolGradeCondition(scope,'x.grade')} AND (x.status='finished'
    OR (x.status='in_progress' AND ${dialectSql('x.ends_at + INTERVAL 60 SECOND',"x.ends_at + INTERVAL '60 seconds'")}>CURRENT_TIMESTAMP(3)))`);
  const [diamonds] = await query(`SELECT COALESCE(SUM(dl.amount),0) total FROM diamond_ledger dl WHERE dl.amount>0 AND ${ledger}`);
  const bySubject = await query(`SELECT s.id,s.name,s.color,
    (SELECT COUNT(*) FROM practice_sessions x JOIN topics t ON t.id=x.topic_id WHERE t.subject_id=s.id AND x.status='finished' AND ${grade}) practices,
    (SELECT COUNT(*) FROM exam_attempts x JOIN topics t ON t.id=x.topic_id WHERE t.subject_id=s.id AND x.status='submitted' AND ${grade}) exams
    FROM subjects s ORDER BY s.sort_order`);
  const topStudents = await query(`SELECT p.id,p.display_name,p.avatar_key,p.grade,COALESCE(SUM(dl.amount),0) diamonds
    FROM diamond_ledger dl JOIN profiles p ON p.id=dl.profile_id
    WHERE dl.created_at>=${dialectSql('DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)',"CURRENT_TIMESTAMP(3) - INTERVAL '7 days'")}
    AND dl.amount>0 AND ${ledger}
    GROUP BY p.id,p.display_name,p.avatar_key,p.grade ORDER BY diamonds DESC LIMIT 5`);
  return {
    students:{total:Number(students.total),active:Number(students.active)},
    bank:{subjects:Number(bank.subjects),topics:Number(bank.topics),questions:Number(bank.questions),publishedQuestions:Number(bank.published_questions),draftQuestions:Number(bank.draft_questions),hiddenQuestions:Number(bank.hidden_questions)},
    practiceSessions:Number(practice.total),examAttempts:Number(exam.total),
    challenges:{total:Number(challenge.total),robot:Number(challenge.robot)},diamondsAwarded:Number(diamonds.total),
    bySubject:bySubject.map(row=>({id:row.id,name:schoolSubjectName(row.id,scope==='secondary'?6:0,row.name),color:row.color,practices:Number(row.practices),exams:Number(row.exams)})),
    topStudents:topStudents.map(row=>({profileId:row.id,displayName:row.display_name,avatarKey:row.avatar_key,grade:Number(row.grade),diamonds:Number(row.diamonds)})),
  };
}
