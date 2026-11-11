import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {activityTemplate} from '../frontend/assets/js/chinese-activity-templates.js';

let server,origin;
const titles=['你好','你叫什么名字','很高兴认识你','你去哪儿','你要吃什么','你在哪儿工作'];
test.beforeAll(async()=>{
 const root=path.resolve('frontend');
 server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');let target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(url.pathname.endsWith('/'))target=path.join(target,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const file=await readFile(target);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');res.end(file);}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
async function mock(page,lesson=0,level=1,title=titles[lesson],savedActivities){
 await page.route('**/assets/js/ui-core.js',r=>r.fulfill({contentType:'text/javascript',body:'export async function initPage(){return {course:{kind:"chinese",level:1}}} export function syncDiamondTotal(){}'}));
 const activities=savedActivities||activityTemplate({level_id:level,title});
 const set={id:'sample',lesson_id:'lesson',level_id:level,lesson_title:title,title:'Q1 Word',activity_count:activities?.tasks.length||0};
 await page.route('**/api/v1/chinese/**',r=>{
  const p=new URL(r.request().url()).pathname;
  let data;
  if(p.endsWith('/catalog'))data={levels:[{id:level,title:'HSK '+level}],lessons:[{id:'lesson',level_id:level,title}],sets:[set],counts:[{set_id:'sample',kind:'vocabulary',total:1}],progress:[],reviews:[],completion:[]};
  else if(p.endsWith('/sets/sample'))data={set,activities,items:[{id:'word',kind:'vocabulary',data:{hanzi:'你',pinyin:'nǐ',meaning:'bạn'}}],progress:null};
  else data={};
  return r.fulfill({json:{data}});
 });
}
test('unrelated lessons do not get Q1 exercises',async({page})=>{
 for(const [level,title] of [[1,'Bài mới chưa có kịch bản'],[2,'你好']]){
  await page.unrouteAll();await mock(page,0,level,title);await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
  await expect(page.getByRole('link',{name:'Luyện vận dụng',exact:true})).toHaveCount(0);
  await expect(page.locator('#content')).toContainText('chưa có hoạt động vận dụng');
 }
});

test('question audio is opt-in, uses slow matching voices and stops on repeat or navigation',async({page})=>{
 await page.addInitScript(()=>{
  window.__spoken=[];window.__cancels=0;window.__pending=null;
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>['vi-VN','zh-CN','en-US'].map(lang=>({lang,name:lang})),cancel:()=>window.__cancels++,speak:u=>{window.__pending=u;window.__spoken.push({text:u.text,lang:u.lang,rate:u.rate});}}});
 });
 await mock(page,2);await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
 await page.getByRole('button',{name:'Điền từ',exact:true}).click();
 expect(await page.evaluate(()=>window.__spoken.length)).toBe(0);
 await page.getByRole('button',{name:'Nghe câu hỏi',exact:false}).click();
 await expect(page.getByRole('button',{name:'Dừng đọc',exact:false})).toBeVisible();
 expect(await page.evaluate(()=>window.__spoken[0].rate)).toBe(.8);
 await page.getByRole('button',{name:'Dừng đọc',exact:false}).click();
 expect(await page.evaluate(()=>window.__cancels)).toBeGreaterThan(0);
 await page.evaluate(async()=>{
  const {attachQuestionAudio}=await import('/assets/js/question-audio.js');
  const h=document.createElement('h2');h.id='audio-fixture';h.textContent='Tính 2 + 3 = ___';document.body.append(h);
  const answer=document.createElement('p');answer.textContent='Đáp án bí mật: 5';document.body.append(answer);
  attachQuestionAudio(h,h.textContent);
 });
 await page.locator('#audio-fixture + .question-audio button').click();
 const last=await page.evaluate(()=>window.__spoken.at(-1));expect(last.text).toContain('cộng');expect(last.text).toContain('chỗ trống');expect(last.text).not.toContain('bí mật');
 await page.evaluate(()=>document.querySelector('#audio-fixture + .question-audio').remove());
 await expect.poll(()=>page.evaluate(()=>window.__pending&&window.__cancels)).toBeGreaterThan(1);
 const parts=await page.evaluate(async()=>{const {speechParts}=await import('/assets/js/question-audio.js');return speechParts('Xin hỏi 你去哪儿？','vi-VN');});
 expect(parts.some(p=>p.lang==='zh-CN'&&p.text.includes('你去哪儿'))).toBe(true);
 expect(parts.some(p=>p.lang==='vi-VN')).toBe(true);
});

