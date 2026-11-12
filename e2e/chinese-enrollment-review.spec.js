import {test,expect} from '@playwright/test';

async function mock(page,scope='chinese'){
 const profile={id:'teacher',username:'co_lan',role:'admin',adminScope:scope,displayName:'Cô Lan',avatarKey:'cu'};
 const courses=[1,2].map(level=>({id:'hsk-'+level,title:'Tiếng Trung HSK '+level,kind:'chinese',level,price_vnd:1000000,duration_days:30,payment_instructions:'Ngân hàng kiểm thử',active:1,description:'Học phần HSK'}));
 const state={requests:[],decisions:[],orders:courses.map((course,n)=>({id:'order-'+(n+1),student_id:'learner',username:'hoc_sinh',display_name:'Học sinh',course_id:course.id,title:course.title,amount_vnd:1000000,duration_days:30,payer_name:'Phụ huynh',payment_reference:'TEST-HSK-'+(n+1),created_at:'2026-11-11T10:00:00Z',status:'pending'})),enrollments:[],audit:[]};
 page.on('dialog',dialog=>dialog.accept());
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),p=new URL(request.url()).pathname;let data={};
  if(p.endsWith('/auth/me'))data={profile};
  else if(p.includes('/chat/'))data=[];
  else if(p.endsWith('/admin/students'))data=[];
  else if(p.includes('/courses/admin/')){
   state.requests.push(p);
   if(p.endsWith('/pending-count'))data={total:state.orders.filter(o=>o.status==='pending').length};
   else if(p.endsWith('/orders'))data=state.orders;
   else if(p.endsWith('/enrollments'))data=state.enrollments;
   else if(p.endsWith('/audit'))data=state.audit;
   else if(p.endsWith('/review')){
    const id=p.split('/').at(-2),order=state.orders.find(o=>o.id===id),body=request.postDataJSON();state.decisions.push({id,...body});
    order.status=body.decision;order.review_note=body.note;order.reviewer='co_lan';
    if(body.decision==='approved')state.enrollments.push({student_id:'learner',username:order.username,display_name:order.display_name,course_id:order.course_id,title:order.title,starts_at:'2026-11-11T10:00:00Z',expires_at:null,revoked_at:null});
    state.audit.push({student_id:'learner',username:order.username,title:order.title,actor:'co_lan',action:body.decision,note:body.note,created_at:'2026-11-11T10:00:00Z'});data={id,status:body.decision};
   }else if(scope==='super'&&p.endsWith('/catalog'))data=courses;
   else if(scope==='super'&&p.endsWith('/payment-qr'))data=[];
   else return route.fulfill({status:403,json:{error:{message:'Không có quyền cấu hình'}}});
  }
  return route.fulfill({json:{data}});
 });
 return state;
}

test('Chinese admin opens review from the sidebar, approves HSK and sees read-only access and audit',async({page},info)=>{
 const state=await mock(page),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/pages/admin/students/');await expect(page.locator('#course-pending-count')).toHaveText('2');
 if(info.project.name==='mobile-admin')await page.getByRole('button',{name:'Mở điều hướng quản trị',exact:true}).click();
 await page.locator('#admin-sidebar a[href="/pages/admin/courses/"]').click();
 await expect(page.getByRole('heading',{name:'Duyệt đăng ký Tiếng Trung',exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:'QR & học phí',exact:true})).toHaveCount(0);
 await expect(page.locator('.admin-order')).toHaveCount(2);
 await page.locator('.admin-order').first().getByRole('button',{name:'Mở khóa',exact:true}).click();
 await expect(page.locator('.admin-order')).toHaveCount(1);await expect(page.locator('#course-pending-count')).toHaveText('1');
 expect(state.decisions).toEqual([{id:'order-1',decision:'approved',note:'Đã đối soát và xác nhận thanh toán.'}]);
 // Keyboard navigation must skip the settings tab hidden for Chinese admins.
 await page.getByRole('tab',{name:'Duyệt đăng ký',exact:true}).focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Quyền học',exact:true})).toHaveAttribute('aria-selected','true');
 const learner=page.locator('.learner-enrollments');await learner.locator('summary').click();
 await expect(learner).toContainText('Tiếng Trung HSK 1');await expect(page.getByRole('button',{name:'Thu hồi',exact:true})).toHaveCount(0);
 await page.getByText('Xem nhật ký thay đổi',{exact:true}).click();await expect(page.locator('#admin-course-audit')).toContainText('co_lan');
 expect(state.requests.some(p=>p.endsWith('/catalog')||p.includes('payment-qr'))).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:`test-results/chinese-course-review-${info.project.name}.png`,fullPage:true});
});

test('Chinese admin must enter a rejection reason and can review the saved result',async({page})=>{
 const state=await mock(page);await page.goto('/pages/admin/courses/');
 const order=page.locator('.admin-order').first();await order.getByRole('button',{name:'Từ chối',exact:true}).click();
 await expect(page.locator('#admin-course-notice')).toContainText('Nhập lý do từ chối');expect(state.decisions).toEqual([]);
 await order.getByRole('textbox').fill('Chưa thấy giao dịch cho học phần này');await order.getByRole('button',{name:'Từ chối',exact:true}).click();
 await expect(page.locator('.admin-order')).toHaveCount(1);await expect(page.locator('#course-pending-count')).toHaveText('1');
 await page.locator('#order-filter').selectOption('all');
 const rejected=page.locator('.admin-order').filter({hasText:'Tiếng Trung HSK 1'});await expect(rejected).toContainText('Đã từ chối');await expect(rejected).toContainText('Chưa thấy giao dịch cho học phần này');
 expect(state.decisions[0]).toMatchObject({decision:'rejected',note:'Chưa thấy giao dịch cho học phần này'});
 await expect(rejected.getByRole('button',{name:'Mở khóa',exact:true})).toHaveCount(0);
});

test('super admin keeps payment configuration and manual revoke controls',async({page})=>{
 const state=await mock(page,'super');await page.goto('/pages/admin/courses/');
 await expect(page.getByRole('heading',{name:'Quản lý khóa học',exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:'QR & học phí',exact:true})).toBeVisible();
 await page.locator('.admin-order').first().getByRole('button',{name:'Mở khóa',exact:true}).click();await expect(page.locator('.admin-order')).toHaveCount(1);
 await page.getByRole('tab',{name:'QR & học phí',exact:true}).click();await expect(page.locator('#payment-qr-form')).toBeVisible();
 await expect(page.locator('#payment-settings textarea')).toHaveValue('Ngân hàng kiểm thử');
 await page.getByRole('tab',{name:'Quyền học',exact:true}).click();await page.locator('.learner-enrollments summary').click();
 await expect(page.getByRole('button',{name:'Thu hồi',exact:true})).toBeVisible();
 expect(state.requests.some(p=>p.endsWith('/catalog'))).toBe(true);expect(state.requests.some(p=>p.endsWith('/payment-qr'))).toBe(true);
});
