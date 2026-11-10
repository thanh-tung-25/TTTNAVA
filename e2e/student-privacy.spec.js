import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {query,closePool} from '../backend/src/config/db.js';
import {hashPassword} from '../backend/src/services/auth-service.js';

const password='PrivateUi@123!',prefix='pv_'+randomUUID().slice(0,6)+'_';
let boss,teacher,secret,visible,legacy;
test.beforeAll(async({request})=>{
 if(process.env.DB_NAME!=='kids_learning_test')throw Error('Privacy E2E requires isolated test database');
 for(const scope of ['super','chinese']){
  const user={id:randomUUID(),username:prefix+(scope==='super'?'boss':'teacher')};
  await query("INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade,admin_scope) VALUES (?,?,?,?,'admin',?,'cu',NULL,?)",[user.id,user.username,user.username+'@test.invalid',await hashPassword(password),'Admin kiểm thử '+scope,scope]);
  if(scope==='super')boss=user;else teacher=user;
 }
 expect((await request.post('/api/v1/auth/login',{data:{username:boss.username,password}})).status()).toBe(200);
 const created=await request.post('/api/v1/admin/students',{data:{username:prefix+'secret',password,displayName:'Học sinh riêng '+prefix,grade:null}});
 expect(created.status()).toBe(201);secret=(await created.json()).data;
 for(const origin of ['chinese',null]){
  const user={id:randomUUID(),username:prefix+(origin?'visible':'legacy')};
  await query("INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade,student_created_by,student_creator_scope) VALUES (?,?,?,?,'student',?,'meo',NULL,?,?)",[user.id,user.username,user.username+'@test.invalid',await hashPassword(password),origin?'Học sinh Trung được phép':'Học sinh cũ riêng',origin?teacher.id:null,origin]);
  if(origin)visible=user;else legacy=user;
 }
 for(const user of [secret,visible,legacy])await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'hsk-1','admin')",[user.id]);
});
test.afterAll(async()=>{
 for(const user of [secret,visible,legacy,teacher,boss])if(user)await query('DELETE FROM profiles WHERE id=?',[user.id]);
 await closePool();
});
async function login(page,user){
 await page.goto('/pages/login/');await page.locator('[name=username]').fill(user.username);await page.locator('[name=password]').fill(password);await page.locator('#login-button').click();
 await page.waitForURL(user===teacher?/\/admin\/chinese\//:/\/admin\/students\//);
}
test('Chinese admin never sees or finds the super-created HSK learner in students or chat',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,teacher);await page.goto('/pages/admin/students/?program=chinese');
 await expect(page.locator('#students-table')).toContainText(visible.username);
 await expect(page.locator('#students-table')).not.toContainText(secret.username);
 await expect(page.locator('#students-table')).not.toContainText(legacy.username);
 await expect(page.locator('#create-button')).toBeHidden();
 await page.locator('#search-input').fill(secret.username);await page.locator('#search-button').click();
 await expect(page.locator('#page-label')).toContainText('0 học sinh');
 await expect(page.locator('#students-table')).toContainText('Chưa có học sinh nào');
 const result=await page.request.get('/api/v1/admin/students?q='+secret.username+'&program=chinese');
 expect((await result.json()).pagination.total).toBe(0);
 const chat=await page.request.get('/api/v1/chat/students?q='+secret.username);expect((await chat.json()).data).toEqual([]);
 const stats=await page.request.get('/api/v1/chinese/stats?student_id='+secret.id);expect((await stats.json()).data.progress).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/student-privacy-chinese-${test.info().project.name}.png`,fullPage:true});
 expect(errors).toEqual([]);
});
test('super admin continues to find and manage the private HSK learner',async({page})=>{
 await login(page,boss);await page.locator('#search-input').fill(secret.username);await page.locator('#search-button').click();
 await expect(page.locator('#students-table')).toContainText(secret.username);
 await expect(page.locator('[data-edit="'+secret.id+'"]')).toBeVisible();
 await expect(page.locator('#page-label')).toContainText('1 học sinh');
});
