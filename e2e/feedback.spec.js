import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/feedback-fixture/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/css/base.css"><link rel="stylesheet" href="/assets/css/components.css"></head><body data-role="student" class="student-unified"><header class="topbar"><div class="topbar-inner"><strong>TTNAVA</strong><div class="topbar-user"></div></div></header><main class="page"><h1>Bài học của bạn</h1></main></body></html>');return;}
  let target=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))target=path.join(target,'index.html');if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
function fixture(){return [
 {id:'report-1',reporter_id:'student-1',display_name:'Thùy Linh',category:'question',message:'Viết đúng nhưng không được tính đúng.',context_text:'Điền từ · 2/10\nCâu hỏi: 我是___。\nCâu trả lời của học sinh: 我是老师。',page_url:'/pages/student/chinese/?set=sample&mode=apply',status:'open',reply:'',created_at:'2026-11-15T09:08:16Z',updated_at:'2026-11-15T09:08:16Z',reply_version:'1'.repeat(64)},
 {id:'report-2',reporter_id:'student-2',display_name:'Minh An',category:'audio',message:'Em chưa nghe được âm thanh câu hỏi.',context_text:'Luyện nghe · 3/10',page_url:'/pages/student/chinese/?set=sample&mode=listen',status:'reviewing',reply:'Cô đang kiểm tra giọng đọc nhé.',created_at:'2026-11-20T01:00:00Z',updated_at:'2026-11-20T01:10:00Z',reply_version:'2'.repeat(64)},
];}
async function mock(page,reports,{fail=false,delay=0,student=false}={}){
 const controls={fail,requests:[]};
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname;let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'admin-1',role:'admin',adminScope:'super',displayName:'Cô giáo',avatarKey:'cu'}};
  else if(p==='/api/v1/feedback'&&request.method()==='GET')data=student?reports.filter(row=>row.reporter_id==='student-1'):reports;
  else if(p.startsWith('/api/v1/feedback/')&&request.method()==='PUT'){
   controls.requests.push(request.postDataJSON());if(delay)await new Promise(resolve=>setTimeout(resolve,delay));if(controls.fail){await route.fulfill({status:500,json:{error:{message:'Mạng tạm thời gián đoạn.'}}});return;}
   const row=reports.find(row=>p.endsWith('/'+row.id));Object.assign(row,{status:request.postDataJSON().status,reply:request.postDataJSON().reply.trim(),updated_at:'2026-11-21T11:00:00Z',reply_version:'3'.repeat(64)});data={id:row.id,status:row.status,reply:row.reply,updated_at:row.updated_at,reply_version:row.reply_version};
  }else if(p.endsWith('/chat/rooms')||p.endsWith('/chat/friends')||p.includes('/courses'))data=[];
  await route.fulfill({json:{data}});
 });return controls;
}
async function studentSetup(page){await page.evaluate(async()=>{const {setupFeedback}=await import('/assets/js/learning-feedback.js');setupFeedback({id:'student-1',role:'student',course:{kind:'chinese'}});});}

test('admin sees sending and saved confirmation; the reporter receives a badge and can read the reply',async({page,context})=>{
 const reports=fixture(),controls=await mock(page,reports,{delay:700});await page.goto(origin+'/pages/admin/feedback/');const first=page.locator('[data-feedback-id="report-1"]');
 await expect(first).toContainText('Chưa gửi phản hồi');await first.getByRole('textbox',{name:'Phản hồi cho Thùy Linh'}).fill('Cô đã sửa cách chấm. Em tải lại bài và thử nhé.');await first.getByRole('combobox',{name:'Trạng thái xử lý của Thùy Linh'}).selectOption('resolved');
 await expect(first).toContainText('Có thay đổi chưa lưu');await first.getByRole('button',{name:'Gửi phản hồi',exact:true}).click();await expect(first.getByRole('button',{name:'Đang gửi…',exact:true})).toBeDisabled();await expect(first.locator('.feedback-save-notice')).toContainText('Đã gửi phản hồi cho Thùy Linh');await expect(first.locator('.feedback-delivery')).toContainText('Phản hồi đã hiển thị');expect(controls.requests[0].expected_version).toBe('1'.repeat(64));
 const learner=await context.newPage();await mock(learner,reports,{student:true});await learner.goto(origin+'/feedback-fixture/');await studentSetup(learner);await expect(learner.locator('.feedback-reply-badge')).toHaveText('1');await learner.locator('#feedback-open').click();await expect(learner.locator('.feedback-history-reply')).toContainText('Cô đã sửa cách chấm. Em tải lại bài và thử nhé.');await expect(learner.locator('.feedback-reply-badge')).toBeHidden();await expect(learner.locator('.feedback-history-list')).not.toContainText('Minh An');
 await learner.getByRole('button',{name:'Đóng',exact:true}).click();await learner.reload();await studentSetup(learner);await expect(learner.locator('.feedback-reply-badge')).toBeHidden();await learner.close();
});
test('failed saves retain the draft; retrying does not discard another report being edited',async({page})=>{
 const reports=fixture(),controls=await mock(page,reports,{fail:true});await page.goto(origin+'/pages/admin/feedback/');const first=page.locator('[data-feedback-id="report-1"]'),second=page.locator('[data-feedback-id="report-2"]');
 await second.getByRole('textbox',{name:'Phản hồi cho Minh An'}).fill('Bản nháp của phản ánh thứ hai');await first.getByRole('textbox',{name:'Phản hồi cho Thùy Linh'}).fill('Nội dung cần giữ lại khi mất mạng.');await first.getByRole('button',{name:'Gửi phản hồi',exact:true}).click();await expect(first.locator('.feedback-save-notice')).toContainText('Chưa lưu được');await expect(first.getByRole('textbox')).toHaveValue('Nội dung cần giữ lại khi mất mạng.');
 controls.fail=false;await first.getByRole('button',{name:'Gửi phản hồi',exact:true}).click();await expect(first.locator('.feedback-save-notice')).toContainText('Đã gửi');await expect(second.getByRole('textbox')).toHaveValue('Bản nháp của phản ánh thứ hai');
 await page.getByRole('combobox',{name:'Loại phản ánh',exact:true}).selectOption('audio');await page.getByRole('combobox',{name:'Loại phản ánh',exact:true}).selectOption('');await expect(page.locator('[data-feedback-id="report-2"]').getByRole('textbox')).toHaveValue('Bản nháp của phản ánh thứ hai');
});
test('the feedback page is readable on desktop and mobile without horizontal overflow',async({page})=>{
 await mock(page,fixture());await page.goto(origin+'/pages/admin/feedback/');await expect(page.locator('.feedback-card')).toHaveCount(2);await page.screenshot({path:'test-results/feedback-admin-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.feedback-card')).toHaveCount(2);await expect.poll(()=>page.locator('.admin-sidebar').evaluate(node=>node.getBoundingClientRect().right)).toBeLessThanOrEqual(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/feedback-admin-mobile.png',fullPage:true});
});
