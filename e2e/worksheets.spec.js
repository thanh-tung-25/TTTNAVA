import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {query,closePool} from '../backend/src/config/db.js';
import {hashPassword} from '../backend/src/services/auth-service.js';
test.describe('Worksheet builder and student exercises',()=>{
 test.skip(process.env.WORKSHEET_E2E!=='1','Use playwright.worksheets.config.js');
 let admin,student,sheetId;const password='WorksheetUi@123';
 test.beforeAll(async()=>{
  if(process.env.DB_NAME!=='kids_learning_test')throw new Error('Test database required');
  for(const role of ['admin','student']){const id=randomUUID(),username='ws_'+role+'_'+id.slice(0,6);await query('INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade) VALUES (?,?,?,?,?,?,?,?)',[id,username,username+'@test.invalid',await hashPassword(password),role,'Bạn kiểm thử','meo',role==='student'?3:null]);if(role==='admin')admin={id,username};else{student={id,username};await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-1','admin')",[id]);}}
 });
 test.afterAll(async()=>{if(sheetId){await query('DELETE FROM worksheet_attempts WHERE worksheet_id=?',[sheetId]);await query('DELETE FROM worksheets WHERE id=?',[sheetId]);}if(admin)await query('DELETE FROM questions WHERE created_by=?',[admin.id]);for(const user of [student,admin])if(user)await query('DELETE FROM profiles WHERE id=?',[user.id]);await closePool();});
 async function login(page,user){await page.goto('/pages/login/');await page.locator('[name=username]').fill(user.username);await page.locator('[name=password]').fill(password);await page.locator('#login-button').click();await page.waitForURL(user===admin?/\/admin\/students\//:/\/student\/courses\//);}
 test('author nine exercise types, preview, publish, student submits and teacher grades',async({page,browser,baseURL})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await login(page,admin);await page.goto('/pages/admin/worksheets/');
  await expect(page).toHaveURL(/\/admin\/questions\/$/);
  await expect(page.getByRole('link',{name:'Nội dung học tập',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.locator('.content-hub-nav')).toHaveCount(0);await expect(page.locator('#content-list')).toBeVisible();await expect(page.locator('#content-worksheets')).toBeHidden();
  await expect(page.locator('#content-create')).toBeDisabled();
  for(const [grade,lastTopic,lastLesson,expected]of [[2,'14','75','75'],[3,'16','81','81'],[4,'13','73','73'],[5,'12','75','75']]){
   await page.getByRole('button',{name:'Lớp '+grade,exact:true}).click();
   await page.getByLabel('Học kì',{exact:true}).selectOption('hk2');
   await page.getByLabel('Môn học',{exact:true}).selectOption('toan');
   await page.getByLabel('Chủ đề',{exact:true}).selectOption(`kntt-toan-${grade}-c${lastTopic}`);
   await page.getByLabel('Bài học',{exact:true}).selectOption(`kntt-toan-${grade}-b${lastLesson}`);
   await expect(page.locator('#content-placement')).toContainText('Bài '+expected+'. Ôn tập chung');
   await expect(page.locator('#content-create')).toBeEnabled();
  }
  await page.getByRole('button',{name:'Lớp 1',exact:true}).click();
  await page.getByLabel('Học kì',{exact:true}).selectOption('hk1');
  await page.getByLabel('Môn học',{exact:true}).selectOption('toan');
  await page.getByLabel('Chủ đề',{exact:true}).selectOption('kntt-toan-1-c01');
  await page.getByLabel('Bài học',{exact:true}).selectOption('kntt-toan-1-b01');
  await expect(page.locator('#content-placement')).toContainText('Bài 1.');
  await page.locator('#content-import').click();
  await expect(page.locator('.modal [data-scope]')).toHaveCount(0);
  await expect(page.locator('[data-import-destination]')).toContainText('Lớp 1');
  await expect(page.locator('[data-import-destination]')).toContainText('Bài 1. Các số 0, 1, 2, 3, 4, 5');
  await page.locator('#docx-file').setInputFiles('frontend/assets/templates/mau-nhap-cau-hoi.docx');
  await page.locator('[data-read]').click();
  await expect(page.locator('[data-import-destination]')).toContainText('Bài 1. Các số 0, 1, 2, 3, 4, 5');
  await expect(page.locator('[data-save]')).toBeEnabled();
  const imported=page.waitForResponse(r=>r.url().endsWith('/admin/questions/import')&&r.request().method()==='POST');
  await page.locator('[data-save]').click();
  const importedResponse=await imported;expect(importedResponse.ok()).toBe(true);
  expect(importedResponse.request().postDataJSON()).toMatchObject({grade:1,semester:'hk1',subjectId:'toan',chapterId:'kntt-toan-1-c01',lessonId:'kntt-toan-1-b01'});
  await expect(page.locator('.modal')).toHaveCount(0);
  await expect(page.locator('[data-content-lesson="kntt-toan-1-b01"]')).toContainText('câu hỏi');
  await expect(page.locator('.content-row')).toHaveCount(0);
  await page.getByRole('button',{name:'Xem bộ câu hỏi',exact:true}).click();
  await expect(page.locator('.content-row[data-content-kind=question]').first()).toBeVisible();
  const bulk=page.waitForResponse(r=>r.url().endsWith('/admin/content/publish-questions')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Đăng tất cả câu hỏi nháp',exact:true}).click();
  expect((await bulk).ok()).toBe(true);
  await expect(page.locator('#content-hub-error')).toContainText('Đã đăng');
  await expect(page.locator('.content-row[data-content-kind=question] .content-status').first()).toHaveText('Đã đăng');
  await page.getByRole('button',{name:'← Danh sách bài học',exact:true}).click();
  await expect(page.locator('.content-row')).toHaveCount(0);
  await expect(page.locator('[data-content-lesson="kntt-toan-1-b02"]')).toBeVisible();
  await page.locator('[data-content-lesson="kntt-toan-1-b01"]').getByRole('button',{name:'Xem bộ câu hỏi',exact:true}).click();
  await expect(page.locator('.content-row[data-content-kind=question]').first()).toBeVisible();
  await page.locator('#content-create-kind').selectOption('question');
  await page.locator('#content-create').click();
  await expect(page.locator('.modal [data-scope=lessonId]')).toHaveValue('kntt-toan-1-b01');
  await page.locator('.modal-actions').getByRole('button',{name:'Đóng',exact:true}).click();
  await page.locator('#content-create-kind').selectOption('worksheet');
  const created=page.waitForResponse(r=>r.url().endsWith('/worksheets/admin')&&r.request().method()==='POST');await page.getByRole('button',{name:'+ Tạo nội dung',exact:true}).click();sheetId=(await (await created).json()).data.id;
  await page.locator('[name=title]').fill('Bộ kiểm thử tương tác');
  const examples=[['fill',{accepted:'78'}],['blanks',{labels:'Ô thứ nhất\nÔ thứ hai',values:'18\n20'}],['choice',{options:'6\n7',index:'1'}],['compare',{value:'='}],['ordering',{values:'28\n54\n74'}],['matching',{pairs:'2 + 3 = 5\n4 + 2 = 6'}],['column',{a:'24',b:'55',operator:'+'}],['word',{accepted:'19',unit:'bông hoa'}],['drawing',{}]];
  for(const [type,fields]of examples){
   await page.locator('#ws-add-type').selectOption(type);await page.getByRole('button',{name:'+ Thêm câu',exact:true}).click();await page.locator('[name=prompt]').fill('Câu kiểm thử '+type);await page.locator('[name=explanation]').fill('Lời giải của giáo viên.');
   for(const [name,value]of Object.entries(fields)){const field=page.locator('.worksheet-fields [name='+name+']');if(await field.evaluate(e=>e.tagName==='SELECT'))await field.selectOption(value);else await field.fill(value);}
   if(type==='fill'){
    await page.getByRole('button',{name:'Xem thử câu này',exact:true}).click();await page.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('78');await page.locator('#ws-preview-check').click();await expect(page.locator('#ws-preview-feedback')).toContainText('Đúng rồi!');await page.locator('#ws-preview-close').click();
   }
  }
  await page.locator('#ws-workspace').getByRole('button',{name:'Đăng bài',exact:true}).click();await expect(page.locator('#ws-notice')).toContainText('Đã đăng');
  const row=page.locator('[data-content-id="'+sheetId+'"]');await expect(row).toContainText('Bộ kiểm thử tương tác');await page.locator('#content-close-editor').click();await row.getByRole('button',{name:'Sửa',exact:true}).click();await expect(page.locator('[name=title]')).toHaveValue('Bộ kiểm thử tương tác');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/worksheet-builder-${test.info().project.name}.png`,fullPage:true});
  const context=await browser.newContext({baseURL,viewport:page.viewportSize()});
  try{
   const learner=await context.newPage();learner.on('pageerror',e=>errors.push(e.message));learner.on('dialog',d=>d.accept());await login(learner,student);await learner.locator('[data-kind=primary]').click();await learner.locator('.course-tile').filter({has:learner.getByRole('heading',{name:'Lớp 1',exact:true})}).getByRole('button',{name:'Vào học',exact:true}).click();await learner.waitForURL('**/pages/student/home/');await learner.getByRole('link',{name:/Bài tập tương tác/}).click();
   await learner.locator('.worksheet-student-grid .card').filter({hasText:'Bộ kiểm thử tương tác'}).getByRole('button',{name:'Bắt đầu',exact:true}).click();
   const next=()=>learner.getByRole('button',{name:'Câu tiếp theo →',exact:true}).click();
   await learner.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('78');await next();await learner.getByRole('textbox',{name:'Ô thứ nhất',exact:true}).fill('18');await learner.getByRole('textbox',{name:'Ô thứ hai',exact:true}).fill('20');await next();
   await learner.getByRole('button',{name:'7',exact:true}).click();await next();await learner.getByRole('button',{name:'=',exact:true}).click();await next();
   for(const token of ['28','54','74'])await learner.getByRole('button',{name:token,exact:true}).click();await next();
   await learner.getByLabel('Ghép 2 + 3',{exact:true}).selectOption('5');await learner.getByLabel('Ghép 4 + 2',{exact:true}).selectOption('6');await next();
   await learner.getByLabel('Chữ số kết quả 1',{exact:true}).fill('7');await learner.getByLabel('Chữ số kết quả 2',{exact:true}).fill('9');await next();await learner.getByLabel('Đáp số (bông hoa)',{exact:true}).fill('19');await next();
   await learner.getByRole('textbox',{name:'Bài giải tự luận',exact:true}).fill('Bài giải của học sinh.');expect(await learner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await learner.screenshot({path:`test-results/worksheet-student-${test.info().project.name}.png`,fullPage:true});await learner.getByRole('button',{name:'Nộp bài',exact:true}).click();await expect(learner.locator('.worksheet-score')).toHaveText('Chờ giáo viên chấm');
   await page.locator('#content-reviews').click();await page.locator('#ws-reviews .worksheet-history-row').filter({hasText:student.username}).getByRole('button',{name:'Xem và chấm',exact:true}).click();await page.locator('.worksheet-review-card select').selectOption('true');await page.locator('.worksheet-review-card textarea').fill('Con làm tốt.');await page.getByRole('button',{name:'Lưu kết quả chấm',exact:true}).click();await expect(page.locator('#ws-notice')).toContainText('Đã chấm');
   await row.getByRole('button',{name:'Xóa',exact:true}).click();await expect(page.locator('#content-hub-error')).toContainText('Đã ẩn');await expect(row).toContainText('Đang ẩn');
   await learner.reload();await expect(learner.locator('.worksheet-score')).toHaveText('100/100');expect(errors).toEqual([]);
  }finally{await context.close();}
 });
});
