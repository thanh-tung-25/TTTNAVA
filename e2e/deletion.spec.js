import fs from 'node:fs/promises';
import {test,expect} from '@playwright/test';

const adminPassword='DeletionUi@123!';
const student={id:'11111111-1111-4111-8111-111111111111',username:'student_safe',displayName:'Học sinh kiểm tra xóa',grade:3,avatarKey:'meo',role:'student',locked:false,createdAt:'2026-11-10T09:00:00Z'};
const admins=[
 {id:'22222222-2222-4222-8222-222222222222',username:'super_current',displayName:'Admin tổng hiện tại',role:'admin',adminScope:'super',avatarKey:'cu',locked:false},
 {id:'33333333-3333-4333-8333-333333333333',username:'super_other',displayName:'Admin tổng khác',role:'admin',adminScope:'super',avatarKey:'cu',locked:false},
 {id:'44444444-4444-4444-8444-444444444444',username:'admin_chinese',displayName:'Admin Tiếng Trung',role:'admin',adminScope:'chinese',avatarKey:'cu',locked:false},
].map(user=>({...user,createdAt:'2026-11-10T09:00:00Z'}));

async function setup(page,scope='super'){
 const state={confirmations:[],deletions:[],restorations:[],deleted:new Set(),confirmationGate:null};
 await page.route('**/pages/admin/**',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const section=new URL(route.request().url()).pathname.split('/')[3];
  await route.fulfill({contentType:'text/html',body:await fs.readFile(`frontend/pages/admin/${section}/index.html`,'utf8')});
 });
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();
  let body={data:{count:0}};
  if(path.endsWith('/auth/me'))body={data:{profile:scope==='super'?admins[0]:admins[2]}};
  else if(path.endsWith('/team/audit'))body={data:[]};
  else if(path.endsWith('/students')||path.endsWith('/team')){
   const deleted=url.searchParams.get('status')==='deleted',accounts=path.endsWith('/students')?[student]:admins;
   const data=accounts.filter(user=>state.deleted.has(user.id)===deleted).map(user=>deleted?{...user,deletedAt:'2026-11-11T01:00:00Z',deletionReason:'Xóa tài khoản thử nghiệm'}:{...user});
   body=path.endsWith('/students')?{data,pagination:{page:1,limit:20,total:data.length}}:{data};
  }else if(path.endsWith('/deletion-preview')){
   const account=path.includes('/team/')?admins[2]:student;
   body={data:{[path.includes('/team/')?'account':'student']:account,summary:path.includes('/team/')?{studentsCreated:2,questionsCreated:3,worksheetsCreated:1}:{enrollments:2,orders:3,practiceSessions:4,examAttempts:1,challenges:2},reversible:true}};
  }else if(path.endsWith('/deletion-confirmation')){
   const input=route.request().postDataJSON();state.confirmations.push({path,input});
   if(state.confirmationGate)await state.confirmationGate;
   if(input.password!==adminPassword)return route.fulfill({status:403,json:{error:{code:'ADMIN_REAUTH_FAILED',message:'Mật khẩu admin tổng chưa đúng.'}}});
   body={data:{confirmationToken:'x'.repeat(43),notBefore:new Date(Date.now()+5000).toISOString(),expiresAt:new Date(Date.now()+300000).toISOString()}};
  }else if(method==='DELETE'){
   state.deletions.push({path,input:route.request().postDataJSON()});state.deleted.add(path.split('/').at(-1));body={data:{deleted:true,reversible:true}};
  }else if(path.endsWith('/restore')){
   const id=path.split('/').at(-2);state.restorations.push(id);state.deleted.delete(id);body={data:{restored:true}};
  }else if(path.includes('/chat/'))body={data:[]};
  await route.fulfill({json:body});
 });
 return state;
}
async function fillConfirmation(page,username=student.username,password=adminPassword){
 await page.locator('#delete-confirm-username').fill(username);
 await page.locator('#delete-student-reason').fill('Xóa tài khoản thử nghiệm');
 await page.locator('#delete-student-acknowledge').check();
 await page.locator('#delete-admin-password').fill(password);
}
async function proceed(page){
 await page.locator('#delete-continue-button').click();
 await expect(page.getByRole('heading',{name:'Xác nhận xóa tài khoản',exact:true})).toBeVisible();
}