test('all worksheet types have a read button without speaking on render',async({page})=>{
 await page.addInitScript(()=>{window.__spoken=0;Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{}});Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel:()=>{},speak:()=>window.__spoken++}});});
 await mock(page);await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
 const count=await page.evaluate(async()=>{
  const {renderItem}=await import('/assets/js/worksheet-player.js');const root=document.createElement('div');document.body.append(root);
  const configs={fill:{},word:{},blanks:{labels:['Ô 1']},choice:{options:['A','B']},compare:{},ordering:{tokens:['một','hai']},matching:{left:['A'],targets:['B']},column:{a:2,b:1,operator:'+'},drawing:{}};
  for(const [type,config]of Object.entries(configs))root.append(renderItem({type,prompt:'Đề bài '+type,config},null,()=>{}));
  return root.querySelectorAll('.worksheet-question > .question-audio button').length;
 });
 expect(count).toBe(9);expect(await page.evaluate(()=>window.__spoken)).toBe(0);
});

test('online audio plays on devices without installed Vietnamese voices, including no speech API',async({page})=>{
 await page.addInitScript(()=>{
  window.__plays=[];window.__pauses=0;
  Object.defineProperty(window,'Audio',{value:class{constructor(url){this.src=url;}async play(){window.__plays.push({src:this.src,rate:this.playbackRate});}pause(){window.__pauses++;}load(){}removeAttribute(){}remove(){}}});
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'en-US'}],cancel:()=>{}}});
 });
 const requests=[];await page.route('**/api/v1/question-audio',r=>{requests.push(r.request().postDataJSON());return r.fulfill({contentType:'audio/mpeg',body:Buffer.alloc(1024)});});
 await mock(page,2);await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
 await page.evaluate(async()=>{const {questionAudio}=await import('/assets/js/question-audio.js');document.querySelector('#content').replaceChildren(questionAudio('Xin chào các bạn.'));});
 expect(requests).toHaveLength(0);expect(await page.evaluate(()=>window.__plays.length)).toBe(0);
 await page.getByRole('button',{name:'Nghe câu hỏi',exact:false}).click();
 await expect.poll(()=>page.evaluate(()=>window.__plays.length)).toBe(1);expect(requests[0].lang).toBe('vi-VN');
 expect(await page.evaluate(()=>window.__plays[0].rate)).toBe(.85);
 await page.getByRole('button',{name:'Dừng đọc',exact:false}).click();expect(await page.evaluate(()=>window.__pauses)).toBe(1);
 await page.evaluate(()=>Object.defineProperty(window,'speechSynthesis',{value:undefined}));
 await page.getByRole('button',{name:'Nghe câu hỏi',exact:false}).click();await expect.poll(()=>page.evaluate(()=>window.__plays.length)).toBe(2);
 await expect(page.locator('.question-audio')).not.toContainText('cài đặt');
});

