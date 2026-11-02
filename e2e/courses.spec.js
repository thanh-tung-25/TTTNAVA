import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {query,closePool} from '../backend/src/config/db.js';
import {hashPassword} from '../backend/src/services/auth-service.js';

test.describe('Purchase approval end to end in isolated test database',()=>{
 test.skip(process.env.COURSE_E2E!=='1','Use playwright.courses.config.js with the test database');
 let student,admin,original,originalQr;const password='CourseUi@123';
 test.beforeAll(async()=>{
  if(process.env.DB_NAME!=='kids_learning_test')throw new Error('Course E2E requires test database');
  original=await query("SELECT * FROM courses WHERE id IN ('grade-2','hsk-1')");
  [originalQr]=await query("SELECT * FROM course_payment_qr WHERE course_key='default'");
  await query("UPDATE courses SET payment_instructions='TEST ONLY — không chuyển tiền thật',active=1 WHERE id IN ('grade-2','hsk-1')");
  for(const role of ['student','admin']){
   const id=randomUUID(),username='ui_'+role+'_'+id.slice(0,6);
   await query('INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade) VALUES (?,?,?,?,?,?,?,?)',[id,username,username+'@test.invalid',await hashPassword(password),role,'Kiểm thử khóa học','meo',role==='student'?3:null]);
   if(role==='student')student={id,username};else admin={id,username};
  }
 });
 test.afterAll(async()=>{
  for(const user of [student,admin])if(user)await query('DELETE FROM profiles WHERE id=?',[user.id]);
  if(original)for(const row of original)await query('UPDATE courses SET price_vnd=?,duration_days=?,payment_instructions=?,active=? WHERE id=?',[row.price_vnd,row.duration_days,row.payment_instructions,row.active,row.id]);
  await query("DELETE FROM course_payment_qr WHERE course_key='default'");
  if(originalQr)await query('INSERT INTO course_payment_qr(course_key,image,mime_type,uploaded_by) VALUES (?,?,?,?)',['default',originalQr.image,originalQr.mime_type,originalQr.uploaded_by]);
  await closePool();
 });
 test('admin uploads and previews shared QR',async({page})=>{
  await page.goto('/pages/login/');await page.locator('[name=username]').fill(admin.username);await page.locator('[name=password]').fill(password);await page.locator('#login-button').click();await page.waitForURL(/\/admin\/students\//);await page.goto('/pages/admin/courses/');
  await expect(page.locator('#panel-orders')).toBeVisible();await expect(page.locator('#payment-qr-form')).toBeHidden();await expect(page.locator('#access-form')).toHaveCount(0);
  await page.screenshot({path:`test-results/admin-courses-simple-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('tab',{name:'QR & học phí',exact:true}).click();
  const form=page.locator('#payment-qr-form');
  await form.locator('[name=qr]').setInputFiles({name:'test-qr.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3XkAAAAASUVORK5CYII=','base64')});
  await form.getByRole('button',{name:'Lưu ảnh QR',exact:true}).click();
  await expect(page.locator('#admin-course-notice')).toContainText('Đã lưu ảnh QR');
  await expect(page.locator('#payment-qr-preview img')).toBeVisible();
  expect(await page.locator('#payment-qr-preview img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 });
 test('locked course → QR registration → approval → purchase another course → revoke',async({page,browser,baseURL})=>{
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
  await expect(page.locator('#course-dialog .payment-qr-image')).toBeVisible();
  await expect(page.locator('.payment-summary code')).toContainText(student.username+' grade-2');
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
   await expect(order).toHaveCount(1);
   await expect(adminPage.locator('#course-pending-count')).toBeVisible();
   await order.getByRole('button',{name:'Mở khóa',exact:true}).click();await expect(order).toHaveCount(0);
   await page.getByRole('button',{name:'Cập nhật',exact:true}).click();await expect(tile.getByRole('button',{name:'Vào học',exact:true})).toBeVisible();
   await tile.getByRole('button',{name:'Vào học',exact:true}).click();
   await expect(page).toHaveURL(/\/student\/home\/$/);await expect(page.locator('#grade-line')).toContainText('lớp 2');
   expect((await page.request.get('/api/v1/catalog/topics?subjectId=toan&grade=3')).status()).toBe(403);
   await page.getByRole('link',{name:'Đổi khóa',exact:true}).click();await page.locator('[data-kind=chinese]').click();
   const hsk=page.locator('.course-tile').filter({has:page.getByRole('heading',{name:'Tiếng Trung HSK 1',exact:true})});await hsk.getByRole('button',{name:'Xem khóa học'}).click();
   await expect(page.locator('#course-dialog .payment-qr-image')).toBeVisible();await page.locator('[name=payer_name]').fill('Phụ huynh kiểm thử');await page.locator('[name=payment_reference]').fill('TEST-HSK-'+student.username);await page.getByRole('button',{name:'Gửi yêu cầu xác nhận'}).click();
   await expect(hsk).toContainText('Chờ xác nhận');expect((await page.request.get('/api/v1/courses/grade-2/access')).status()).toBe(200);expect((await page.request.get('/api/v1/courses/hsk-1/access')).status()).toBe(403);
   await adminPage.getByRole('tab',{name:'Quyền học',exact:true}).click();
   const learner=adminPage.locator('.learner-enrollments[data-username="'+student.username+'"]');await expect(learner).toHaveCount(1);await expect(learner).not.toHaveAttribute('open','');await learner.locator('summary').click();
   const enrollment=adminPage.locator('[data-student="'+student.username+'"][data-course="grade-2"]');await expect(enrollment).toContainText('Đã mở khóa');await enrollment.getByRole('button',{name:'Thu hồi',exact:true}).click();
   await expect(adminPage.locator('#admin-course-notice')).toHaveText('Đã thu hồi quyền học.');
   await page.goto('/pages/student/home/');await expect(page).toHaveURL(/\/student\/courses\//);
   await expect(page.getByRole('button',{name:'Vào học',exact:true})).toHaveCount(0);
   expect(errors).toEqual([]);
  }finally{await adminContext.close();}
 });
});
