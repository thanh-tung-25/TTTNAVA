import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const catalog = {
 levels:[{id:1,title:'HSK 1'},{id:2,title:'HSK 2'}],
 lessons:[{id:'lesson',level_id:1,title:'Xin chào'}],
 sets:[{id:'sample',lesson_id:'lesson',level_id:1,title:'Từ vựng',lesson_title:'Xin chào'}],
 counts:[{set_id:'sample',kind:'vocabulary',total:2}],progress:[],reviews:[],completion:[],
};
const attempt = {
 id:'sample',title:'Sắp xếp câu',items:[{id:'question',data:{type:'ordering',prompt:'Sắp xếp câu',options:['你好','朋友']}}],
};

for(const subject of ['toan','tieng-viet','tieng-anh']) {
test(`primary ${subject} lesson cards keep every start button aligned on the right`,async({page})=>{
 await page.route('**/pages/student/practice/**',async route=>route.fulfill({contentType:'text/html',body:await fs.readFile('frontend/pages/student/practice/index.html','utf8')}));
 await page.route('**/api/v1/courses/grade-1/access',route=>route.fulfill({json:{data:{id:'grade-1',kind:'primary',level:1,title:'Lớp 1'}}}));
 const names=['Bài 1. Các số 0, 1, 2, 3, 4, 5','Bài 2. Các số 6, 7, 8, 9, 10','Bài 3. Nhiều hơn, ít hơn, bằng nhau','Bài 7. Hình vuông, hình tròn, hình tam giác, hình chữ nhật','Bài đang chuẩn bị'];
 await page.route('**/api/v1/catalog/topics?**',route=>route.fulfill({json:{data:names.map((name,i)=>({id:'lesson-'+i,name,grade:1,questionCount:i===4?0:30}))}}));
 await page.route('**/api/v1/practice',route=>route.fulfill({json:{data:{id:'practice',topic:{name:names[0]},currentIndex:0,questions:[{id:'one',type:'single_choice',prompt:'1 + 1 = ?',options:[{key:'a',text:'2'},{key:'b',text:'3'}]}]}}}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/pages/student/practice/?subject='+subject);
 await expect(page.locator('.topic-item')).toHaveCount(5);
 await expect(page.locator('#practice-grade')).toHaveText('· LỚP 1');
 await expect(page.locator('.practice-welcome-mascot')).toBeVisible();
 const bounds=await page.locator('.practice-topic-start').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}));
 expect(Math.max(...bounds.map(b=>b.right))-Math.min(...bounds.map(b=>b.right))).toBeLessThan(1);
 expect(Math.max(...bounds.map(b=>b.width))-Math.min(...bounds.map(b=>b.width))).toBeLessThan(1);
 await expect(page.locator('[data-topic="lesson-4"]')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/primary-practice-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-topic="lesson-0"]').click();
 await expect(page.locator('#quiz-view')).toBeVisible();await expect(page.locator('#question-prompt')).toHaveText('1 + 1 = ?');
 expect(errors).toEqual([]);
});