for(const online of [false,true])test(`saved dialogue answers are not translated in prompts, hints or ${online?'online':'device'} audio`,async({page})=>{
 await page.addInitScript(({online})=>{
  window.__spoken=[];window.__plays=[];
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>online?[]:['vi-VN','zh-CN'].map(lang=>({lang})),cancel:()=>{},speak:u=>{window.__spoken.push({text:u.text,lang:u.lang});queueMicrotask(()=>u.onend?.());}}});
  Object.defineProperty(window,'Audio',{value:class{async play(){window.__plays.push(this.src);queueMicrotask(()=>this.onended?.());}pause(){}load(){}removeAttribute(){}remove(){}}});
 },{online});
 const requests=[];
 await page.route('**/api/v1/question-audio',r=>{requests.push(r.request().postDataJSON());return r.fulfill({contentType:'audio/mpeg',body:Buffer.alloc(1024)});});
 const translation='Tôi cũng rất vui.';
 const task={type:'dialogue',prompt:'Hãy đáp lại với ý: '+translation,speech:'我很高兴，你呢？',pinyin:'wǒ hěn gāoxìng, nǐ ne?',meaning:'Gợi ý trả lời: '+translation,hint:'Đáp lại: '+translation,options:['我也很高兴。','他是我的朋友。'],answer:'我也很高兴。',explanation:'也 đứng trước 很高兴. '+translation};
 await mock(page,2,1,titles[2],{topic:'Trao danh thiếp',tasks:[task]});
 await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
 await page.getByRole('button',{name:'Hội thoại',exact:true}).click();
 const practice=page.locator('.applied-practice');
 await expect(practice).toContainText('Nghe câu thoại và chọn câu đáp lại phù hợp.');
 await expect(practice.locator('.applied-bubble .applied-hanzi')).toHaveText(task.speech);
 await expect(practice).not.toContainText(translation);
 await expect(practice.getByRole('button',{name:'Gợi ý',exact:true})).toHaveCount(0);
 await expect(practice.locator('.pinyin')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__spoken)).toEqual([]);expect(requests).toEqual([]);
 await page.getByRole('button',{name:'Nghe câu hỏi',exact:false}).click();
 await expect.poll(async()=>online?requests.map(p=>p.text).join(''):page.evaluate(()=>window.__spoken.map(p=>p.text).join(''))).toBe(task.speech);
 const spoken=online?requests:await page.evaluate(()=>window.__spoken);
 expect(spoken.every(p=>p.lang==='zh-CN')).toBe(true);
 if(online)await expect.poll(()=>page.evaluate(()=>window.__plays.length)).toBe(spoken.length);
 await page.getByRole('button',{name:task.answer,exact:true}).click();
 await expect(practice).not.toContainText(translation);
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
 await expect(practice.locator('.applied-feedback')).toContainText('Đúng rồi!');
 await expect(practice.locator('.applied-feedback')).toContainText(task.explanation);
 await expect(practice.locator('.applied-feedback .pinyin')).toHaveText(task.pinyin);
 await page.getByRole('button',{name:'Xem kết quả',exact:true}).click();await expect(practice.locator('.quiz-score')).toHaveText('1/1');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('saved activities keep required context and show correction explanations only after checking',async({page})=>{
 const tasks=[
  {type:'fill',prompt:'我___名片。 (Tôi không có danh thiếp.)',hint:'Nghĩa cả câu: Tôi không có danh thiếp.',answer:'没有',explanation:'Phủ định của 有 là 没有.'},
  {type:'fix',prompt:'我不有名片。',hint:'Chọn 我没有名片。',options:['我没有名片。','我不有名片。'],answer:'我没有名片。',explanation:'Phủ định của 有 là 没有.'}
 ];
 await mock(page,2,1,titles[2],{topic:'Trao danh thiếp',tasks});
 for(const [type,label]of [['fill','Điền từ'],['fix','Sửa lỗi']]){
  await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');await page.getByRole('button',{name:label,exact:true}).click();
  const practice=page.locator('.applied-practice'),task=tasks.find(t=>t.type===type);
  await expect(practice.getByRole('button',{name:'Gợi ý',exact:true})).toHaveCount(0);
  await expect(practice).not.toContainText(task.explanation);await expect(practice).not.toContainText(task.hint);
  if(type==='fill'){await expect(practice.locator('.applied-hanzi')).toHaveText(task.prompt);await page.getByRole('textbox',{name:'Từ cần điền'}).fill(task.answer);}
  else await page.getByRole('button',{name:task.answer,exact:true}).click();
  await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(practice.locator('.applied-feedback')).toContainText(task.explanation);
 }
});