test('student deletion requires exact identity, reason, acknowledgement and password; cancellation never deletes',async({page})=>{
 const state=await setup(page);await page.goto('/pages/admin/students/');
 await page.locator('[data-delete-student]').click();
 await expect(page.locator('.student-deletion-identity')).toContainText(student.username);
 await expect(page.locator('#delete-continue-button')).toBeDisabled();
 await fillConfirmation(page,'wrong_username');
 await expect(page.locator('#delete-continue-button')).toBeDisabled();
 await page.locator('#delete-confirm-username').fill(student.username);
 await page.locator('#delete-student-acknowledge').uncheck();
 await expect(page.locator('#delete-continue-button')).toBeDisabled();
 await page.locator('#delete-student-acknowledge').check();
 await page.locator('#delete-student-reason').fill('abc');
 await expect(page.locator('#delete-continue-button')).toBeDisabled();
 await page.getByRole('button',{name:'Hủy',exact:true}).click();
 expect(state.confirmations).toEqual([]);expect(state.deletions).toEqual([]);
 await page.locator('[data-delete-student]').click();await fillConfirmation(page);await proceed(page);
 await expect(page.locator('#delete-final-button')).toBeDisabled();
 await expect(page.locator('#delete-admin-password')).toHaveCount(0);
 await page.getByRole('button',{name:'Hủy, giữ tài khoản',exact:true}).click();
 expect(state.confirmations).toHaveLength(1);expect(state.deletions).toEqual([]);
 await expect(page.locator('#students-table')).toContainText(student.username);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('closing while password verification is pending does not open a final dialog or delete',async({page})=>{
 const state=await setup(page);let release;
 state.confirmationGate=new Promise(resolve=>{release=resolve;});
 await page.goto('/pages/admin/students/');await page.locator('[data-delete-student]').click();await fillConfirmation(page);
 await page.locator('#delete-continue-button').click();await expect.poll(()=>state.confirmations.length).toBe(1);
 const response=page.waitForResponse(r=>r.url().endsWith('/deletion-confirmation'));
 await page.getByRole('button',{name:'Đóng',exact:true}).click();release();await response;
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(state.deletions).toEqual([]);
});

test('wrong password stays inline; explicit final confirmation after countdown moves a student to trash and restores it',async({page})=>{
 const state=await setup(page);await page.clock.install();await page.goto('/pages/admin/students/');
 await page.locator('[data-delete-student]').click();await fillConfirmation(page,student.username,'WrongPassword@123');
 await page.locator('#delete-continue-button').click();await expect(page.locator('#delete-student-error')).toContainText('Mật khẩu admin tổng chưa đúng');
 await expect(page.locator('#delete-admin-password')).toHaveValue('');expect(state.deletions).toEqual([]);
 await page.locator('#delete-admin-password').fill(adminPassword);await proceed(page);
 await page.clock.fastForward(2000);await expect(page.locator('#delete-final-button')).toBeDisabled();expect(state.deletions).toEqual([]);
 await page.clock.fastForward(4000);await expect(page.locator('#delete-final-button')).toBeEnabled();
 await page.locator('#delete-final-button').click();await expect(page.locator('#students-table')).not.toContainText(student.username);
 expect(state.deletions).toHaveLength(1);expect(state.deletions[0].input).toEqual({confirmationToken:'x'.repeat(43)});
 await page.locator('#deleted-students-tab').click();await expect(page.locator('#students-table')).toContainText(student.username);
 await expect(page.locator('[data-delete-student],[data-edit],[data-password],[data-lock]')).toHaveCount(0);
 await page.locator('[data-restore-student]').click();await expect(page.locator('.student-deletion-identity')).toContainText(student.username);
 await page.getByRole('button',{name:'Khôi phục tài khoản',exact:true}).click();await expect(page.locator('#students-table')).not.toContainText(student.username);
 await page.locator('#active-students-tab').click();await expect(page.locator('#students-table')).toContainText(student.username);
 expect(state.restorations).toEqual([student.id]);
 const local=await page.evaluate(()=>JSON.stringify({...localStorage}));expect(local).not.toContain(adminPassword);expect(local).not.toContain('x'.repeat(43));
});

test('expired confirmation stays disabled and cannot delete even after the countdown',async({page})=>{
 const state=await setup(page);await page.clock.install();await page.goto('/pages/admin/students/');
 await page.locator('[data-delete-student]').click();await fillConfirmation(page);await proceed(page);
 await page.clock.fastForward(301000);await expect(page.locator('#delete-final-countdown')).toContainText('Yêu cầu đã hết hạn');
 await expect(page.locator('#delete-final-button')).toBeDisabled();expect(state.deletions).toEqual([]);
});

test('super admins have no delete button while subadmins use the same protected deletion and restore flow',async({page})=>{
 const state=await setup(page);await page.clock.install();await page.goto('/pages/admin/team/');
 await expect(page.locator('[data-delete-admin]')).toHaveCount(1);
 for(const user of admins.slice(0,2))await expect(page.locator(`[data-admin-id="${user.id}"] [data-delete-admin]`)).toHaveCount(0);
 await page.locator('[data-delete-admin]').click();await fillConfirmation(page,admins[2].username);await proceed(page);
 await expect(page.locator('#delete-final-button')).toBeDisabled();await page.clock.fastForward(6000);
 await page.locator('#delete-final-button').click();await expect(page.locator('#team-list')).not.toContainText(admins[2].username);
 expect(state.deletions[0].path).toBe('/api/v1/admin/team/'+admins[2].id);
 await page.locator('#deleted-admins-tab').click();await expect(page.locator('#team-list')).toContainText(admins[2].username);
 await expect(page.locator('.team-create')).toBeHidden();await expect(page.locator('[data-delete-admin]')).toHaveCount(0);
 await page.locator('[data-restore-admin]').click();await page.getByRole('button',{name:'Khôi phục tài khoản',exact:true}).click();
 await expect(page.locator('#team-list')).not.toContainText(admins[2].username);await page.locator('#active-admins-tab').click();
 await expect(page.locator('#team-list')).toContainText(admins[2].username);expect(state.restorations).toEqual([admins[2].id]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Chinese admin student view has no deletion or trash controls',async({page})=>{
 await setup(page,'chinese');await page.goto('/pages/admin/students/');
 await expect(page.locator('#students-table')).toContainText(student.username);
 await expect(page.locator('#student-status-tabs')).toBeHidden();
 await expect(page.locator('[data-delete-student],[data-restore-student]')).toHaveCount(0);
 await expect(page.locator('#create-button')).toBeVisible();
});
