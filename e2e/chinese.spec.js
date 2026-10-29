import {test,expect} from '@playwright/test';
import {query,closePool} from '../backend/src/config/db.js';
let lesson,setId,documentId;
test.use({storageState:'e2e/.auth/admin.json'});
test.afterAll(async()=>{
 if(setId){
  await query('DELETE FROM chinese_attempts WHERE set_id=?',[setId]);await query('DELETE FROM chinese_progress WHERE set_id=?',[setId]);
  const rows=await query('SELECT id FROM chinese_items WHERE set_id=?',[setId]);for(const i of rows){await query('DELETE FROM chinese_review_events WHERE item_id=?',[i.id]);await query('DELETE FROM chinese_reviews WHERE item_id=?',[i.id]);}
  await query('DELETE FROM chinese_items WHERE set_id=?',[setId]);await query('DELETE FROM chinese_sets WHERE id=?',[setId]);if(documentId)await query('DELETE FROM chinese_documents WHERE id=?',[documentId]);
 }if(lesson)await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);await closePool();
});
test('Chinese: Word review, publish, flashcard resume, exam and mobile layout',async({page,browser})=>{
 const created=await page.request.post('/api/v1/chinese/lessons',{data:{level_id:1,title:'E2E Chinese',position:999,description:'',image_url:'',status:'published'}});expect(created.ok(),await created.text()).toBeTruthy();lesson=(await created.json()).data.id;
 await page.goto('/pages/admin/chinese/?view=sets');
 await page.locator('[name=level_id]').selectOption('1');await page.locator('[name=lesson_id]').selectOption(lesson);await page.locator('[name=title]').fill('E2E Word set');await page.locator('[name=file]').setInputFiles('frontend/assets/templates/chinese-template.docx');
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Phân tích và tạo bản nháp'}).click();await page.waitForURL(/\?set=/);setId=new URL(page.url()).searchParams.get('set');
 const detail=(await (await page.request.get('/api/v1/chinese/sets/'+setId)).json()).data;documentId=detail.set.document_id;
 await page.getByRole('button',{name:'Chưa xác định',exact:true}).click();while(await page.getByRole('button',{name:'Xóa mục',exact:true}).count())await page.getByRole('button',{name:'Xóa mục',exact:true}).first().click();
 await page.getByRole('button',{name:'Câu hỏi',exact:true}).click();await page.getByRole('button',{name:'Mở tất cả mục'}).click();for(const approve of await page.locator('.item-editor [name=approved]').all())await approve.selectOption('true');
 await page.locator('[name=status]').selectOption('published');await page.getByRole('button',{name:'Kiểm tra & lưu'}).click();await expect(page.locator('#notice')).toHaveText('');
 const published=(await (await page.request.get('/api/v1/chinese/sets/'+setId)).json()).data;expect(published.set.status).toBe('published');
 const ctx=await browser.newContext({storageState:'e2e/.auth/lan.json'});const student=await ctx.newPage();const errors=[];student.on('pageerror',e=>errors.push(e.message));
 await student.goto('/pages/student/chinese/?set='+setId);await expect(student.locator('.flashcard')).toContainText('你好');
 await student.getByRole('button',{name:'Lật thẻ',exact:true}).first().click();await expect(student.locator('.flashcard')).toContainText('nǐ hǎo');
 await student.getByRole('button',{name:'Đã nhớ',exact:true}).click();await expect(student.locator('#notice')).toContainText('Đã lưu tự đánh giá');
 await student.reload();await expect(student.locator('.flashcard')).toContainText('你好');
 await student.setViewportSize({width:390,height:844});expect(await student.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await student.getByRole('button',{name:'Bắt đầu luyện tập'}).click();await student.waitForURL(/\?attempt=/);await student.getByRole('radio',{name:'Xin chào',exact:true}).check();await student.getByRole('button',{name:'Chốt',exact:true}).first().click();await expect(student.locator('#content')).toContainText('Đáp án: Xin chào');
 await student.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('nǐ hǎo');await student.getByRole('button',{name:'Chốt',exact:true}).click();student.once('dialog',d=>d.accept());await student.getByRole('button',{name:'Nộp bài & xem kết quả'}).click();await expect(student.locator('#content')).toContainText('Điểm: 100/100');
 await student.getByRole('link',{name:'Lịch sử & kết quả'}).click();await expect(student.locator('table')).toContainText('100/100');expect(errors).toEqual([]);await ctx.close();
});