test('each lesson offers ten distinct questions per activity type and mixed sessions stay at ten',async({page})=>{
 test.setTimeout(180000);
 const labels={order:'Xếp câu',fix:'Sửa lỗi',fill:'Điền từ',dialogue:'Hội thoại'};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let lesson=0;lesson<6;lesson++){
  await page.unrouteAll();await mock(page,lesson);
  const pack=activityTemplate({level_id:1,title:titles[lesson]});
  await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
  for(const [type,label]of Object.entries(labels)){
   await page.getByRole('button',{name:label,exact:true}).click();const seen=new Set();
   for(let n=0;n<10;n++){
    await expect(page.locator('.quiz-position')).toHaveText(`${label} · ${n+1}/10`);
    const candidates=pack.tasks.filter(t=>t.type===type);
    await expect(page.locator('.applied-practice').getByRole('button',{name:'Gợi ý',exact:true})).toHaveCount(0);
    await expect(page.locator('.applied-practice .applied-feedback')).toBeEmpty();
    let prompt,task;
    if(type==='order')prompt=await page.locator('.applied-practice h2').textContent();
    else if(type==='fix')prompt=await page.locator('.applied-error').textContent();
    else if(type==='fill')prompt=await page.locator('.applied-hanzi').textContent();
    else {
     const speech=await page.locator('.applied-bubble .applied-hanzi').textContent();
     const options=await page.locator('.quiz-choices .choice-with-audio > button').allTextContents();
     task=candidates.find(t=>t.speech===speech&&t.options.length===options.length&&t.options.every(o=>options.includes(o)));
     prompt=JSON.stringify([speech,[...options].sort()]);
     const translation=pack.tasks.find(t=>t.type==='order'&&t.answer===task?.answer)?.prompt;
     expect(translation).toBeTruthy();
     await expect(page.locator('.applied-practice')).not.toContainText(translation);
     expect(task?.prompt).toBe('Nghe câu thoại và chọn câu đáp lại phù hợp.');
     expect(task?.hint).toBeUndefined();
     expect(task?.meaning).toBeUndefined();
    }
    task=task||candidates.find(t=>t.prompt===prompt);expect(task).toBeTruthy();expect(seen.has(prompt)).toBe(false);seen.add(prompt);
    if(type==='order')for(const word of task.tokens)await page.getByRole('group',{name:'Từ để xếp câu'}).getByRole('button',{name:word,exact:true,disabled:false}).first().click();
    else if(type==='fill')await page.getByRole('textbox',{name:'Từ cần điền'}).fill(task.answer);
    else await page.getByRole('button',{name:task.answer,exact:true}).click();
    await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.locator('.applied-feedback')).toContainText('Đúng rồi!');
    await page.getByRole('button',{name:n===9?'Xem kết quả':'Tiếp tục →',exact:true}).click();
   }
   await expect(page.locator('.quiz-score')).toHaveText('10/10');
   await page.getByRole('button',{name:'Luyện lại',exact:true}).click();await expect(page.locator('.quiz-position')).toHaveText(`${label} · 1/10`);
   await page.getByRole('button',{name:'Chọn cách luyện'}).click();
  }
  await page.getByRole('button',{name:'Bắt đầu lượt ngắn'}).click();await expect(page.locator('.quiz-position')).toContainText('1/10');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});

