import fs from 'node:fs';
import {test,expect} from '@playwright/test';
import {query,closePool} from '../backend/src/config/db.js';
let lesson,setId,documentId;
test.use({storageState:'e2e/.auth/admin.json'});
test.afterAll(async()=>{
 if(setId){await query('DELETE FROM chinese_attempts WHERE set_id=?',[setId]);await query('DELETE FROM chinese_progress WHERE set_id=?',[setId]);await query('DELETE FROM chinese_items WHERE set_id=?',[setId]);await query('DELETE FROM chinese_sets WHERE id=?',[setId]);}
 if(documentId)await query('DELETE FROM chinese_documents WHERE id=?',[documentId]);if(lesson)await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);await closePool();
});
test('question-only lessons open flashcards and a twenty-question quiz directly',async({page,browser})=>{
 const base='/api/v1/chinese';
 const created=await page.request.post(base+'/lessons',{data:{level_id:9,title:'E2E Quick study',position:999,status:'published',description:'',image_url:''}});expect(created.ok()).toBe(true);lesson=(await created.json()).data.id;
 const imported=await page.request.post(base+'/imports',{multipart:{level_id:'9',lesson_id:lesson,title:'E2E Question cards',allow_duplicate:'true',file:{name:'template.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:fs.readFileSync('frontend/assets/templates/chinese-template.docx')}}});expect(imported.ok()).toBe(true);setId=(await imported.json()).data.id;
 documentId=(await (await page.request.get(base+'/sets/'+setId)).json()).data.set.document_id;
 const items=Array.from({length:24},(_,n)=>({kind:'question',data:{type:'choice',prompt:'Câu hỏi E2E '+(n+1),options:['Đúng','Sai'],accepted:['Đúng'],explanation:'Lời giải từ tài liệu nguồn.',approved:true}}));
 expect((await page.request.put(base+'/sets/'+setId,{data:{title:'E2E Question cards',status:'published',items}})).ok()).toBe(true);
 const ctx=await browser.newContext({storageState:'e2e/.auth/lan.json'}),student=await ctx.newPage(),errors=[];student.on('pageerror',e=>errors.push(e.message));
 await student.goto('/pages/student/chinese/?level=9');
 const row=student.locator('.learn-document').filter({hasText:'E2E Question cards'});await expect(row).toContainText('24 câu hỏi');
 await row.getByRole('link',{name:'Thẻ lật',exact:true}).click();await expect(student.locator('.learn-caption')).toContainText('Thẻ câu hỏi');await expect(student.locator('.card-meaning')).toHaveCount(0);
 await expect(student.locator('.flashcard')).not.toContainText('Đúng');await expect(student.locator('.flashcard')).not.toContainText('Sai');await expect(student.locator('.study-options')).toHaveCount(0);
 await student.getByRole('button',{name:'Lật thẻ',exact:true}).first().click();await expect(student.locator('.card-meaning')).toHaveText('Đúng');await expect(student.locator('.study-explanation')).toContainText('tài liệu nguồn');
 await student.getByRole('button',{name:'Tiếp →',exact:true}).click();await expect(student.locator('.card-count')).toHaveText('Thẻ 2 / 24');await expect(student.locator('.card-meaning')).toHaveCount(0);await student.reload();await expect(student.locator('.card-count')).toHaveText('Thẻ 2 / 24');
 expect((await (await student.request.get(base+'/history')).json()).data.filter(a=>a.set_id===setId)).toHaveLength(0);
 await expect(student.locator('.study-bar h1')).toHaveText('E2E Quick study');await expect(student.locator('.chinese-pagebar')).toBeHidden();await expect(student.locator('.study-source').first()).toBeHidden();
 await student.setViewportSize({width:390,height:844});expect(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await student.screenshot({path:'test-results/chinese-study-compact.png',fullPage:true});
 await student.getByRole('link',{name:'Bài học',exact:true}).click();
 await student.locator('.learn-document').filter({hasText:'E2E Question cards'}).getByRole('button',{name:'Quiz 20 câu',exact:true}).click();await student.waitForURL(/\?attempt=/);
 await student.setViewportSize({width:390,height:844});expect(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(let n=0;n<20;n++){
  await expect(student.locator('.quiz-position')).toHaveText(`Câu ${n+1} / 20`);await expect(student.locator('.quiz-prompt')).toHaveCount(1);
  await student.getByRole('radio',{name:'Đúng',exact:false}).check();await student.getByRole('button',{name:'Kiểm tra',exact:true}).click();
  if(n<19)await expect(student.locator('#content')).toContainText('Đúng rồi!');
  if(n===0){
   const activeId=new URL(student.url()).searchParams.get('attempt');await student.goto('/pages/student/chinese/?level=9');
   await student.locator('.learn-document').filter({hasText:'E2E Question cards'}).getByRole('button',{name:'Quiz 20 câu',exact:true}).click();await student.waitForURL(url=>url.searchParams.get('attempt')===activeId);
  }else if(n<19)await student.getByRole('button',{name:'Câu tiếp theo →',exact:true}).click();
 }
 await expect(student.locator('.quiz-score')).toHaveText('100/100');await expect(student.locator('#content')).toContainText('+3 Kim Cương');
 const originalId=new URL(student.url()).searchParams.get('attempt');await student.getByRole('button',{name:'Làm lại',exact:true}).click();await student.waitForURL(url=>url.searchParams.get('attempt')!==originalId);expect(errors).toEqual([]);await ctx.close();
});
