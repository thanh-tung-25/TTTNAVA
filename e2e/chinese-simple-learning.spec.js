import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
let server,origin;
const lesson={id:'lesson',level_id:1,title:'Bài 1. Xin chào'};
const set={id:'sample',lesson_id:'lesson',level_id:1,lesson_title:lesson.title,title:'Tài liệu bài 1',speaking_count:3,activity_count:3};
const course={id:'hsk-1',kind:'chinese',level:1,title:'Tiếng Trung HSK 1',unlocked:true};
const lessons=[lesson,...Array.from({length:9},(_,i)=>({id:'lesson-'+(i+2),level_id:1,title:'Bài '+(i+2)+'. Chủ đề '+(i+2)}))];
const catalog={levels:[{id:1,title:'HSK 1'},{id:2,title:'HSK 2'}],lessons:[...lessons,{id:'other',level_id:2,title:'Bài của HSK 2'}],sets:[set,{id:'short',lesson_id:'lesson-2',level_id:1,title:'Chỉ có câu hỏi'},{id:'words-only',lesson_id:'lesson-3',level_id:1,title:'Chỉ có từ vựng'},{id:'speaking-only',lesson_id:'lesson-4',level_id:1,title:'Chỉ có luyện nói'},{...set,id:'other',lesson_id:'other',level_id:2}],counts:[{set_id:'sample',kind:'vocabulary',total:2},{set_id:'sample',kind:'question',total:60},{set_id:'sample',kind:'grammar',total:1},{set_id:'sample',kind:'dialogue',total:3,speaking_total:3},{set_id:'short',kind:'question',total:10},{set_id:'words-only',kind:'vocabulary',total:2},{set_id:'speaking-only',kind:'dialogue',total:3,speaking_total:3},{set_id:'other',kind:'question',total:20}],reviews:[],progress:[],completion:[]};
const items=[{id:'word',kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'Xin chào'}},...['你叫什么名字？','你好吗？','你是哪国人？'].map((text,i)=>({id:'spoken-'+i,kind:'dialogue',data:{practice:'speaking',text}}))];
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
async function mock(page){
 const state={active:null,created:[],fail:false,finished:false,courses:[course],selectedCourse:course,rankingRequests:[],rankingFail:false,rankings:{week:[],month:[],all:[]},errors:[]};page.on('pageerror',e=>state.errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ttnava-course','hsk-1'));
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'student',role:'student',displayName:'Ngọc Anh',username:'ngoc_anh',avatarKey:'meo',grade:null}};
  else if(p.endsWith('/access'))data=state.selectedCourse;
  else if(p.endsWith('/diamonds/summary'))data={total:3};
  else if(p.endsWith('/diamonds/leaderboard')){
   const params=Object.fromEntries(new URL(req.url()).searchParams);state.rankingRequests.push(params);
   if(state.rankingFail){state.rankingFail=false;return route.fulfill({status:503,json:{error:{message:'Chưa tải được xếp hạng.'}}});}
   data=state.rankings[params.range];
  }
  else if(p.endsWith('/experience/preferences'))data={font_scale:'normal',effects_enabled:0};
  else if(p.includes('/chat/'))data=[];
  else if(p.endsWith('/chinese/catalog'))data=catalog;
  else if(p.endsWith('/sets/sample/quiz-plan')){
   if(state.fail){state.fail=false;return route.fulfill({status:503,json:{error:{message:'Chưa tải được bài. Bạn thử lại nhé.'}}});}
   data={active:state.active,total:60,review_count:20,blocks:[{block:0,completed:true,unlocked:true},{block:1,completed:false,unlocked:true},{block:2,completed:false,unlocked:false}].map(b=>({...b,from:b.block*20+1,to:b.block*20+20,questions:Array.from({length:20},(_,n)=>({id:'q-'+n,data:{prompt:'Câu hỏi '+(n+1)}}))}))};
  }else if(p.endsWith('/chinese/attempts')&&req.method()==='POST'){const body=req.postDataJSON();state.created.push(body);data={id:state.active&&body.block===state.active.block?state.active.id:'new-attempt'};}
  else if(p.includes('/chinese/attempts/'))data={id:p.split('/').at(-1),set_id:'sample',title:lesson.title,...(state.finished?{started_at:'2026-11-13T01:00:00Z',finished_at:'2026-11-13T01:01:00Z',score:100}:{}),items:[{id:'q',data:{type:'choice',prompt:'你好 nghĩa là gì?',options:['Xin chào','Tạm biệt']},...(state.finished?{result:{correct:true,value:'Xin chào',accepted:['Xin chào'],explanation:''}}:{})}]};
  else if(p.endsWith('/sets/sample'))data={set,items,progress:null,activities:null};
  else if(p.endsWith('/speaking/availability'))data={configured:false,reason:'Chưa bật chấm AI.'};
  else if(p.endsWith('/courses'))data=state.courses;
  else if(p.endsWith('/courses/orders'))data=[];
  else if(p.endsWith('/chinese/notebook')||p.endsWith('/chinese/history')||p.endsWith('/chinese/tests'))data=[];
  await route.fulfill({json:{data}});
 });return state;
}
const open=page=>page.goto(origin+'/pages/student/chinese/');
const fits=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

