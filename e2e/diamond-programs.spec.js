import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');
 server=createServer(async(req,res)=>{
  let target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(req.url.split('?')[0].endsWith('/'))target=path.join(target,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
async function mock(page,{holdFirst=false,course='hsk-1',zeroSecondary=false}={}){
 const totals=n=>({total:n,week:n,month:n});
 const state={summary:{...totals(81),programs:{primary:totals(12),secondary:totals(zeroSecondary?0:40),chinese:totals(29)},recent:[]},requests:0,errors:[],release:null};
 let release;const first=new Promise(resolve=>release=resolve);state.release=release;
 page.on('pageerror',e=>state.errors.push(e.message));
 await page.addInitScript(course=>localStorage.setItem('ttnava-course',course),course);
 const courses=[['grade-1','primary',1],['grade-5','primary',5],['grade-6','secondary',6],['grade-9','secondary',9],['hsk-1','chinese',1],['hsk-2','chinese',2]].map(([id,kind,level])=>({id,kind,level,title:kind==='chinese'?'Tiếng Trung HSK '+level:'Lớp '+level,description:'Khóa học',price_vnd:null,payment_instructions:'',unlocked:true,active:true}));
 await page.route('**/api/v1/**',async route=>{
  const p=new URL(route.request().url()).pathname;let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'multi-program-learner',username:'learner',role:'student',displayName:'Bạn học',avatarKey:'meo',grade:null}};
  else if(p.endsWith('/diamonds/summary')){const snapshot=structuredClone(state.summary);state.requests++;if(holdFirst&&state.requests===1)await first;data=snapshot;}
  else if(p==='/api/v1/courses')data=courses;
  else if(p.endsWith('/courses/orders'))data=[];
  else if(p.endsWith('/access'))data=courses.find(c=>p.includes('/'+c.id+'/'));
  else if(p.endsWith('/experience/preferences'))data={minutes:10,onboarding_at:'2026-11-01',companion:'lion'};
  else if(p.includes('/chat/'))data=p.endsWith('/calls/config')?{enabled:false,push_enabled:false}:[];
  await route.fulfill({json:{data}});
 });
 return state;
}

for(const width of [360,1280])test(`program cards immediately switch the header total at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});const state=await mock(page);await page.goto(origin+'/pages/student/courses/');
 const chip=page.locator('#diamond-chip');await expect(chip).toContainText('81');
 for(const [program,total,label]of [['primary','12','Tiểu học'],['secondary','40','THCS'],['chinese','29','Tiếng Trung']]){
  await page.locator('[data-kind='+program+']').click();await expect(chip.locator('span')).toHaveText(total);await expect(chip).toHaveAttribute('title','Kim cương '+label);await expect(chip).toHaveAttribute('data-program',program);await expect(page.locator('.course-tile')).toHaveCount(2);
 }
 await page.getByRole('button',{name:'Xem tất cả',exact:true}).click();await expect(chip.locator('span')).toHaveText('81');await expect(chip).toHaveAttribute('data-program','all');
 expect(state.requests).toBe(1);expect(state.errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('a program URL and reload override the previously selected Chinese course',async({page})=>{
 const state=await mock(page);await page.goto(origin+'/pages/student/courses/?program=primary');await expect(page.locator('#diamond-chip span')).toHaveText('12');await expect(page.locator('[data-kind=primary]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-kind=secondary]').click();await expect(page).toHaveURL(/program=secondary/);await page.reload();await expect(page.locator('#diamond-chip span')).toHaveText('40');await expect(page.locator('[data-kind=secondary]')).toHaveAttribute('aria-pressed','true');expect(state.errors).toEqual([]);
});
test('a late response cannot restore another scope or overwrite newly earned diamonds',async({page})=>{
 const state=await mock(page,{holdFirst:true});await page.goto(origin+'/pages/student/courses/');await expect(page.locator('#diamond-chip')).toBeVisible();await expect.poll(()=>state.requests).toBe(1);
 await page.locator('[data-kind=primary]').click();await page.locator('[data-kind=chinese]').click();await expect(page.locator('#diamond-chip span')).toHaveText('…');
 state.summary.total=86;state.summary.programs.chinese.total=34;
 await page.evaluate(async()=>{const {syncDiamondTotal}=await import('/assets/js/ui-core.js');await syncDiamondTotal();});await expect(page.locator('#diamond-chip span')).toHaveText('34');
 state.release();await expect.poll(()=>state.requests).toBe(2);await page.waitForTimeout(100);await expect(page.locator('#diamond-chip span')).toHaveText('34');await expect(page.locator('#diamond-chip')).toHaveAttribute('data-program','chinese');expect(state.errors).toEqual([]);
});
test('a program with no earnings displays zero instead of the global wallet',async({page})=>{
 const state=await mock(page,{zeroSecondary:true});await page.goto(origin+'/pages/student/courses/?program=secondary');await expect(page.locator('#diamond-chip span')).toHaveText('0');expect(state.errors).toEqual([]);
});
for(const [course,program,total]of [['grade-1','primary','12'],['grade-6','secondary','40'],['hsk-1','chinese','29']])test(`${course} keeps its program total on other student pages`,async({page})=>{
 const state=await mock(page,{course});await page.goto(origin+'/pages/student/diamonds/');await expect(page.locator('#diamond-chip span')).toHaveText(total);await expect(page.locator('#diamond-chip')).toHaveAttribute('data-program',program);await expect(page.locator('#diamond-total')).toHaveText('81');expect(state.errors).toEqual([]);
});
