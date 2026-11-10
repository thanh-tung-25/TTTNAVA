// Additive PostgreSQL release for THCS and private student cohorts.
// Default: validate schema migrations then roll back. --apply commits and seeds.
// --schema-only skips curriculum seeding when releasing an account-only change.
import fs from 'node:fs/promises';
import dotenv from 'dotenv';
dotenv.config({path:new URL('../.env.supabase',import.meta.url),quiet:true});
process.env.DB_DRIVER='postgres';
process.env.PGPOOL_SIZE='1';
const apply=process.argv.includes('--apply'),verifyOnly=process.argv.includes('--verify'),schemaOnly=process.argv.includes('--schema-only');
if((process.env.PGSCHEMA||'ttnava_stage')!=='ttnava_stage'||!process.env.PGHOST?.endsWith('.supabase.com'))throw Error('Expected the configured Supabase application schema');
if(verifyOnly)process.env.PG_READ_ONLY='true';
const {query,withTransaction,closePool}=await import('../src/config/db.js');
const {seedSecondaryCatalog,loadSecondaryBook}=await import('./lib/seed-secondary.mjs');
const {seedLiteratureCatalog,loadLiteratureBooks}=await import('./lib/seed-literature.mjs');
const {seedSecondaryEnglishCatalog,loadSecondaryEnglishBooks}=await import('./lib/seed-english-secondary.mjs');
const migrations=['027_secondary_school.sql','028_student_privacy.sql','029_student_management_scope.sql','030_public_registration.sql'];
const counts=async()=> (await query(`SELECT (SELECT COUNT(*) FROM profiles) profiles,
 (SELECT COUNT(*) FROM questions) questions,(SELECT COUNT(*) FROM course_enrollments) enrollments,
 (SELECT COUNT(*) FROM course_orders) orders,(SELECT COUNT(*) FROM diamond_ledger) ledger,
 (SELECT COUNT(*) FROM word_import_documents) word_documents`))[0];
async function state(){
 const columns=await query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='profiles'");
 const checks=await query("SELECT conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid IN ('courses'::regclass,'profiles'::regclass) AND contype='c'");
 const privacy=columns.filter(c=>['student_created_by','student_creator_scope'].includes(c.column_name));
 const [otpTable]=await query("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='registration_otps') present");
 if(privacy.length===1)throw Error('Incomplete student privacy migration');
 return {secondary:checks.some(c=>c.conname==='courses_kind_check'&&c.definition.includes('secondary')),
  privacy:privacy.length===2&&checks.some(c=>c.conname==='chk_profiles_student_creator_scope'),
  management:columns.some(c=>c.column_name==='student_management_scope')&&checks.some(c=>c.conname==='chk_profiles_student_management_scope'),
  registration:columns.filter(c=>['registration_source','email_verified_at','gmail_identity'].includes(c.column_name)).length===3&&Boolean(otpTable.present)&&checks.some(c=>c.conname==='chk_profiles_registration_source')};
}
async function verify(){
 const current=await state();if(!current.secondary||!current.privacy||!current.management||!current.registration)throw Error('Release schema is not ready');
 const {getCurriculumTree}=await import('../src/services/curriculum-service.js');
 const {listStudents}=await import('../src/services/admin-students.js');
 const {stats}=await import('../src/services/chinese.js');
 const {rooms,search}=await import('../src/services/chat.js');
 const teacher=(await query("SELECT * FROM profiles WHERE role='admin' AND admin_scope='chinese' LIMIT 1"))[0];
 const tree=await getCurriculumTree(null,'secondary');
 if(tree.grades.length!==4)throw Error('THCS grade catalog is incomplete');
 const chapters=tree.grades.flatMap(g=>g.semesters.flatMap(s=>s.subjects.flatMap(x=>x.chapters)));
 if(chapters.length<114)throw Error('THCS curriculum is incomplete');
 if(teacher){
  await listStudents(1,20,'','chinese',teacher);await stats({},teacher);await rooms(teacher.id);await search(teacher.id,'no_such_release_user');
 }
 return {schemaReady:true,secondaryGrades:tree.grades.length,secondaryChapters:chapters.length,privacyReadChecks:Boolean(teacher)};
}
try{
 await loadSecondaryBook();await loadLiteratureBooks();await loadSecondaryEnglishBooks();
 const before=await counts(),current=await state(),pending=migrations.filter((_,i)=>![current.secondary,current.privacy,current.management,current.registration][i]);
 if(verifyOnly){console.log(JSON.stringify({ok:true,mode:'verify',...await verify(),protectedCounts:before}));}
 else{
  const rollback=Error('VALIDATION_ROLLBACK');
  try{
   await withTransaction(async connection=>{
    await connection.query("SET LOCAL lock_timeout='5s'");
    for(const name of pending){
     const source=await fs.readFile(new URL('../sql/postgres/'+name,import.meta.url),'utf8');
     const sql=source.replace(/^\s*BEGIN;\s*$/gm,'').replace(/^\s*COMMIT;\s*$/gm,'');
     await connection.query(sql);
     await connection.query('INSERT INTO schema_migrations(name) VALUES (?) ON CONFLICT(name) DO NOTHING',[name]);
    }
    if(!apply)throw rollback;
   });
  }catch(error){if(error!==rollback)throw error;}
  if(apply){
   console.log(JSON.stringify({stage:'schema',applied:pending}));
   const seeded=schemaOnly?null:await withTransaction(async connection=>{
    await connection.query("SET LOCAL lock_timeout='5s'");
    const run=async(sql,params=[])=>(await connection.query(sql,params))[0];
    return {math:await seedSecondaryCatalog(run,{postgres:true}),literature:await seedLiteratureCatalog(run,{postgres:true}),english:await seedSecondaryEnglishCatalog(run,{postgres:true})};
   });
   const after=await counts();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Protected record counts changed unexpectedly');
   console.log(JSON.stringify({ok:true,mode:'apply',seeded,...await verify(),protectedCounts:after}));
  }else{console.log(JSON.stringify({ok:true,mode:'preview',pending,rolledBack:true,protectedCounts:before}));}
 }
}catch(error){console.error(JSON.stringify({ok:false,code:error.code||'RELEASE_FAILED',reason:error.code?'Database operation failed':error.message}));process.exitCode=1;}
finally{await closePool();}
