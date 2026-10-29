import {test,expect} from '@playwright/test';
test.use({storageState:'e2e/.auth/admin.json'});
test('admin creates, edits and logs in a Chinese student without a primary grade',async({page,browser})=>{
 const username='e2e_ui_'+Date.now().toString().slice(-9);
 await page.goto('/pages/admin/chinese/');
 await page.getByRole('link',{name:'Học sinh Tiếng Trung',exact:true}).click();
 await expect(page.locator('#program-filter')).toHaveValue('chinese');
 await page.locator('#create-button').click();
 await expect(page.locator('#new-grade')).toHaveValue('');
 await page.locator('#new-username').fill(username);await page.locator('#new-display-name').fill('Học viên Tiếng Trung');await page.locator('#new-password').fill('Chinese@123');
 await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect(page.locator('.modal')).toHaveCount(0);
 const row=page.locator('tr').filter({hasText:username});await expect(row).toContainText('Tiếng Trung');await expect(row).not.toContainText('Lớp null');
 await row.getByRole('button',{name:'Sửa',exact:true}).click();await expect(page.locator('#edit-grade')).toHaveValue('');await page.locator('#edit-name').fill('Học viên đã sửa');await page.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(page.locator('.modal')).toHaveCount(0);await expect(row).toContainText('Học viên đã sửa');
 const context=await browser.newContext({storageState:{cookies:[],origins:[]}});const student=await context.newPage();await student.goto('/pages/login/');await student.locator('#username').fill(username);await student.locator('#password').fill('Chinese@123');await student.locator('#login-button').click();await student.waitForURL('**/pages/student/chinese/');await expect(student.locator('#app-header')).toContainText('Học sinh Tiếng Trung');await expect(student.locator('#content')).toContainText('HSK 1');await context.close();
});