test('admin authors all four types, previews, saves, reloads and controls student visibility',async({page})=>{
 let pack={topic:'',tasks:[],status:'draft',revision:0};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/assets/js/ui-core.js',r=>r.fulfill({contentType:'text/javascript',body:'export async function initPage(){return {course:{kind:"chinese",level:1}}} export function syncDiamondTotal(){}'}));
 await page.route('**/api/v1/chinese/**',async r=>{
  const p=new URL(r.request().url()).pathname,method=r.request().method();
  const lesson={id:'lesson',title:'Bài tự tạo',level_id:1,status:'published'},set={id:'sample',lesson_id:'lesson',level_id:1,lesson_title:lesson.title,title:'Tài liệu học',activity_count:pack.status==='published'?pack.tasks.length:0};
  let data;
  if(p.endsWith('/catalog'))data={levels:[{id:1,title:'HSK 1'}],lessons:[lesson],sets:[set],counts:[],reviews:[],progress:[],completion:[]};
  else if(p.endsWith('/activities/preview'))data=r.request().postDataJSON();
  else if(p.endsWith('/activities')){if(method==='PUT')pack={...r.request().postDataJSON(),revision:pack.revision+1};data=pack;}
  else if(p.endsWith('/sets/sample'))data={set,activities:pack.status==='published'?pack:null,items:[],progress:null};
  else data={};
  return r.fulfill({json:{data}});
 });
 await page.goto(origin+'/pages/admin/chinese/?lesson=lesson');
 await page.locator('.admin-study-modes').getByRole('link',{name:/^Luyện vận dụng/}).click();
 await page.getByLabel('Chủ đề lượt luyện').fill('Tự giới thiệu');
 for(const [type,fields] of [
  ['order',{prompt:'Tôi ở trường.',tokens:'我\n在\n学校\n。',explanation:'在 đứng trước địa điểm.'}],
  ['fix',{prompt:'我不有名片。',options:'我没有名片。\n我不有名片。',answer:'我没有名片。',explanation:'Phủ định của 有 là 没有.'}],
  ['fill',{prompt:'我___名片。',answer:'没有',explanation:'没有 nghĩa là không có.'}],
  ['dialogue',{prompt:'Nói nơi muốn đến.',speech:'你去哪儿？',pinyin:'nǐ qù nǎr',meaning:'Bạn đi đâu?',options:'我去学校。\n我叫小明。',answer:'我去学校。',explanation:'去 đứng trước điểm đến.'}]
 ]){
  await page.getByLabel('Dạng hoạt động').selectOption(type);await page.getByRole('button',{name:'Thêm hoạt động',exact:true}).click();
  const form=page.locator('form[data-index]').last();for(const [name,value]of Object.entries(fields))await form.locator(`[name=${name}]`).fill(value);
  if(type==='order')await expect(form.locator('[name=answer]')).toHaveValue('我在学校。');
 }
 await page.getByRole('button',{name:'Xem thử',exact:true}).click();await expect(page.getByRole('heading',{name:'Xem thử như học sinh'})).toBeVisible();expect(pack.tasks).toHaveLength(0);
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();expect(pack.tasks).toHaveLength(4);expect(pack.status).toBe('draft');
 await page.reload();await expect(page.getByLabel('Chủ đề lượt luyện')).toHaveValue('Tự giới thiệu');await expect(page.locator('form[data-index]')).toHaveCount(4);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();expect(pack.status).toBe('published');
 await page.screenshot({path:'test-results/chinese-activities-admin-mobile.png',fullPage:true});
 await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
 await expect(page.getByRole('button',{name:'Điền từ',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Điền từ',exact:true}).click();await page.getByRole('textbox',{name:'Từ cần điền'}).fill('  没有  ');
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.locator('.applied-feedback')).toContainText('Đúng rồi!');
 await page.getByRole('button',{name:'Xem kết quả'}).click();await expect(page.locator('.quiz-score')).toHaveText('1/1');
 await page.goto(origin+'/pages/admin/chinese/?activities=lesson');await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
 await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');await expect(page.getByRole('link',{name:'Luyện vận dụng',exact:true})).toHaveCount(0);
 await expect(page.locator('#content')).toContainText('chưa có hoạt động vận dụng');expect(errors).toEqual([]);
});
