import {test,expect} from '@playwright/test';
import {query,closePool} from '../backend/src/config/db.js';
let lesson,setId,documentId,testId;
test.use({storageState:'e2e/.auth/admin.json'});
test.afterAll(async()=>{
 if(testId){await query('DELETE FROM chinese_attempts WHERE test_id=?',[testId]);await query('DELETE FROM chinese_tests WHERE id=?',[testId]);}
 if(setId){
  await query('DELETE FROM chinese_attempts WHERE set_id=?',[setId]);await query('DELETE FROM chinese_progress WHERE set_id=?',[setId]);
  const rows=await query('SELECT id FROM chinese_items WHERE set_id=?',[setId]);for(const i of rows){await query('DELETE FROM chinese_review_events WHERE item_id=?',[i.id]);await query('DELETE FROM chinese_reviews WHERE item_id=?',[i.id]);}
  await query('DELETE FROM chinese_items WHERE set_id=?',[setId]);await query('DELETE FROM chinese_sets WHERE id=?',[setId]);if(documentId)await query('DELETE FROM chinese_documents WHERE id=?',[documentId]);
 }if(lesson)await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);await closePool();
});
test('Chinese: Word review, publish, flashcard resume, exam and mobile layout',async({page,browser})=>{
 await page.goto('/pages/admin/chinese/?level=9');
 await expect(page.locator('#chinese-nav a')).toHaveCount(3);
 await page.getByText('+ Thêm bài học',{exact:true}).click();await page.getByLabel('Tên bài mới',{exact:true}).fill('E2E Chinese');
 await page.getByRole('button',{name:'Tạo bài',exact:true}).click();await page.waitForURL(/\?lesson=/);lesson=new URL(page.url()).searchParams.get('lesson');
 await page.locator('[name=file]').setInputFiles('frontend/assets/templates/chinese-template.docx');
 await expect(page.locator('.simple-upload [name=title]')).toHaveValue('chinese-template');
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Tải lên và kiểm tra'}).click();await page.waitForURL(/\?set=/);setId=new URL(page.url()).searchParams.get('set');
 const detail=(await (await page.request.get('/api/v1/chinese/sets/'+setId)).json()).data;documentId=detail.set.document_id;
 await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();await expect(page.locator('#notice')).toContainText('Cần sửa');
 expect((await (await page.request.get('/api/v1/chinese/sets/'+setId)).json()).data.set.status).toBe('draft');
 await page.getByRole('button',{name:/^Chưa xác định \(/}).click();
 while(await page.locator('.simple-question').count()){
  await page.locator('.simple-question').first().getByText('Sửa nội dung',{exact:true}).click();
  await page.getByRole('button',{name:'Bỏ mục này',exact:true}).first().click();
 }
 await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();await page.waitForURL(/\?lesson=/);
 const published=(await (await page.request.get('/api/v1/chinese/sets/'+setId)).json()).data;expect(published.set.status).toBe('published');
 expect(published.set.lesson_status).toBe('published');expect(published.items.filter(i=>i.kind==='question').every(i=>i.data.approved)).toBe(true);
 const exam=await page.request.post('/api/v1/chinese/tests',{data:{title:'E2E class exam',set_ids:[setId],duration_seconds:null,pass_percent:70,status:'published'}});expect(exam.ok()).toBe(true);testId=(await exam.json()).data.id;
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const ctx=await browser.newContext({storageState:'e2e/.auth/lan.json'});const student=await ctx.newPage();const errors=[];student.on('pageerror',e=>errors.push(e.message));
 await student.goto('/pages/student/chinese/?set='+setId);await expect(student.locator('.flashcard')).toContainText('你好');
 await student.getByRole('button',{name:'Lật thẻ',exact:true}).first().click();await expect(student.locator('.flashcard')).toContainText('nǐ hǎo');
 await student.getByRole('button',{name:'Đã nhớ',exact:true}).click();await expect(student.locator('#notice')).toContainText('Đã lưu tự đánh giá');
 await student.reload();await expect(student.locator('.flashcard')).toContainText('你好');
 await student.getByText('Tùy chọn thẻ',{exact:true}).click();
 const savedSource=student.waitForResponse(r=>r.url().endsWith('/progress')&&r.request().method()==='PUT');await student.locator('[name=source]').selectOption('question');await savedSource;
 await student.reload();await expect(student.locator('.learn-caption')).toContainText('Thẻ câu hỏi');
 await student.getByText('Tùy chọn thẻ',{exact:true}).click();await student.locator('[name=source]').selectOption('vocabulary');await expect(student.locator('.flashcard')).toContainText('你好');
 await student.setViewportSize({width:390,height:844});expect(await student.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await expect(student.getByRole('button',{name:'Quiz 20 câu',exact:true})).toBeDisabled();
 await student.goto('/pages/student/chinese/?view=tests');await student.locator('section').filter({has:student.getByRole('heading',{name:'E2E class exam',exact:true})}).getByRole('button',{name:'Bắt đầu',exact:true}).click();await student.waitForURL(/\?attempt=/);
 for(let n=0;n<2;n++){
  await expect(student.locator('.quiz-prompt')).toBeVisible();
  if(await student.getByRole('radio',{name:'Xin chào',exact:false}).count())await student.getByRole('radio',{name:'Xin chào',exact:false}).check();
  else await student.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('nǐ hǎo');
  await student.getByRole('button',{name:'Kiểm tra',exact:true}).click();if(n===0)await expect(student.locator('#content')).toContainText('Đúng rồi!');
  if(n===0)await student.getByRole('button',{name:'Câu tiếp theo →',exact:true}).click();
 }
 await expect(student.locator('.quiz-score')).toHaveText('100/100');await expect(student.locator('#content')).toContainText('+3 Kim Cương');
 await student.getByRole('link',{name:'Kết quả',exact:true}).click();await expect(student.locator('table')).toContainText('100/100');expect(errors).toEqual([]);await ctx.close();
});
