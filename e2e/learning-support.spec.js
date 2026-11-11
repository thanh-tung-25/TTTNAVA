import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;let target=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))target=path.join(target,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html; charset=utf-8','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
async function mock(page,role='student'){
 await page.addInitScript(()=>{localStorage.setItem('ttnava-course','grade-3');window.__spoken=[];Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'vi-VN'},{lang:'en-US'}],cancel:()=>{},speak:u=>window.__spoken.push({text:u.text,lang:u.lang})}});});
 const course={id:'grade-3',title:'Lớp 3',kind:'primary',level:3,unlocked:true};
 await page.route('**/api/v1/**',async route=>{
  const p=new URL(route.request().url()).pathname;let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'support-user',role,adminScope:'super',grade:3,displayName:'Bé An',avatarKey:'meo'}};
  else if(p.endsWith('/access'))data=course;
  else if(p.endsWith('/diamonds/summary'))data={total:0};
  else if(p.endsWith('/chat/rooms')||p.endsWith('/chat/friends'))data=[];
  else if(p.endsWith('/experience/dashboard'))data={prefs:{minutes:10},resume:null};
  else if(p.endsWith('/experience/catalog'))data={items:[{id:'topic-1',name:'Cộng trừ',total:10}],focus:{topic_id:'topic-1',set_id:null}};
  else if(p.endsWith('/learning/today'))data={day:'2026-11-08',course,kind:'primary',minutes:10,reason:'Ưu tiên nội dung cần ôn',topic:{id:'topic-1',name:'Cộng trừ',subject_id:'toan',subject:'Toán'},recent:null};
  else if(p.endsWith('/learning/today/start'))data={href:'/pages/student/practice/?session=daily-round&subject=toan'};
  else if(p.endsWith('/learning/family-report'))data={day:'2026-11-08',course,summary:{completed:1,average:40,estimated_minutes:6,in_progress:1,pending_review:0},subjects:[{id:'toan',title:'Toán',completed:1,average:40}],weak:[{subject:'Toán',title:'Cộng trừ',score:40}],recent:[{kind:'Luyện tập',subject:'Toán',title:'=SUM(1,2)',status:'finished',started_at:'2026-11-08T01:00:00Z',completed_at:'2026-11-08T01:06:00Z',score:40,correct:4,total:10}],note:'Thời lượng ước tính, không phải thời gian tương tác thực.'};
  else if(p.endsWith('/admin/deployment-check'))data={ready:true,database:'PostgreSQL',release:'release-123',missing:[],tables:[{name:'chat_friendships',ready:true}],note:'Các bảng đã có.'};
  await route.fulfill({json:{data}});
 });
}
test('today and option audio work without auto-speaking or selecting an answer',async({page})=>{
 await mock(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/pages/student/today/');await expect(page.getByRole('button',{name:'Bắt đầu buổi học',exact:true})).toBeVisible();
 await page.evaluate(async()=>{const {renderItem}=await import('/assets/js/worksheet-player.js');window.__selected=null;const node=renderItem({type:'choice',subjectId:'tieng-anh',prompt:'Chọn con mèo.',config:{options:['cat','dog']}},null,value=>window.__selected=value);node.id='support-fixture';document.querySelector('main').append(node);});
 expect(await page.evaluate(()=>window.__spoken.length)).toBe(0);
 await page.locator('#support-fixture').getByRole('button',{name:'Nghe lựa chọn 1',exact:true}).click();expect(await page.evaluate(()=>window.__spoken.at(-1))).toEqual({text:'cat',lang:'en-US'});expect(await page.evaluate(()=>window.__selected)).toBeNull();
 await expect(page.locator('#beginner-toggle,.beginner-instruction')).toHaveCount(0);
 await page.locator('#support-fixture .worksheet-choices > .choice-with-audio > button').first().click();expect(await page.evaluate(()=>window.__selected)).toBe(0);
 await page.reload();await expect(page.locator('body')).not.toHaveClass(/beginner-mode/);expect(await page.evaluate(()=>window.__spoken.length)).toBe(0);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/today-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('family reports display actual metrics and export safe CSV and print without exposing other students',async({page})=>{
 await mock(page);await page.goto(origin+'/pages/student/family/');await expect(page.locator('#support-content')).toContainText('Bé An · Lớp 3');await expect(page.locator('#support-content')).toContainText('40/100');await expect(page.locator('#support-content')).toContainText('Cộng trừ');
 await page.evaluate(()=>{window.__printed=false;window.print=()=>window.__printed=true;});await page.getByRole('button',{name:'In / lưu PDF'}).click();expect(await page.evaluate(()=>window.__printed)).toBe(true);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Tải bảng kết quả'}).click()]);expect(download.suggestedFilename()).toBe('bao-cao-hoc-tap-2026-11-08.csv');const csv=await readFile(await download.path(),'utf8');expect(csv).toContain("'=SUM(1,2)");
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/family-mobile.png',fullPage:true});expect(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e).position!=='fixed').map(e=>e.tagName+'.'+e.className))).toEqual([]);
});
test('super admins can compare backend and asset releases and see database readiness',async({page})=>{
 await mock(page,'admin');await page.route('**/assets/build-info.json',r=>r.fulfill({json:{release:'release-123'}}));await page.goto(origin+'/pages/admin/deployment/');await expect(page.locator('#deployment-results')).toContainText('Sẵn sàng về cấu hình');await expect(page.locator('#deployment-results')).toContainText('chat_friendships');
 await page.route('**/assets/build-info.json',r=>r.fulfill({json:{release:'old-release'}}));await page.getByRole('button',{name:'Kiểm tra lại'}).click();await expect(page.locator('#support-notice')).toContainText('chưa xác nhận cùng phiên bản');
});
