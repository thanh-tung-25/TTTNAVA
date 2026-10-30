import fs from 'node:fs';
import {test,expect} from '@playwright/test';
import {query,closePool} from '../backend/src/config/db.js';
let lesson,setId,document;
test.use({storageState:'e2e/.auth/admin.json'});
test.afterAll(async()=>{
 if(setId){await query('DELETE FROM chinese_items WHERE set_id=?',[setId]);await query('DELETE FROM chinese_sets WHERE id=?',[setId]);}
 if(document)await query('DELETE FROM chinese_documents WHERE id=?',[document]);
 if(lesson)await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);await closePool();
});
test('simple editor preserves changes between pages and requires explicit publication',async({page})=>{
 const base='/api/v1/chinese';
 const created=await page.request.post(base+'/lessons',{data:{level_id:9,title:'E2E pagination',position:999,description:'',image_url:'',status:'draft'}});expect(created.ok()).toBe(true);lesson=(await created.json()).data.id;
 const imported=await page.request.post(base+'/imports',{multipart:{level_id:'9',lesson_id:lesson,title:'E2E editor',allow_duplicate:'true',file:{name:'template.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:fs.readFileSync('frontend/assets/templates/chinese-template.docx')}}});expect(imported.ok()).toBe(true);setId=(await imported.json()).data.id;
 const original=(await (await page.request.get(base+'/sets/'+setId)).json()).data;document=original.set.document_id;
 const source=original.items.find(i=>i.kind==='question').data;
 const items=Array.from({length:16},(_,n)=>({kind:'question',data:{...source,prompt:'Câu hỏi kiểm thử '+(n+1),explanation:'Giữ lời giải',difficulty:'hard'}}));
 expect((await page.request.put(base+'/sets/'+setId,{data:{title:'E2E editor',status:'draft',items}})).ok()).toBe(true);
 await page.goto('/pages/admin/chinese/?set='+setId);await expect(page.locator('.simple-question')).toHaveCount(15);await expect(page.locator('#notice')).toHaveText('');
 const first=page.locator('.simple-question').first();await first.getByText('Sửa câu hỏi',{exact:true}).click();await first.getByLabel('Giải thích',{exact:true}).fill('Sửa tại trang một');
 await page.getByRole('button',{name:'Tiếp →',exact:true}).click();await expect(page.locator('.simple-question')).toHaveCount(1);
 await page.getByText('Sửa câu hỏi',{exact:true}).click();await page.getByLabel('Giải thích',{exact:true}).fill('Sửa tại trang hai');
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await page.waitForURL(/\?lesson=/);
 const saved=(await (await page.request.get(base+'/sets/'+setId)).json()).data;
 expect(saved.items[0].data.explanation).toBe('Sửa tại trang một');expect(saved.items[15].data.explanation).toBe('Sửa tại trang hai');expect(saved.items[0].data.difficulty).toBe('hard');expect(saved.items.every(i=>i.data.approved===false)).toBe(true);
 await page.goto('/pages/admin/chinese/?set='+setId);page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();
 expect((await (await page.request.get(base+'/sets/'+setId)).json()).data.set.status).toBe('draft');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
