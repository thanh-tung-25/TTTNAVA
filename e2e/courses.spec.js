import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {query,closePool} from '../backend/src/config/db.js';
import {hashPassword} from '../backend/src/services/auth-service.js';

test.describe('Purchase approval end to end in isolated test database',()=>{
 test.skip(process.env.COURSE_E2E!=='1','Use playwright.courses.config.js with the test database');
 let student,admin,original;const password='CourseUi@123';
 test.beforeAll(async()=>{
  if(process.env.DB_NAME!=='kids_learning_test')throw new Error('Course E2E requires test database');
  [original]=await query("SELECT * FROM courses WHERE id='grade-2'");
  await query("UPDATE courses SET price_vnd=250000,duration_days=NULL,payment_instructions='TEST ONLY — không chuyển tiền thật',active=1 WHERE id='grade-2'");
  for(const role of ['student','admin']){
   const id=randomUUID(),username='ui_'+role+'_'+id.slice(0,6);
   await query('INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade) VALUES (?,?,?,?,?,?,?,?)',[id,username,username+'@test.invalid',await hashPassword(password),role,'Kiểm thử khóa học','meo',role==='student'?3:null]);
   if(role==='student')student={id,username};else admin={id,username};
  }
 });
 test.afterAll(async()=>{
  for(const user of [student,admin])if(user)await query('DELETE FROM profiles WHERE id=?',[user.id]);
  if(original)await query('UPDATE courses SET price_vnd=?,duration_days=?,payment_instructions=?,active=? WHERE id=?',[original.price_vnd,original.duration_days,original.payment_instructions,original.active,original.id]);
  await closePool();
 });
 test('locked course → registration → admin approval → study another grade → revoke',async({page,browser,baseURL})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/pages/login/');await page.locator('[name=username]').fill(student.username);await page.locator('[name=password]').fill(password);await page.locator('#login-button').click();
  await expect(page).toHaveURL(/\/student\/courses\/$/);
  await expect(page.locator('.course-tile')).toHaveCount(14);
  await expect(page.getByRole('button',{name:'Vào học',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/courses-chooser-${test.info().project.name}.png`,fullPage:true});
  await page.locator('[data-kind=primary]').click();await expect(page.locator('.course-tile')).toHaveCount(5);
  const tile=page.locator('.course-tile').filter({has:page.getByRole('heading',{name:'Lớp 2',exact:true})});
  await tile.getByRole('button',{name:'Xem khóa học'}).click();
  await expect(page.locator('#course-dialog')).toBeVisible();
  await page.locator('[name=payer_name]').fill('Phụ huynh kiểm thử');await page.locator('[name=payment_reference]').fill('TEST-'+student.username);await page.getByRole('button',{name:'Gửi yêu cầu xác nhận'}).click();
  await expect(page.locator('#course-dialog')).not.toBeVisible();
  await expect(tile).toContainText('Chờ xác nhận');
  expect((await page.request.get('/api/v1/courses/grade-2/access')).status()).toBe(403);
  const adminContext=await browser.newContext({baseURL,viewport:page.viewportSize()});
  try{
   const adminPage=await adminContext.newPage();adminPage.on('pageerror',e=>errors.push(e.message));adminPage.on('dialog',d=>d.accept());
   await adminPage.goto('/pages/login/');await adminPage.locator('[name=username]').fill(admin.username);await adminPage.locator('[name=password]').fill(password);await adminPage.locator('#login-button').click();
   await adminPage.waitForURL(/\/admin\/students\//);await adminPage.goto('/pages/admin/courses/');
   const order=adminPage.locator('.admin-order').filter({hasText:student.username});
   await expect(order).toHaveCount(1);await order.locator('textarea').fill('Đã đối soát giao dịch kiểm thử, không thu tiền thật.');
   await order.getByRole('button',{name:'Đã nhận tiền — mở khóa'}).click();await expect(order).toHaveCount(0);
   await page.getByRole('button',{name:'Cập nhật',exact:true}).click();await expect(tile.getByRole('button',{name:'Vào học',exact:true})).toBeVisible();
   await tile.getByRole('button',{name:'Vào học',exact:true}).click();
   await expect(page).toHaveURL(/\/student\/home\/$/);await expect(page.locator('#grade-line')).toContainText('lớp 2');
   expect((await page.request.get('/api/v1/catalog/topics?subjectId=toan&grade=3')).status()).toBe(403);
   const form=adminPage.locator('#access-form');await form.locator('[name=username]').fill(student.username);await form.locator('[name=course_id]').selectOption('grade-2');await form.locator('[name=action]').selectOption('revoke');await form.locator('[name=note]').fill('Kiểm thử thu hồi quyền học');await form.locator('[type=submit]').click();
   await expect(adminPage.locator('#admin-course-notice')).toHaveText('Đã lưu thành công.');
   await page.goto('/pages/student/home/');await expect(page).toHaveURL(/\/student\/courses\//);
   await expect(page.getByRole('button',{name:'Vào học',exact:true})).toHaveCount(0);
   expect(errors).toEqual([]);
  }finally{await adminContext.close();}
 });
});
