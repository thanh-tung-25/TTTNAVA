import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const admins=[
 {id:'super',username:'admin',displayName:'Admin tổng',role:'admin',adminScope:'super',avatarKey:'cu',locked:false},
 {id:'chinese',username:'admin_tiengtrung',displayName:'Quản lý Tiếng Trung',role:'admin',adminScope:'chinese',avatarKey:'cu',locked:false},
 {id:'primary',username:'admin_cap1',displayName:'Quản lý Tiểu học',role:'admin',adminScope:'primary',avatarKey:'cu',locked:false},
];
async function stub(page,scope){
 const state={created:[],students:[{id:'student',username:'student',displayName:'Học sinh',grade:scope==='chinese'?null:1,locked:false,avatarKey:'meo',createdAt:'2026-11-04T10:00:00Z'}]};
 await page.route('**/pages/admin/**',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const section=new URL(route.request().url()).pathname.split('/')[3];
  await route.fulfill({contentType:'text/html',body:await fs.readFile(`frontend/pages/admin/${section}/index.html`,'utf8')});
 });
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());let body={data:{}};
  if(url.pathname.endsWith('/auth/me'))body={data:{profile:admins.find(a=>a.adminScope===scope)}};
  else if(url.pathname.endsWith('/team/audit'))body={data:[{actor_username:'admin',action:'admin.create',created_at:'2026-11-04T10:00:00Z'}]};
  else if(url.pathname.endsWith('/team'))body={data:admins};
  else if(url.pathname.endsWith('/students')){
   if(route.request().method()==='POST'){
    const input=route.request().postDataJSON();state.created.push(input);
    const student={...input,id:'new-student',locked:false,createdAt:'2026-11-10T10:00:00Z'};
    state.students.unshift(student);body={data:student};
   }else{
    const term=url.searchParams.get('q')||'',students=state.students.filter(s=>s.username.includes(term)||s.displayName.includes(term));
    body={data:students,pagination:{total:students.length,limit:20,page:1}};
   }
  }
  else if(url.pathname.endsWith('/pending-count'))body={data:{count:0}};
  await route.fulfill({json:body});
 });
 return state;
}
for(const scope of ['chinese','primary'])test(`${scope} sees only their program and cannot edit student accounts`,async({page})=>{
 await stub(page,scope);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/pages/admin/students/');
 await expect(page.locator('#app-header .nav-link')).toHaveCount(scope==='chinese'?3:4);
 await expect(page.locator('#app-header')).not.toContainText('Khóa học & thanh toán');
 await expect(page.locator('#app-header')).not.toContainText('Quản trị viên');
 if(scope==='chinese')await expect(page.locator('#create-button')).toBeVisible();
 else await expect(page.locator('#create-button')).toBeHidden();
 await expect(page.locator('#program-filter')).toBeDisabled();
 await expect(page.locator('#program-filter')).toHaveValue(scope);
 await expect(page.locator('tbody')).toContainText('Học sinh');
 await expect(page.locator('[data-edit],[data-password],[data-lock]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test('Chinese admin creates only a Chinese learner and sees it after a previous search',async({page})=>{
 const state=await stub(page,'chinese');
 await page.goto('/pages/admin/students/?program=primary');
 await expect(page.locator('#program-filter')).toHaveValue('chinese');
 await page.locator('#search-input').fill('missing_student');await page.locator('#search-button').click();
 await expect(page.locator('#students-table')).toContainText('Chưa có học sinh nào');
 await page.locator('#create-button').click();
 await expect(page.locator('#new-grade')).toBeDisabled();
 await expect(page.locator('#new-grade')).toHaveValue('');
 await expect(page.locator('#new-grade option')).toHaveCount(1);
 await expect(page.locator('#new-grade option')).toContainText('Tiếng Trung');
 await page.locator('#new-username').fill('chinese_learner');
 await page.locator('#new-display-name').fill('Học sinh Tiếng Trung mới');
 await page.locator('#new-password').fill('ChineseUi@123!');
 await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
 await expect(page.locator('#search-input')).toHaveValue('');
 await expect(page.locator('#students-table')).toContainText('chinese_learner');
 expect(state.created).toHaveLength(1);expect(state.created[0].grade).toBeNull();
 await expect(page.locator('[data-edit],[data-password],[data-lock]')).toHaveCount(0);
});
test('super admin management shows scopes, protects own access controls and supports password visibility',async({page},info)=>{
 await stub(page,'super');const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/pages/admin/team/');
 await expect(page.locator('.team-member')).toHaveCount(3);
 await expect(page.locator('#app-header .nav-link')).toHaveCount(8);
 await expect(page.locator('.team-member').first().locator('select')).toBeDisabled();
 await expect(page.locator('.team-member').nth(1).locator('select')).toHaveValue('chinese');
 await page.locator('.team-create summary').click();
 const password=page.locator('#team-new-password');await password.fill('UiOnlyPassword123');
 await page.locator('.team-create .password-toggle').click();await expect(password).toHaveAttribute('type','text');
 await page.locator('.team-create .password-toggle').click();await expect(password).toHaveAttribute('type','password');
 await password.fill('');await page.locator('.team-create summary').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/admin-team-${info.project.name}.png`,fullPage:true});
 expect(errors).toEqual([]);
});