test(`primary ${subject} exam scopes switch between chapter semester and annual without mixing their settings`,async({page})=>{
 await page.route('**/pages/student/exam/**',async route=>route.fulfill({contentType:'text/html',body:await fs.readFile('frontend/pages/student/exam/index.html','utf8')}));
 await page.route('**/api/v1/courses/grade-1/access',route=>route.fulfill({json:{data:{id:'grade-1',kind:'primary',level:1,title:'Lớp 1'}}}));
 await page.route('**/api/v1/exams/catalog?**',route=>route.fulfill({json:{data:{year:{id:'2026-2027',name:'Năm học 2026–2027'},chapters:[{id:'chapter-1',name:'Chủ đề 1: Các số từ 0 đến 10',semester:'hk1',questionCount:180,count:30,durationSeconds:1800},{id:'chapter-6',name:'Chủ đề 6: Các số đến 100',semester:'hk2',questionCount:40,count:30,durationSeconds:1800}],semesters:[{id:'hk1',name:'Học kì 1',questionCount:180,count:50,durationSeconds:3000},{id:'hk2',name:'Học kì 2',questionCount:40,count:50,durationSeconds:3000}],annual:{questionCount:220,count:50,durationSeconds:3600}}}}));
 let submitted;
 await page.route('**/api/v1/exams',async route=>{submitted=route.request().postDataJSON();await route.fulfill({json:{data:{id:'exam-scoped',topic:{name:'Kiểm tra chủ đề 1'},status:'in_progress',remainingSeconds:1800,questions:Array.from({length:30},(_,i)=>({id:'question-'+i,type:'single_choice',prompt:'1 + 1 = ?',options:[{key:'a',label:'A',text:'2'},{key:'b',label:'B',text:'3'}]}))}}});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/pages/student/exam/?subject='+subject);await expect(page.locator('.assessment-topic')).toHaveCount(2);
 await expect(page.locator('.assessment-topic').first()).toContainText('30 câu ngẫu nhiên');
 await page.locator('[data-exam-mode=semester]').click();await expect(page.locator('.assessment-topic')).toHaveCount(1);await expect(page.locator('.assessment-topic')).toContainText('học kì 1');await expect(page.locator('.assessment-topic')).toContainText('50 câu ngẫu nhiên');
 await page.locator('#exam-semester').selectOption('hk2');await expect(page.locator('[data-exam-kind=semester]')).toBeDisabled();
 await page.locator('[data-exam-mode=annual]').click();await expect(page.locator('#exam-semester-filter')).toBeHidden();await expect(page.locator('.assessment-topic')).toContainText('cả năm');await expect(page.locator('.assessment-topic')).toContainText('60 phút');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/primary-exam-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-exam-mode=chapter]').click();await page.locator('#exam-semester').selectOption('all');
 await page.locator('[data-exam-kind=chapter]').first().click();await page.locator('.modal-actions').getByRole('button',{name:'Bắt đầu',exact:true}).click();
 await expect(page.locator('#exam-view')).toBeVisible();await expect(page.locator('#question-palette button')).toHaveCount(30);expect(submitted).toMatchObject({mode:'chapter',chapterId:'chapter-1',subjectId:subject,yearId:'2026-2027'});expect(errors).toEqual([]);
});

}

// Serve repository HTML and stub API responses; these regressions never modify local student data.
test('primary rapid subject switching keeps the latest subject lesson list',async({page})=>{
 await page.route('**/pages/student/practice/**',async route=>route.fulfill({contentType:'text/html',body:await fs.readFile('frontend/pages/student/practice/index.html','utf8')}));
 await page.route('**/api/v1/courses/grade-1/access',route=>route.fulfill({json:{data:{id:'grade-1',kind:'primary',level:1,title:'Lớp 1'}}}));
 let release,started;
 const pending=new Promise(resolve=>{release=resolve;});
 const englishStarted=new Promise(resolve=>{started=resolve;});
 await page.route('**/api/v1/catalog/topics?**',async route=>{
  const subject=new URL(route.request().url()).searchParams.get('subjectId');
  if(subject==='tieng-anh'){started();await pending;}
  await route.fulfill({json:{data:[{id:subject,name:'Bài của '+subject,grade:1,questionCount:50}]}});
 });
 await page.goto('/pages/student/practice/');
 await expect(page.locator('#topic-list')).toContainText('Bài của toan');
 await page.locator('[data-subject=tieng-anh]').click();await englishStarted;
 await page.locator('[data-subject=tieng-viet]').click();
 await expect(page.locator('#topic-list')).toContainText('Bài của tieng-viet');
 const response=page.waitForResponse(r=>r.url().includes('/catalog/topics?subjectId=tieng-anh'));
 release();await response;
 // Let the late response's JS handler complete before checking the list.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('#topic-list')).toContainText('Bài của tieng-viet');
 await expect(page.locator('[data-subject=tieng-viet]')).toHaveAttribute('aria-selected','true');
});

