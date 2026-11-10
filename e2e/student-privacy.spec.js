import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {query,closePool} from '../backend/src/config/db.js';
import {hashPassword} from '../backend/src/services/auth-service.js';

const password='PrivateUi@123!',prefix='pv_'+randomUUID().slice(0,6)+'_';
let boss,teacher,secret,visible,assigned,legacy,createdByChinese;
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
 for(const [key,origin,management] of [['visible','chinese',null],['assigned','super','chinese'],['legacy',null,null]]){
  const user={id:randomUUID(),username:prefix+key};
  await query("INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade,student_created_by,student_creator_scope,student_management_scope) VALUES (?,?,?,?,'student',?,'meo',NULL,?,?,?)",[user.id,user.username,user.username+'@test.invalid',await hashPassword(password),'Học sinh kiểm thử '+key,origin==='chinese'?teacher.id:origin?boss.id:null,origin,management]);
  if(key==='visible')visible=user;else if(key==='assigned')assigned=user;else legacy=user;
 }
 for(const user of [secret,visible,assigned,legacy])await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'hsk-1','admin')",[user.id]);
});
test.afterAll(async()=>{
 for(const user of [createdByChinese,secret,visible,assigned,legacy,teacher,boss])if(user)await query('DELETE FROM profiles WHERE id=?',[user.id]);
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
 await expect(page.locator('#students-table')).toContainText(assigned.username);
 await expect(page.locator('#students-table')).not.toContainText(secret.username);
 await expect(page.locator('#students-table')).not.toContainText(legacy.username);
 await expect(page.locator('#create-button')).toBeVisible();
 await expect(page.locator('[data-edit],[data-password],[data-lock]')).toHaveCount(0);
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
test('Chinese admin creates a Chinese-only learner that immediately appears in their list',async({page})=>{
 await login(page,teacher);await page.goto('/pages/admin/students/');
 await page.locator('#search-input').fill(secret.username);await page.locator('#search-button').click();
 await expect(page.locator('#page-label')).toContainText('0 học sinh');
 await page.locator('#create-button').click();
 await expect(page.locator('#new-grade')).toBeDisabled();
 await expect(page.locator('#new-grade')).toHaveValue('');
 await expect(page.locator('#new-grade option')).toHaveCount(1);
 await page.locator('#new-username').fill(prefix+'created');
 await page.locator('#new-display-name').fill('Học sinh Trung mới '+prefix);
 await page.locator('#new-password').fill(password);
 const creation=page.waitForResponse(response=>response.url().endsWith('/api/v1/admin/students')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
 const response=await creation;expect(response.status()).toBe(201);createdByChinese=(await response.json()).data;
 expect(response.request().postDataJSON().grade).toBeNull();expect(createdByChinese.grade).toBeNull();
 await expect(page.locator('#search-input')).toHaveValue('');
 await expect(page.locator('#students-table')).toContainText(createdByChinese.username);
 await expect(page.locator('[data-edit],[data-password],[data-lock]')).toHaveCount(0);
 const result=await page.request.get('/api/v1/admin/students?q='+createdByChinese.username+'&program=chinese');
 expect((await result.json()).data.map(student=>student.id)).toEqual([createdByChinese.id]);
 const [record]=await query('SELECT student_created_by,student_creator_scope,student_management_scope FROM profiles WHERE id=?',[createdByChinese.id]);
 expect(record.student_created_by).toBe(teacher.id);expect(record.student_creator_scope).toBe('chinese');expect(record.student_management_scope).toBe('chinese');
});
test('super admin continues to find and manage the private HSK learner',async({page})=>{
 await login(page,boss);await page.locator('#search-input').fill(secret.username);await page.locator('#search-button').click();
 await expect(page.locator('#students-table')).toContainText(secret.username);
 await expect(page.locator('[data-edit="'+secret.id+'"]')).toBeVisible();
 await expect(page.locator('#page-label')).toContainText('1 học sinh');
});
