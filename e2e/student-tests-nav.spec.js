import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
async function mock(page,kind){
 const course={id:kind==='chinese'?'hsk-1':kind==='secondary'?'grade-6':'grade-1',kind,level:kind==='secondary'?6:1,title:kind==='chinese'?'Tiếng Trung HSK 1':kind==='secondary'?'Lớp 6':'Lớp 1'},errors=[],starts=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(id=>localStorage.setItem('ttnava-course',id),course.id);
 const attempt={id:'test-attempt',test_id:'test-1',title:'Kiểm tra Tiếng Trung',started_at:new Date().toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),items:[{id:'question-1',kind:'question',data:{type:'choice',prompt:'Chọn nghĩa của 你',options:['Bạn','Tôi']}}]};
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'learner',role:'student',displayName:'Bạn học',grade:null,avatarKey:'meo'}};
  else if(p.endsWith('/access'))data=course;
  else if(p.endsWith('/diamonds/summary'))data={total:20,week:20,month:20,recent:[],programs:{primary:{total:5},secondary:{total:5},chinese:{total:10}}};
  else if(p.endsWith('/experience/preferences'))data={minutes:10,onboarding_at:'2026-11-01',companion:'lion'};
  else if(p.includes('/chat/'))data=p.endsWith('/calls/config')?{enabled:false}:[];
  else if(p.endsWith('/exams/catalog'))data={year:{id:'2026-2027'},chapters:[{id:'chapter',name:'Chủ đề kiểm tra lớp '+course.level,semester:'hk1',count:30,questionCount:30,durationSeconds:1800}],semesters:[],annual:{count:60,questionCount:0,durationSeconds:3600}};
  else if(p.endsWith('/chinese/catalog'))data={levels:[{id:1}],lessons:[],sets:[],counts:[],reviews:[],progress:[],completion:[]};
  else if(p.endsWith('/chinese/tests'))data=[{id:'test-1',title:'Kiểm tra Tiếng Trung',duration_seconds:1800,set_ids:[]}];
  else if(p.endsWith('/chinese/attempts')&&req.method()==='POST'){starts.push(req.postDataJSON());data=attempt;}
  else if(p.endsWith('/chinese/attempts/test-attempt'))data=attempt;
  await route.fulfill({json:{data}});
 });return {errors,starts};
}
for(const kind of ['primary','secondary','chinese'])for(const width of [360,1280])test(`${kind}: exam tab replaces the removed game at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});const state=await mock(page,kind);await page.goto(origin+'/pages/student/diamonds/');
 const nav=page.locator('.student-primary-nav');await expect(nav.getByRole('link',{name:'Bài kiểm tra',exact:true})).toBeVisible();await expect(nav).not.toContainText('Thử sức');await expect(page.locator('a[href*="/arena/"],a[href*="/challenge/"]')).toHaveCount(0);
 await nav.getByRole('link',{name:'Bài kiểm tra',exact:true}).click();
 await expect(page.locator('.student-primary-nav').getByRole('link',{name:'Bài kiểm tra',exact:true})).toHaveAttribute('aria-current','page');
 if(kind==='chinese'){
  await expect(page).toHaveURL(/chinese\/\?view=tests/);await expect(page.locator('#content')).toContainText('Kiểm tra Tiếng Trung');await page.locator('#content').getByRole('button',{name:'Bắt đầu',exact:true}).click();
  await expect(page).toHaveURL(/view=tests&attempt=test-attempt/);await expect(page.locator('.quiz-prompt')).toHaveText('Chọn nghĩa của 你');expect(state.starts).toEqual([{test_id:'test-1'}]);
  await expect(page.locator('.student-primary-nav').getByRole('link',{name:'Bài kiểm tra',exact:true})).toHaveAttribute('aria-current','page');
 }else{await expect(page).toHaveURL(/student\/exam\/$/);await expect(page.locator('#topic-list')).toContainText('Chủ đề kiểm tra lớp '+(kind==='primary'?1:6));await expect(page.locator('[data-exam-kind=chapter]')).toBeEnabled();}
 expect(state.errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
