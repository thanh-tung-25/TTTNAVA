import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createCurriculumManager} from '../src/services/school-curriculum-management.js';
import {curriculumSettings,curriculumVisibleSql,topicVisibleSql} from '../src/services/school-curriculum-state.js';
import {studyGroupRows} from '../src/services/school-study.js';
import {buildSchoolGroups} from '../src/services/school-study-groups.js';

function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(`
 CREATE TABLE school_years(id TEXT,is_active INTEGER,sort_order INTEGER);
 CREATE TABLE curriculum_chapters(id TEXT PRIMARY KEY,name TEXT,sort_order INTEGER,grade INTEGER,school_year_id TEXT,subject_id TEXT,semester TEXT,is_legacy INTEGER DEFAULT 0);
 CREATE TABLE curriculum_lessons(id TEXT PRIMARY KEY,name TEXT,sort_order INTEGER,chapter_id TEXT,topic_id TEXT);
 CREATE TABLE school_curriculum_state(kind TEXT,target_id TEXT,status TEXT,updated_by TEXT,updated_at TEXT,PRIMARY KEY(kind,target_id));
 CREATE TABLE topics(id TEXT PRIMARY KEY);CREATE TABLE learning_runs(id TEXT,snapshot TEXT);CREATE TABLE questions(id TEXT,topic_id TEXT,answer TEXT);
 INSERT INTO school_years VALUES('2026',1,0);
 INSERT INTO curriculum_chapters VALUES('chapter','Math',1,12,'2026','toan','hk1',0),('unit','Unit 1',2,12,'2026','tieng-anh','hk1',0),('primary','Primary',1,1,'2026','toan','hk1',0);
 INSERT INTO curriculum_lessons VALUES('lesson','Original',1,'chapter','topic'),('part1','Reading',1,'unit','english1'),('part2','Writing',2,'unit','english2'),('primary-l','One',1,'primary','p1');
 INSERT INTO topics VALUES('topic'),('english1'),('english2'),('p1'),('legacy');
 INSERT INTO questions VALUES('q1','topic','private key');INSERT INTO learning_runs VALUES('run','old title and learner answers');
 `);
 const statements=[];const run=async(sql,params=[])=>{
  statements.push(sql);const statement=db.prepare(sql.replace(/ FOR UPDATE\b/gu,''));
  return /^\s*SELECT/iu.test(sql)?statement.all(...params):statement.run(...params);
 };
 const manager=createCurriculumManager(async work=>{db.exec('BEGIN');try{const value=await work({query:async(sql,p)=>[await run(sql,p)]});db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}});
 const protectedState=()=>JSON.stringify({runs:db.prepare('SELECT * FROM learning_runs').all(),questions:db.prepare('SELECT * FROM questions').all(),topics:db.prepare('SELECT * FROM topics').all()});
 return {db,run,manager,statements,protectedState};
}
const admin={id:'admin-fixture',role:'admin',admin_scope:'super'};
test('renaming, sorting, hiding, deleting and restoring only change curriculum metadata, not learner content',async()=>{
 const f=fixture(),before=f.protectedState();try{
  const original=curriculumSettings('lesson','lesson','Original',1),edit={name:'New title',sortOrder:4,status:'hidden',expected_revision:original.revision};
  const saved=await f.manager(admin,'lesson','lesson',edit);assert.equal(f.db.prepare('SELECT name FROM curriculum_lessons WHERE id=?').get('lesson').name,'New title');
  const deleted=await f.manager(admin,'lesson','lesson',{expected_revision:saved.settings.revision},true);assert.equal(deleted.settings.status,'deleted');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM curriculum_lessons').get().n,4);
  const restored=await f.manager(admin,'lesson','lesson',{name:'Restored',sortOrder:2,status:'draft',expected_revision:deleted.settings.revision});assert.equal(restored.settings.status,'draft');assert.equal(f.protectedState(),before);
  assert(f.statements.filter(sql=>/^(?:UPDATE|INSERT)/u.test(sql)).every(sql=>/school_curriculum_state|curriculum_lessons/u.test(sql)));assert(!f.statements.some(sql=>/^DELETE/u.test(sql)));
 }finally{f.db.close();}
});
test('management rejects wrong roles, out-of-scope teachers, stale saves and stale deletes before writing',async()=>{
 const f=fixture();try{
  const initial=curriculumSettings('lesson','lesson','Original',1),body={name:'Valid',sortOrder:1,status:'published',expected_revision:initial.revision};
  await assert.rejects(()=>f.manager({role:'student'},'lesson','lesson',body),{status:403});assert.equal(f.statements.length,0);
  await assert.rejects(()=>f.manager({...admin,admin_scope:'primary'},'lesson','lesson',body),{status:403});assert(!f.statements.some(sql=>/^UPDATE|^INSERT/u.test(sql)));
  await f.manager(admin,'lesson','lesson',body);const writes=f.statements.filter(sql=>/^UPDATE|^INSERT/u.test(sql)).length;
  await assert.rejects(()=>f.manager(admin,'lesson','lesson',body),{code:'CURRICULUM_CHANGED'});await assert.rejects(()=>f.manager(admin,'lesson','lesson',{expected_revision:initial.revision},true),{code:'CURRICULUM_CHANGED'});
  assert.equal(f.statements.filter(sql=>/^UPDATE|^INSERT/u.test(sql)).length,writes);
 }finally{f.db.close();}
});
test('a failed state write rolls back the rename and order update',async()=>{
 const f=fixture();try{
  f.db.exec("CREATE TRIGGER fail_state BEFORE INSERT ON school_curriculum_state BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
  await assert.rejects(()=>f.manager(admin,'lesson','lesson',{name:'Must roll back',sortOrder:3,status:'draft',expected_revision:curriculumSettings('lesson','lesson','Original',1).revision}));
  const row=f.db.prepare("SELECT name,sort_order FROM curriculum_lessons WHERE id='lesson'").get();assert.equal(row.name,'Original');assert.equal(row.sort_order,1);
 }finally{f.db.close();}
});
test('student SQL excludes drafts, hidden and deleted paths while preserving unassigned and shared topics',async()=>{
 const f=fixture();try{
  f.db.exec("INSERT INTO school_curriculum_state(kind,target_id,status) VALUES('lesson','lesson','deleted'),('chapter','unit','hidden');");
  const student=await studyGroupRows(12,f.run,'2026'),teacher=await studyGroupRows(12,f.run,'2026',{admin:true});assert.equal(student.length,0);assert.equal(teacher.length,3);
  const visible=()=>f.db.prepare(`SELECT t.id FROM topics t WHERE ${topicVisibleSql()} ORDER BY t.id`).all().map(row=>row.id);
  assert.deepEqual(visible(),['legacy','p1']);
  f.db.exec("INSERT INTO curriculum_lessons VALUES('shared','Shared',2,'primary','topic');");assert(visible().includes('topic'));
  assert.throws(()=>curriculumVisibleSql('c; DROP TABLE topics'));
 }finally{f.db.close();}
});
test('merged Units rename and disappear together; published groups retain actual lesson ordering',async()=>{
 const f=fixture();try{
  let groups=buildSchoolGroups(await studyGroupRows(12,f.run,'2026'));assert.equal(groups.find(g=>g.id==='unit').parts.length,2);
  const saved=await f.manager(admin,'chapter','unit',{name:'Renamed Unit',sortOrder:0,status:'published',expected_revision:curriculumSettings('chapter','unit','Unit 1',2).revision});
  groups=buildSchoolGroups(await studyGroupRows(12,f.run,'2026'));assert.equal(groups[0].id,'unit');assert.equal(groups[0].title,'Renamed Unit');
  await f.manager(admin,'chapter','unit',{expected_revision:saved.settings.revision},true);groups=buildSchoolGroups(await studyGroupRows(12,f.run,'2026'));assert(!groups.some(g=>g.id==='unit'));assert.equal(f.db.prepare("SELECT COUNT(*) n FROM curriculum_lessons WHERE chapter_id='unit'").get().n,2);
 }finally{f.db.close();}
});