const firstLesson=page=>page.locator('[data-set="sample"]');
async function openGroup(scope,name){
 const button=scope.locator('.chinese-lesson-primary').getByRole('button',{name,exact:true});
 if(await button.getAttribute('aria-expanded')!=='true')await button.click();
 return scope.getByRole('navigation',{name:'Chức năng con: '+name,exact:true});
}
async function openQuiz(page){const group=await openGroup(firstLesson(page),'Bài tập');await group.getByRole('button',{name:'Quiz 20 câu',exact:true}).click();}
test('HSK 1 shows all ten lessons and nests the original tools under three parent groups',async({page},info)=>{
 const state=await mock(page);await open(page);
 await expect(page.getByRole('heading',{name:'Bài học HSK 1',exact:true})).toBeVisible();
 await expect(page.locator('.chinese-lesson-row')).toHaveCount(10);
 for(const title of lessons.map(l=>l.title))await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 const first=firstLesson(page);
 await expect(first.locator('.chinese-lesson-primary .btn')).toHaveCount(3);
 for(const name of ['Bài tập','Nhận mặt chữ','Luyện nói với AI'])await expect(first.getByRole('button',{name,exact:true})).toBeEnabled();
 await expect(first.getByRole('link',{name:'Từ mới',exact:true})).toBeHidden();
 await expect(first.getByRole('link',{name:'Giao tiếp với AI',exact:true})).toBeHidden();
 await fits(page);await page.screenshot({path:'test-results/chinese-lessons-'+info.project.name+'.png'});
 const initial=page.url(),groups=[
  ['Bài tập',['Quiz 20 câu'],['Luyện nghe','Luyện vận dụng','Bài đọc']],
  ['Nhận mặt chữ',[],['Thẻ lật','Từ mới']],
  ['Luyện nói với AI',[],['Luyện nói theo bài','Giao tiếp với AI','Phố tiếng Trung']],
 ];
 for(const [name,buttons,links]of groups){
  const panel=await openGroup(first,name);
  for(const label of buttons)await expect(panel.getByRole('button',{name:label,exact:true})).toBeVisible();
  for(const label of links)await expect(panel.getByRole('link',{name:label,exact:true})).toBeVisible();
  await expect(panel.getByRole('button')).toHaveCount(buttons.length);await expect(panel.getByRole('link')).toHaveCount(links.length);
  await expect(first.locator('.chinese-lesson-tools:not([hidden])')).toHaveCount(1);
  await expect(page.locator('#lesson-lesson-2 .chinese-lesson-tools:not([hidden])')).toHaveCount(0);
  expect(page.url()).toBe(initial);expect(state.created).toHaveLength(0);await fits(page);
 }
 await page.screenshot({path:'test-results/chinese-lesson-speaking-'+info.project.name+'.png'});
 await first.getByRole('button',{name:'Luyện nói với AI',exact:true}).click();
 await expect(first.locator('.chinese-lesson-tools:not([hidden])')).toHaveCount(0);
 await expect(page.locator('.chinese-course-tools')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Sổ từ',exact:true})).toBeHidden();
 await page.locator('.student-account summary').click();
 for(const name of ['Sổ từ','Kết quả học tập','Bài kiểm tra','Bài được giao'])await expect(page.getByRole('navigation',{name:'Tiện ích học tập'}).getByRole('link',{name,exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 for(const name of ['Khóa học','Bài học','Thử sức','Xếp hạng','Cá nhân'])await expect(page.locator('.student-primary-nav').getByRole('link',{name,exact:true})).toBeVisible();
 await expect(page.locator('.student-primary-nav')).toHaveAttribute('data-count','5');
 await expect(page.locator('.student-primary-nav').getByRole('link')).toHaveCount(5);
 await expect(page.locator('.student-primary-nav').getByRole('link',{name:'Ôn luyện',exact:true})).toHaveCount(0);
 await expect(page.locator('.chinese-level-picker,.chinese-welcome')).toHaveCount(0);
 expect(state.errors).toEqual([]);
});
test('lessons without quizzes or without any published set stay in the course list',async({page})=>{
 const state=await mock(page);await open(page);
 const short=page.locator('#lesson-lesson-2'),words=page.locator('#lesson-lesson-3'),speaking=page.locator('#lesson-lesson-4'),empty=page.locator('#lesson-lesson-10');
 const shortGroup=await openGroup(short,'Bài tập');await expect(shortGroup.getByRole('button',{name:'Quiz 20 câu',exact:true})).toBeDisabled();
 const wordGroup=await openGroup(words,'Nhận mặt chữ');await expect(wordGroup.getByRole('link',{name:'Từ mới',exact:true})).toBeVisible();
 const speakingGroup=await openGroup(speaking,'Luyện nói với AI');await expect(speakingGroup.getByRole('link',{name:'Luyện nói theo bài',exact:true})).toBeVisible();
 await expect(empty.locator('.chinese-lesson-primary .btn')).toHaveCount(3);
 await expect(empty).toContainText('đang được bổ sung');await fits(page);expect(state.errors).toEqual([]);
});
test('character cards open from their own lesson without a duplicate menu and return to the lesson list',async({page})=>{
 const state=await mock(page);await open(page);
 const panel=await openGroup(firstLesson(page),'Nhận mặt chữ');await panel.getByRole('link',{name:'Thẻ lật',exact:true}).click();
 await expect(page.locator('.flashcard')).toContainText('你好');
 await expect(page.locator('.study-modes')).toHaveCount(0);
 await page.getByRole('link',{name:'Về danh sách bài',exact:true}).click();
 await expect(page.locator('.chinese-lesson-row')).toHaveCount(10);
 await expect(firstLesson(page).getByRole('button',{name:'Nhận mặt chữ',exact:true})).toBeVisible();
 await fits(page);expect(state.errors).toEqual([]);
});
test('listening has selectable ten-word stages, keeps a partial round and handles the one-word final stage',async({page},info)=>{
 const state=await mock(page),words=Array.from({length:21},(_,n)=>({id:'listen-'+n,kind:'vocabulary',data:{hanzi:'词'+'文'.repeat(n+1),pinyin:'cí',meaning:'Nghĩa '+(n+1)}}));
 await page.addInitScript(()=>{
  window.__spoken=[];Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-CN'}],cancel:()=>{},speak:u=>{window.__spoken.push(u.text);queueMicrotask(()=>u.onend?.());}}});
 });
 await page.route('**/api/v1/chinese/sets/sample',r=>r.fulfill({json:{data:{set,items:words,progress:null,activities:null}}}));
 await page.goto(origin+'/pages/student/chinese/?set=sample&mode=listen');
 await expect(page.locator('.listening-stage')).toHaveCount(3);await expect(page.locator('.quiz-prompt')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__spoken)).toEqual([]);await fits(page);
 await page.screenshot({path:'test-results/chinese-listening-stages-'+info.project.name+'.png'});
 await page.getByRole('button',{name:'Chặng 2 · 10 từ',exact:true}).click();await page.getByRole('button',{name:'Bắt đầu chặng 2',exact:true}).click();
 await expect(page.locator('.quiz-prompt')).toHaveText('Nghe và chọn nghĩa · 1/10');expect(await page.evaluate(()=>window.__spoken)).toEqual([]);
 await page.getByRole('button',{name:'Nghe từ tiếng Trung',exact:true}).click();
 const heard=await page.evaluate(()=>window.__spoken.at(-1));expect(words.slice(10,20).map(w=>w.data.hanzi)).toContain(heard);
 await page.locator('.listening-question').getByRole('button',{name:words.find(w=>w.data.hanzi===heard).data.meaning,exact:true}).click();
 await page.getByRole('button',{name:'Câu tiếp theo',exact:true}).click();await page.getByRole('button',{name:'← Chọn chặng',exact:true}).click();
 await page.getByRole('button',{name:'Tiếp tục chặng 2',exact:true}).click();await expect(page.locator('.quiz-prompt')).toHaveText('Nghe và chọn nghĩa · 2/10');
 await page.getByRole('button',{name:'← Chọn chặng',exact:true}).click();await page.getByRole('button',{name:'Chặng 3 · 1 từ',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu chặng 3',exact:true}).click();await expect(page.locator('.quiz-prompt')).toHaveText('Nghe và chọn nghĩa · 1/1');
 await expect(page.locator('.listening-answer')).toHaveCount(4);await page.getByRole('button',{name:'Nghe từ tiếng Trung',exact:true}).click();
 expect(await page.evaluate(()=>window.__spoken.at(-1))).toBe(words[20].data.hanzi);
 await page.locator('.listening-question').getByRole('button',{name:words[20].data.meaning,exact:true}).click();await page.getByRole('button',{name:'Câu tiếp theo',exact:true}).click();
 await expect(page.locator('.listening-result')).toContainText('1/1 câu đúng');await page.getByRole('button',{name:'Về các chặng',exact:true}).click();
 await expect(page.locator('.listening-stage.is-complete')).toHaveCount(1);await fits(page);expect(state.errors).toEqual([]);
});
test('quiz preserves the stage chooser before starting, resuming and returning after completion',async({page})=>{
 const state=await mock(page);await open(page);await openQuiz(page);
 const dialog=page.getByRole('dialog',{name:'Chọn nội dung quiz'});await expect(dialog).toBeVisible();
 expect(state.created).toHaveLength(0);await expect(page).not.toHaveURL(/attempt=/);
 await expect(dialog.getByRole('button',{name:'Chặng 3 · Chưa mở',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Chặng 1 · Đã hoàn thành',exact:true}).click();
 await dialog.getByRole('button',{name:'Bắt đầu / tiếp tục 20 câu',exact:true}).click();
 await expect(page).toHaveURL(/attempt=new-attempt/);await expect(page.locator('.quiz-prompt')).toContainText('你好');
 expect(state.created).toEqual([{set_id:'sample',count:20,selection:'sequential',block:0}]);
 state.active={id:'saved-attempt',selection:'sequential',block:1};await open(page);await openQuiz(page);
 await expect(dialog).toBeVisible();await expect(dialog.locator('.journey-go')).toHaveText('Tiếp tục Chặng 2 →');expect(state.created).toHaveLength(1);
 await dialog.locator('.journey-go').click();await expect(page).toHaveURL(/attempt=saved-attempt/);expect(state.created).toHaveLength(2);
 state.finished=true;state.active=null;await page.reload();await page.getByRole('button',{name:'Về bản đồ khám phá →',exact:true}).click();
 await expect(dialog).toBeVisible();expect(state.created).toHaveLength(2);await fits(page);expect(state.errors).toEqual([]);
});
test('a failed start can be retried and the course determines the HSK level',async({page})=>{
 const state=await mock(page);state.fail=true;await page.goto(origin+'/pages/student/chinese/?level=2');
 await expect(page.getByRole('heading',{name:'Bài của HSK 2'})).toHaveCount(0);
 const panel=await openGroup(firstLesson(page),'Bài tập'),start=panel.getByRole('button',{name:'Quiz 20 câu',exact:true});await start.click();
 await expect(page.locator('#notice')).toContainText('Chưa tải được bài');await expect(start).toBeEnabled();
 await start.click();await expect(page.getByRole('dialog',{name:'Chọn nội dung quiz'})).toBeVisible();expect(state.created).toHaveLength(0);
 await page.locator('.journey-go').click();await expect(page).toHaveURL(/attempt=new-attempt/);expect(state.created).toHaveLength(1);
});
test('an outdated attempt in a locked stage cannot replace the next available stage',async({page})=>{
 const state=await mock(page);state.active={id:'stale-attempt',selection:'sequential',block:2};await open(page);await openQuiz(page);
 await expect(page.getByRole('dialog',{name:'Chọn nội dung quiz'})).toBeVisible();expect(state.created).toHaveLength(0);
 await expect(page.locator('.journey-go')).toHaveText('Bắt đầu Chặng 2 →');await page.locator('.journey-go').click();
 await expect(page).toHaveURL(/attempt=new-attempt/);expect(state.created).toEqual([{set_id:'sample',count:20,selection:'sequential',block:1}]);
});
test('speaking and free AI conversation belong to the selected lesson',async({page})=>{
 const state=await mock(page);await open(page);const panel=await openGroup(firstLesson(page),'Luyện nói với AI');
 await expect(panel.getByRole('link',{name:'Giao tiếp với AI',exact:true})).toHaveAttribute('href',/lesson=lesson/);
 await expect(panel.getByRole('link',{name:'Phố tiếng Trung',exact:true})).toHaveAttribute('href',/lesson=lesson/);
 await panel.getByRole('link',{name:'Luyện nói theo bài',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Nghe câu hỏi, ghi âm trả lời'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Bật micro',exact:true})).toBeVisible();await fits(page);expect(state.errors).toEqual([]);
});
test('home and learning aliases open all course lessons and old category URLs do not hide lessons',async({page})=>{
 const state=await mock(page);
 for(const entry of ['home','learning']){await page.goto(origin+'/pages/student/'+entry+'/');await expect(page).toHaveURL(/\/student\/chinese\/$/);await expect(page.locator('.chinese-lesson-row')).toHaveCount(10);}
 for(const view of ['exercises','characters','speaking']){await page.goto(origin+'/pages/student/chinese/?view='+view);await expect(page.locator('.chinese-lesson-row')).toHaveCount(10);}
 expect(state.errors).toEqual([]);
});
test('choosing HSK 1 opens the ten lessons directly and the course chooser remains available',async({page})=>{
 const state=await mock(page),destinations=[];page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())destinations.push(new URL(r.url()).pathname);});
 await page.goto(origin+'/pages/student/courses/?program=chinese');await expect(page.locator('.course-tile')).toHaveCount(1);
 await page.locator('.course-tile').getByRole('button',{name:'Vào học',exact:true}).click();
 await expect(page).toHaveURL(/\/student\/chinese\/$/);await expect(page.locator('.chinese-lesson-row')).toHaveCount(10);
 expect(destinations).not.toContain('/pages/student/learning/');
 await page.locator('.chinese-course-back').click();await expect(page.locator('.course-tile')).toHaveCount(1);
 state.courses.push({...course,id:'hsk-2',level:2,title:'HSK 2'});await page.goto(origin+'/pages/student/courses/');await expect(page.locator('.course-tile')).toHaveCount(2);
 await expect(page).toHaveURL(/\/student\/courses\/$/);expect(state.errors).toEqual([]);
});

test('Chinese diamond ranking opens from navigation and handles time ranges retry and empty states',async({page},info)=>{
 const state=await mock(page),friend={rank:1,profileId:'friend',displayName:'Mai Anh',avatarKey:'tho',grade:null,diamonds:12},me={rank:2,profileId:'student',displayName:'Ngọc Anh',avatarKey:'meo',grade:3,diamonds:8};
 state.rankings.week=[friend,me];state.rankings.month=[{...me,rank:1,diamonds:20},{...friend,rank:2}];
 await open(page);await page.locator('.student-primary-nav').getByRole('link',{name:'Xếp hạng',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Đua kim cương Tiếng Trung'})).toBeVisible();await expect(page.locator('.student-primary-nav').getByRole('link',{name:'Xếp hạng',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.locator('#ranking-filters')).toBeHidden();await expect(page.locator('.rank-row')).toHaveCount(2);await expect(page.locator('#my-ranking')).toContainText('hạng #2');await expect(page.locator('.rank-row.is-me')).toContainText('Ngọc Anh (bạn)');
 await expect(page.locator('#rank-list')).not.toContainText('Lớp 0');await expect(page.locator('#rank-list')).not.toContainText('Lớp 3');
 expect(state.rankingRequests.at(-1)).toMatchObject({program:'chinese',range:'week'});expect(state.rankingRequests.at(-1)).not.toHaveProperty('grade');
 if(info.project.name.startsWith('mobile')){
  const viewport=page.viewportSize();
  await page.setViewportSize({width:320,height:680});const bounds=await page.locator('.student-primary-nav .nav-link').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width};}));
  expect(bounds).toHaveLength(5);expect(bounds.every(r=>r.left>=0&&r.right<=320&&r.width>=44&&Math.abs(r.top-bounds[0].top)<1)).toBe(true);
  await expect(page.locator('.rank-row').first()).toBeInViewport();await page.setViewportSize(viewport);
 }
 await fits(page);await page.screenshot({path:'test-results/chinese-ranking-'+info.project.name+'.png'});
 await page.locator('[data-range=month]').click();await expect(page.locator('#my-ranking')).toContainText('hạng #1');await expect(page.locator('.rank-row.is-me .rank-diamonds')).toContainText('20');
 state.rankingFail=true;await page.locator('[data-range=week]').click();await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.locator('#my-ranking')).toContainText('hạng #2');
 await page.locator('[data-range=all]').click();await expect(page.locator('.rank-row')).toHaveCount(0);await expect(page.locator('#rank-list')).toContainText('Chưa có ai trên bảng');
 expect(state.rankingRequests.every(r=>r.program==='chinese')).toBe(true);expect(state.created).toHaveLength(0);expect(state.errors).toEqual([]);
});

test('non-Chinese courses keep four navigation items and the general leaderboard grade filter',async({page})=>{
 const state=await mock(page);state.selectedCourse={id:'grade-3',kind:'primary',level:3,title:'Lớp 3'};state.rankings.week=[{rank:1,profileId:'student',displayName:'Ngọc Anh',avatarKey:'meo',grade:3,diamonds:20}];
 await page.goto(origin+'/pages/student/leaderboard/');await expect(page.locator('.rank-row')).toHaveCount(1);await expect(page.locator('.student-primary-nav .nav-link')).toHaveCount(4);await expect(page.locator('#grade-filter')).toBeVisible();
 await page.locator('#grade-filter').selectOption('3');await expect.poll(()=>state.rankingRequests.at(-1)?.grade).toBe('3');expect(state.rankingRequests.every(r=>!r.program)).toBe(true);expect(state.errors).toEqual([]);
});
