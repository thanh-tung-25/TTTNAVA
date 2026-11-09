import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
let server,origin;
test.beforeAll(async()=>{const root=path.resolve('frontend');server=createServer(async(req,res)=>{let p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(p.endsWith(path.sep))p+='index.html';else if(!path.extname(p))p=path.join(p,'index.html');if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;});
test.afterAll(async()=>new Promise(r=>server.close(r)));
async function mock(page){
 const lesson={id:'lesson-1',level_id:1,title:'Bài 1. Xin chào',status:'published'},set={id:'set-1',lesson_id:lesson.id,level_id:1,title:'Bộ bài 1',lesson_title:lesson.title,activity_count:0};
 const words=[{id:'word-1',set_id:set.id,kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'Xin chào'}},{id:'word-2',set_id:set.id,kind:'vocabulary',data:{hanzi:'谢谢',pinyin:'xiè xie',meaning:'Cảm ơn'}}];
 const questions=Array.from({length:20},(_,n)=>({id:'q-'+n,set_id:set.id,kind:'question',data:{type:'choice',prompt:'Câu hỏi '+(n+1),options:['Đúng','Sai']}}));
 let attempt={id:'attempt-1',set_id:set.id,title:'Quiz 20 câu',items:structuredClone(questions)},reports=[];const requests=[];
 await page.addInitScript(()=>{localStorage.setItem('ttnava-course','hsk-1');window.__spoken=[];Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'vi-VN'},{lang:'zh-CN'}],cancel:()=>{},speak:u=>window.__spoken.push(u.text)}});});
 await page.route('**/api/v1/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname;let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'hub-user',role:'student',displayName:'An',grade:null}};
  else if(p.endsWith('/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'HSK1',unlocked:true};
  else if(p.endsWith('/diamonds/summary'))data={total:0};
  else if(p.includes('/chat/'))data=[];
  else if(p.endsWith('/chinese/catalog'))data={levels:[{id:1,title:'HSK1'}],lessons:[lesson],sets:[set],counts:[{set_id:set.id,kind:'vocabulary',total:2},{set_id:set.id,kind:'question',total:20}],reviews:[],progress:[],completion:[]};
  else if(p.endsWith('/quiz-plan'))data={total:20,review_count:0,blocks:[{block:0,from:1,to:20,questions}]};
  else if(p.endsWith('/chinese/sets/set-1'))data={set,items:[...words,...questions],activities:null,progress:null};
  else if(p.endsWith('/chinese/attempts')&&req.method()==='POST'){requests.push(req.postDataJSON());data=attempt;}
  else if(p.endsWith('/answers')){const b=req.postDataJSON(),item=attempt.items.find(i=>i.id===b.item_id);item.selection=b.value;if(b.lock)item.result={locked:true,value:b.value,correct:b.value==='Đúng',accepted:['Đúng'],explanation:'Lời giải'};data=attempt;}
  else if(p.endsWith('/chinese/attempts/attempt-1'))data=attempt;
  else if(p.endsWith('/feedback')){if(req.method()==='POST'){reports.push({id:'feedback-1',...req.postDataJSON(),status:'open',created_at:new Date().toISOString()});data={id:'feedback-1'};}else data=reports;}
  else if(p.endsWith('/learning/week'))data={days:2,completed:3,target:3};
  else if(p.endsWith('/learning/search'))data=[{title:'你好 · nǐ hǎo · Xin chào',detail:'Bài 1',href:'/pages/student/chinese/?set=set-1&mode=words'}];
  else if(p.endsWith('/learning/wrong'))data=[{id:'q-1',title:'Câu từng sai',explanation:'Giải thích',answer:'Đúng',href:'/pages/student/chinese/?attempt=attempt-1',set_id:set.id}];
  else if(p.endsWith('/learning/goal'))data=req.postDataJSON();
  await route.fulfill({json:{data}});
 });return {requests,reports};
}
test('word table has three columns, filters pinyin, plays only on click, and listening waits for a click',async({page})=>{
 await mock(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/pages/student/chinese/?set=set-1&mode=words');
 await expect(page.locator('.hub-table th')).toHaveCount(3);await expect(page.locator('.hub-table tbody tr')).toHaveCount(2);expect(await page.evaluate(()=>window.__spoken)).toEqual([]);
 await page.getByRole('searchbox',{name:'Tìm từ trong bài'}).fill('ni hao');await expect(page.locator('.hub-table tbody tr')).toHaveCount(1);
 await page.getByRole('button',{name:'Nghe 你好',exact:true}).click();expect(await page.evaluate(()=>window.__spoken.at(-1))).toBe('你好');
 await page.goto(origin+'/pages/student/chinese/?set=set-1&mode=listen');await expect(page.getByRole('button',{name:'Nghe từ tiếng Trung',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__spoken)).toEqual([]);
 await page.getByRole('button',{name:'Nghe từ tiếng Trung',exact:true}).click();expect((await page.evaluate(()=>window.__spoken)).length).toBe(1);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('quiz previews its section, revisits locked answers, and keeps an ungraded answer when going back',async({page})=>{
 const state=await mock(page);await page.goto(origin+'/pages/student/chinese/');await page.getByRole('button',{name:'Quiz 20 câu',exact:true}).click();await expect(page.getByRole('dialog',{name:'Chọn nội dung quiz'})).toBeVisible();
 await page.getByRole('button',{name:'Bắt đầu / tiếp tục 20 câu'}).click();await expect(page.locator('.quiz-position')).toHaveText('Câu 1 / 20');expect(state.requests[0].selection).toBe('sequential');
 await page.getByRole('radio',{name:/Đúng/}).check();await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await page.getByRole('button',{name:'Câu tiếp theo →'}).click();
 await page.getByRole('radio',{name:/Sai/}).check();await page.getByRole('button',{name:'← Câu trước',exact:true}).click();await expect(page.locator('#content')).toContainText('Con đã trả lời: Đúng');
 await page.getByRole('button',{name:'Về câu đang làm →'}).click();await expect(page.getByRole('radio',{name:/Sai/})).toBeChecked();await expect(page.getByRole('button',{name:'Câu 3 · Chưa làm',exact:true})).toBeDisabled();
});
test('contextual feedback is categorized and its history is readable; hub search, wrong questions and goals work',async({page})=>{
 const state=await mock(page);await page.goto(origin+'/pages/student/chinese/?attempt=attempt-1');await page.getByRole('button',{name:'Phản ánh câu này',exact:true}).click();
 await page.getByRole('combobox',{name:'Loại phản ánh'}).selectOption('answer');await page.getByRole('textbox',{name:'Mô tả vấn đề'}).fill('Đáp án của câu này cần kiểm tra lại.');await page.getByRole('button',{name:'Gửi phản ánh',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Đã gửi.');expect(state.reports[0].context_text).toBe('Câu hỏi 1');expect(state.reports[0].category).toBe('answer');
 await page.getByRole('button',{name:'Phản ánh của tôi'}).click();await expect(page.getByRole('dialog')).toContainText('Đã tiếp nhận');await page.getByRole('button',{name:'Đóng',exact:true}).last().click();
 await page.goto(origin+'/pages/student/study-hub/');await page.getByRole('searchbox',{name:'Tìm nội dung',exact:true}).fill('ni hao');await page.getByRole('button',{name:'Tìm',exact:true}).click();await expect(page.locator('#hub-content')).toContainText('你好');
 await page.goto(origin+'/pages/student/study-hub/?view=wrong');await expect(page.locator('#hub-content')).toContainText('Câu từng sai');await expect(page.getByRole('textbox',{name:'Tự thử lại'})).toBeVisible();
 await page.goto(origin+'/pages/student/study-hub/?view=goals');await page.getByRole('combobox',{name:'Mục tiêu số ngày'}).selectOption('2');await expect(page.locator('#hub-notice')).toContainText('Đã lưu');await expect(page.locator('.hub-badge')).toBeVisible();
});
test('administrators can filter feedback and save a reply from the management page',async({page})=>{
 let report={id:'report-1',category:'audio',status:'open',message:'Không nghe được câu hỏi',display_name:'An',page_url:'/pages/student/chinese/',context_text:'你好',created_at:new Date().toISOString(),reply:''};
 await page.route('**/api/v1/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname;let data={};if(p.endsWith('/auth/me'))data={profile:{id:'admin-1',role:'admin',adminScope:'chinese',displayName:'Admin'}};else if(p.endsWith('/feedback'))data=[report];else if(p.endsWith('/feedback/report-1')){report={...report,...req.postDataJSON()};data=report;}else if(p.includes('/chat/'))data=[];await route.fulfill({json:{data}});});
 await page.goto(origin+'/pages/admin/feedback/');await expect(page.locator('#feedback-list')).toContainText('Không nghe được');
 await page.getByRole('combobox',{name:'Trạng thái xử lý'}).selectOption('reviewing');await page.getByRole('textbox',{name:'Phản hồi cho người gửi'}).fill('Đang kiểm tra âm thanh');await page.getByRole('button',{name:'Lưu phản hồi'}).click();await expect(page.locator('#feedback-notice')).toContainText('Đã lưu');expect(report.reply).toBe('Đang kiểm tra âm thanh');
 await page.locator('#feedback-filter').selectOption('resolved');await expect(page.locator('#feedback-list')).toContainText('Chưa có phản ánh');
});
test('animal journey groups four stages, locks future stops and stays usable on mobile',async({page})=>{
 await mock(page);
 const blocks=Array.from({length:9},(_,block)=>({block,from:block*20+1,to:block*20+20,completed:block===0,score:block===0?85:null,unlocked:block<=1,questions:Array.from({length:20},(_,n)=>({id:'part-'+block+'-q-'+n,data:{prompt:'Câu xem trước '+(n+1)}}))}));
 await page.route('**/api/v1/chinese/sets/set-1/quiz-plan',r=>r.fulfill({json:{data:{total:180,review_count:20,active:null,blocks}}}));
 await page.goto(origin+'/pages/student/chinese/');await page.getByRole('button',{name:'Quiz 20 câu',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Chọn nội dung quiz'});await expect(dialog.locator('select')).toHaveCount(0);await expect(dialog.locator('.journey-island')).toHaveCount(3);await expect(dialog.locator('.journey-island').first().locator('.journey-stage')).toHaveCount(4);await expect(dialog.locator('.journey-island').last().locator('.journey-stage')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Chặng 1 · Đã hoàn thành',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Chặng 2 · Sẵn sàng khám phá',exact:true})).toHaveAttribute('aria-current','true');await expect(page.getByRole('button',{name:'Chặng 3 · Chưa mở',exact:true})).toBeDisabled();await expect(dialog).toContainText('85/100');
 await page.screenshot({path:'test-results/chinese-animal-journey-desktop.png'});
 await page.setViewportSize({width:390,height:844});await expect(dialog.locator('.journey-go')).toBeInViewport();expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);await page.screenshot({path:'test-results/chinese-animal-journey-mobile.png'});
 await page.setViewportSize({width:320,height:568});await expect(dialog.locator('.journey-go')).toBeInViewport();expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.getByRole('button',{name:'Ôn điều đã học',exact:true}).click();await expect(dialog.locator('.journey-detail')).toContainText('Con đã làm 20 câu');await expect(dialog.locator('.journey-go')).toBeEnabled();
 await page.getByRole('button',{name:'Khám phá cùng bạn nhỏ',exact:true}).click();await page.getByRole('button',{name:'Chặng 1 · Đã hoàn thành',exact:true}).click();await expect(dialog.locator('.journey-detail')).toContainText('Cùng Gấu trúc · Chặng 1');
 await page.getByRole('button',{name:'Đóng bản đồ'}).click();await page.getByRole('button',{name:'Quiz 20 câu',exact:true}).click();await expect(page.getByRole('button',{name:'Chặng 2 · Sẵn sàng khám phá',exact:true})).toHaveAttribute('aria-current','true');
});
test('primary subjects, worksheets and exam catalogs share animal groups without mobile overflow',async({page})=>{
 await mock(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/api/v1/auth/me',r=>r.fulfill({json:{data:{profile:{id:'primary-user',role:'student',grade:3,displayName:'An'}}}}));
 await page.route('**/api/v1/courses/*/access',r=>r.fulfill({json:{data:{id:'grade-3',kind:'primary',level:3,title:'Lớp 3',unlocked:true}}}));
 const topics=Array.from({length:8},(_,n)=>({id:'topic-'+n,name:'Bài học '+(n+1)+' cùng những người bạn',questionCount:n===7?0:30,grade:3}));
 await page.route('**/api/v1/catalog/topics**',r=>r.fulfill({json:{data:topics}}));
 await page.route('**/api/v1/exams/catalog**',r=>r.fulfill({json:{data:{year:{id:'year'},chapters:topics.map(t=>({...t,semester:'hk1',count:20,durationSeconds:600})),semesters:[],annual:{questionCount:30,count:20,durationSeconds:600}}}}));
 await page.route('**/api/v1/worksheets',r=>r.fulfill({json:{data:topics.map((t,n)=>({id:'sheet-'+n,title:t.name,item_count:10,subject_id:'toan',semester:'hk1',chapter_id:'chapter',chapter_name:'Chủ đề 1'}))}}));
 await page.route('**/api/v1/worksheets/history',r=>r.fulfill({json:{data:[]}}));
 await page.route('**/api/v1/worksheets/sheet-0/start',r=>r.fulfill({json:{data:{id:'ws-1',title:'Bộ bài 1',status:'in_progress',subject_id:'toan',items:[{id:'item-1',type:'choice',prompt:'Chọn số một',config:{options:['Một','Hai']}}],answers:{}}}}));
 for(const screen of ['practice','exam','worksheets']){
  await page.goto(origin+'/pages/student/'+screen+'/');await expect(page.locator('.animal-zone')).toHaveCount(2);await expect(page.locator('.animal-zone').first().locator('.animal-path-stop')).toHaveCount(4);
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'test-results/unified-'+screen+'-desktop.png',animations:'disabled'});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,12));expect(overflow).toEqual([]);}
  if(screen==='practice'){for(const label of ['Tiếng Việt','Tiếng Anh']){await page.getByRole('tab',{name:new RegExp(label)}).click();await expect(page.locator('.animal-zone')).toHaveCount(2);}await expect(page.getByRole('button',{name:/Chưa đủ câu:/})).toBeDisabled();}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/unified-'+screen+'-mobile.png'});
 }
 await page.locator('.animal-path-stop').first().getByRole('button',{name:'Bắt đầu',exact:true}).click();await expect(page.locator('.worksheet-question')).toBeVisible();await expect(page.locator('.topbar-user .chat-launcher')).toBeVisible();expect(await page.locator('.chat-launcher').evaluate(n=>getComputedStyle(n).position)).toBe('static');await page.locator('.chat-launcher').click();await expect(page.locator('.chat-panel')).toBeVisible();expect(await page.locator('.chat-panel').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})).toBe(true);await page.locator('.chat-panel').getByRole('button',{name:/^\u0110\u00f3ng$/}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