test.beforeEach(async({page},testInfo)=>{
 await page.addInitScript(course=>localStorage.setItem('ttnava-course',course),testInfo.title.startsWith('primary ')?'grade-1':'hsk-1');
 await page.route('**/pages/student/chinese/**',async route=>{
  const filename=route.request().resourceType()==='document'?'index.html':new URL(route.request().url()).pathname.split('/').pop();
  if(!['index.html','script.js','style.css','playful.css','learning-tools.js','history-view.js'].includes(filename))return route.continue();
  const contentType=filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':'text/html';
  await route.fulfill({contentType,body:await fs.readFile('frontend/pages/student/chinese/'+filename,'utf8')});
 });
 await page.route('**/api/v1/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  let data={};
  if(pathname.endsWith('/auth/me'))data={profile:{id:'student',role:'student',displayName:'Bạn nhỏ',avatarKey:'meo',grade:3}};
  else if(pathname.endsWith('/diamonds/summary'))data={total:3,week:1,month:3};
  else if(pathname.endsWith('/history'))data=[];
  else if(pathname.endsWith('/tests'))data=[];
  else if(pathname.endsWith('/courses/hsk-1/access'))data={id:'hsk-1',kind:'chinese',level:1};
  else if(pathname.endsWith('/catalog/topics'))data=[];
  else if(pathname.endsWith('/catalog'))data=catalog;
  else if(pathname.endsWith('/attempts/sample'))data=attempt;
  else if(pathname.endsWith('/sets/sample'))data={set:catalog.sets[0],progress:null,items:[{id:'one',kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'Xin chào'}},{id:'two',kind:'vocabulary',data:{hanzi:'朋友',meaning:'Bạn bè'}}]};
  await route.fulfill({json:{data}});
 });
});

test('Chinese results show readable resume and completed cards',async({page})=>{
 await page.route('**/api/v1/chinese/history',async route=>route.fulfill({json:{data:[
  {id:'active',set_id:'sample',started_at:'2026-11-01T03:00:00Z',finished_at:null},
  {id:'finished',set_id:'sample',started_at:'2026-10-30T03:00:00Z',finished_at:'2026-10-30T03:10:00Z',score:90,diamonds_delta:1},
 ]}}));
 await page.goto('/pages/student/chinese/?view=history');
 await expect(page.getByRole('heading',{name:'Tiếp tục học',exact:true})).toBeVisible();
 await expect(page.locator('.chinese-history-row')).toHaveCount(2);
 await expect(page.locator('.history-score strong')).toHaveText('90');
 await expect(page.locator('.history-reward')).toHaveText('+1 💎');
 await expect(page.getByRole('link',{name:'Xem kết quả',exact:true})).toHaveAttribute('href',/attempt=finished/);
 await expect(page.locator('#notice')).toBeEmpty();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const [entry,view] of [['practice','practice'],['exam','tests']]) {
 test(`Chinese ${entry} opens its Chinese content without an invalid grade request`,async({page})=>{
  await page.route(`**/pages/student/${entry}/`,async route=>route.fulfill({contentType:'text/html',body:await fs.readFile(`frontend/pages/student/${entry}/index.html`,'utf8')}));
  await page.route('**/api/v1/auth/me',async route=>route.fulfill({json:{data:{profile:{id:'student',role:'student',displayName:'Bạn nhỏ',avatarKey:'meo',grade:null}}}}));
  const requests=[];page.on('request',r=>{if(r.url().includes('/catalog/topics'))requests.push(r.url());});
  await page.goto(`/pages/student/${entry}/`);
  await expect(page).toHaveURL(entry==='practice'?/\/chinese\/$/:new RegExp('view='+view));
  if(entry==='practice')await expect(page.locator('.lesson-island')).toHaveCount(1);
  else await expect(page.locator('#content')).toContainText('Chưa có bài kiểm tra');
  expect(requests).toEqual([]);
  await expect(page.getByRole('link',{name:'Luyện tập',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:entry==='practice'?'Tiếng Trung':'Thi thử',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.locator('#notice')).toBeEmpty();
 });
}

test('Chinese students can open home and use their own learning shortcuts',async({page})=>{
 await page.route('**/pages/student/home/',async route=>route.fulfill({contentType:'text/html',body:await fs.readFile('frontend/pages/student/home/index.html','utf8')}));
 await page.route('**/api/v1/auth/me',async route=>route.fulfill({json:{data:{profile:{id:'student',role:'student',displayName:'Bạn nhỏ',avatarKey:'meo',grade:null}}}}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/pages/student/home/');
 await expect(page.locator('#greeting')).toContainText('Bạn nhỏ');
 await expect(page.locator('#recent-activity')).toContainText('Mình bắt đầu học nhé!');
 await expect(page).toHaveURL(/\/student\/home\/$/);
 await expect(page.locator('.subject-grid')).toContainText('Bài học HSK');
 await expect(page.locator('.subject-grid')).not.toContainText('Toán');
 await expect(page.locator('#diamond-total')).toHaveText('3');
 await page.getByRole('link',{name:'Trang chủ',exact:true}).click();
 await expect(page.locator('#grade-line')).toContainText('Góc học Tiếng Trung');
 await expect(page).toHaveURL(/\/student\/home\/$/);
 await page.locator('.subject-card').filter({hasText:'Sổ từ của con'}).click();
 await expect(page).toHaveURL(/view=notebook/);
 expect(errors).toEqual([]);
});

test('student colors and layout are ready before account loading finishes',async({page})=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/v1/auth/me',async route=>{await gate;await route.fallback();});
 await page.goto('/pages/student/chinese/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).toHaveAttribute('data-role','student');
 const before=await page.locator('body').evaluate(e=>({color:getComputedStyle(e).backgroundColor,left:getComputedStyle(e).paddingLeft}));
 release();
 await expect(page.locator('.chinese-welcome')).toBeVisible();
 await expect(page.locator('.lesson-heading h2')).toHaveText('Xin chào');
 await expect(page.locator('.lesson-island .learn-document')).toBeVisible();
 await expect(page.locator('#notice')).toBeEmpty();
 expect(await page.locator('body').evaluate(e=>({color:getComputedStyle(e).backgroundColor,left:getComputedStyle(e).paddingLeft}))).toEqual(before);
});

test('HSK selection stays in the purchased course after reload',async({page})=>{
 await page.goto('/pages/student/chinese/');
 await expect(page.locator('.chinese-level-picker select')).toBeVisible();
 await page.evaluate(()=>{window.studentDocumentMarker='same-document';});
 await page.locator('.chinese-level-picker select').selectOption('1');
 await expect(page.locator('#content')).toContainText('Xin chào');
 expect(await page.evaluate(()=>window.studentDocumentMarker)).toBe('same-document');
 await page.reload();
 await expect(page.locator('.chinese-level-picker select')).toHaveValue('1');
});

test('flashcards retain their palette and keyboard focus when flipped',async({page})=>{
 await page.goto('/pages/student/chinese/?set=sample');
 const face=page.locator('.flashcard');
 await expect(face).toContainText('你好');
 const background=await face.evaluate(e=>getComputedStyle(e).backgroundImage);
 await face.focus();await page.keyboard.press('Enter');
 await expect(face).toHaveAttribute('aria-pressed','true');
 await expect(face).toBeFocused();
 expect(await face.evaluate(e=>getComputedStyle(e).backgroundImage)).toBe(background);
 const next=page.getByRole('button',{name:'Tiếp →',exact:true});
 await next.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.card-count')).toHaveText('Thẻ 2 / 2');
 await expect(next).toBeFocused();
 await face.hover();
 expect(await face.evaluate(e=>getComputedStyle(e).backgroundImage)).toBe(background);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('ordering quiz hides used words and restores them on reset',async({page})=>{
 await page.goto('/pages/student/chinese/?attempt=sample');
 const word=page.getByRole('button',{name:'你好',exact:true});
 await word.click();
 await expect(word).toBeHidden();
 await expect(page.locator('.quiz-choices>p')).toHaveText('你好');
 await page.getByRole('button',{name:'Chọn lại',exact:true}).click();
 await expect(word).toBeVisible();
 await expect(page.locator('.quiz-choices>p')).toHaveText('');
});
