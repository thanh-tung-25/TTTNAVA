import fs from 'node:fs/promises';
import {test,expect} from '@playwright/test';
const lessonId='00000000-0000-4000-8000-000000000001';
const initial={enabled:true,scenario_id:'identity',goal:'Giới thiệu tên và quốc tịch.',opening:'你好！你叫什么名字？',translation:'Chào bạn! Bạn tên là gì?',required_words:['名字','越南'],max_turns:10};
const summary={feedback:'Con đã tự tin giới thiệu bản thân.',strengths:['Trả lời đúng ý.'],errors:[{original:'我是越南',suggestion:'我是越南人。',explanation:'Thêm 人 khi nói về quốc tịch.'}],practice_words:['名字','越南人']};
async function setup(page,{role='student',voice=true,configured=true,failTurn=false}={}){
 let settings={...initial},session=null,failed=false;const turns=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({voice})=>{
  localStorage.setItem('ttnava-course','hsk-1');window.__spoken=[];window.__stopped=0;
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voice?[{lang:'zh-CN',name:'Test Chinese'}]:[],addEventListener(){},removeEventListener(){},cancel(){},speak(u){window.__spoken.push({text:u.text,rate:u.rate});}}});
  const getMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async constraints=>{
   window.__constraints=constraints;const stream=await getMedia(constraints);
   for(const t of stream.getTracks()){const original=t.stop.bind(t);t.stop=()=>{window.__stopped++;original();};}
   return stream;
  }});
 },{voice});
 await page.route('**/pages/'+role+'/chinese/**',async route=>{
  const file=route.request().resourceType()==='document'?'index.html':new URL(route.request().url()).pathname.split('/').pop();
  if(!/\.(html|js|css)$/.test(file))return route.continue();
  await route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:await fs.readFile('frontend/pages/'+role+'/chinese/'+file,'utf8')});
 });
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data={};
  if(path.endsWith('/auth/me'))data={profile:{id:role,role,adminScope:'chinese',displayName:'Bạn học',avatarKey:'meo'}};
  else if(path.endsWith('/courses/hsk-1/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'Tiếng Trung HSK 1'};
  else if(path.endsWith('/diamonds/summary'))data={total:8};
  else if(path.endsWith('/experience/preferences'))data={minutes:10,onboarding_at:'2026-11-01',companion:'lion',companion_name:'Sư tử'};
  else if(path.endsWith('/chinese/ai-chat'))data={configured,reason:configured?'':'AI chưa được bật.',remaining:2,limits:{daily:2},lessons:[{id:lessonId,title:'Bài 2. Hỏi tên, quốc tịch',level_id:1,settings}],active:session?.status==='active'?session:null};
  else if(path.endsWith('/ai-chat/lessons/'+lessonId)){settings=req.postDataJSON();data={settings};}
  else if(path.endsWith('/ai-chat/results'))data=[{id:'finished',lesson_title:'Bài 2',display_name:'An',turn_count:3,created_at:'2026-11-12T08:00:00Z',summary}];
  else if(path.endsWith('/ai-chat/sessions')){session={id:'session',lesson_id:lessonId,lesson_title:'Bài 2. Hỏi tên, quốc tịch',level_id:1,turn_count:0,max_turns:settings.max_turns,status:'active',is_preview:role==='admin',reply:{reply_zh:settings.opening,translation_vi:settings.translation,hint_zh:''}};data=session;}
  else if(/\/turns\//.test(path)){
   turns.push({path,body:req.postData(),buffer:req.postDataBuffer()});
   if(failTurn&&!failed){failed=true;return route.fulfill({status:429,json:{error:{code:'CHAT_FREE_LIMIT',message:'AI miễn phí đang chạm hạn mức. Chờ rồi thử lại nhé.'}}});}
   session={...session,turn_count:session.turn_count+1,transcript:'我叫安。',reply:{reply_zh:'很高兴认识你！你是哪国人？',translation_vi:'Rất vui được làm quen! Bạn là người nước nào?',hint_zh:'我是越南人。'}};data=session;
  }else if(path.endsWith('/finish')){session={...session,status:'completed',summary};data=session;}
  else if(path.endsWith('/sessions/session'))data=session;
  else if(/\/history$|\/tests$/.test(path))data=[];
  await route.fulfill({json:{data}});
 });
 await page.goto(`/pages/${role}/chinese/?view=ai-chat&level=1&lesson=${lessonId}`);await expect(page.locator('.ai-chat-scene')).toBeVisible();
 return {turns,errors,settings:()=>settings};
}
test('student setup and conversation fit phone/tablet/desktop and hide all optional help',async({page})=>{
 const state=await setup(page);
 for(const width of [320,360,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if([360,1440].includes(width))await page.screenshot({path:`test-results/ai-chat-setup-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Bắt đầu trò chuyện'}).click();await expect(page.locator('.ai-chat-room')).toBeVisible();await expect(page.getByText(initial.opening,{exact:true})).not.toBeVisible();await expect(page.getByText(initial.translation,{exact:true})).not.toBeVisible();
 await page.getByText('Hiện chữ tiếng Trung',{exact:true}).click();await expect(page.getByText(initial.opening,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Nghe chậm'}).click();expect(await page.evaluate(()=>window.__spoken.at(-1).rate)).toBe(.65);
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/ai-chat-conversation-mobile.png',fullPage:true});expect(state.errors).toEqual([]);
});
test('text answers retry the same turn after quota error then send a summary',async({page})=>{
 const state=await setup(page,{failTurn:true});await page.getByRole('button',{name:'Bắt đầu trò chuyện'}).click();await page.locator('[data-answer]').fill('我叫安。');await page.locator('[data-send]').click();await expect(page.locator('.ai-chat-alert')).toContainText('hạn mức');await page.locator('[data-send]').click();await expect(page.locator('.ai-chat-progress')).toContainText('1/10');expect(state.turns[0].path).toBe(state.turns[1].path);
 await expect(page.getByText('我是越南人。',{exact:true})).not.toBeVisible();await page.getByText('Gợi ý khi bí',{exact:true}).click();await expect(page.getByText('我是越南人。',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Kết thúc & gửi tổng kết cho cô'}).click();await expect(page.locator('.ai-chat-summary')).toContainText('Đã gửi tổng kết cho cô');await expect(page.locator('.ai-chat-corrected')).toContainText('我是越南人');expect(state.errors).toEqual([]);
});
test('admin configures the same scene and reads student summaries',async({page})=>{
 const state=await setup(page,{role:'admin'});await page.locator('[name=scenario_id]').selectOption('family');await page.locator('[name=max_turns]').fill('4');await page.getByRole('button',{name:'Lưu tình huống',exact:true}).click();await expect(page.locator('.ai-chat-scene h3')).toHaveText('Gia đình của mình');expect(state.settings()).toMatchObject({scenario_id:'family',max_turns:4,opening:'你家有几口人？'});
 await page.locator('.ai-chat-reports>summary').click();await expect(page.locator('.ai-chat-report')).toContainText('An');await page.locator('.ai-chat-report>summary').click();await expect(page.locator('.ai-chat-report .ai-chat-summary')).toContainText(summary.feedback);
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/ai-chat-admin-mobile.png',fullPage:true});await page.getByRole('button',{name:'Thử như học sinh'}).click();await expect(page.locator('.ai-chat-preview')).toBeVisible();expect(state.errors).toEqual([]);
});
test('records audio only, releases microphone, reviews WAV and supports re-recording',async({page})=>{
 const state=await setup(page);await page.getByRole('button',{name:'Bắt đầu trò chuyện'}).click();await page.locator('[data-record]').click();await expect(page.locator('[data-record]')).toContainText('Dừng ghi');await page.waitForTimeout(600);await page.locator('[data-record]').click();await expect(page.locator('[data-draft] audio')).toBeVisible();expect(await page.evaluate(()=>window.__constraints.video)).toBe(false);expect(await page.evaluate(()=>window.__stopped)).toBe(1);
 await page.getByRole('button',{name:'Ghi lại',exact:true}).click();await expect(page.locator('[data-record]')).toContainText('Dừng ghi');await page.waitForTimeout(600);await page.locator('[data-record]').click();await expect(page.locator('[data-draft] audio')).toBeVisible();await page.locator('[data-send]').click();await expect(page.locator('.ai-chat-progress')).toContainText('1/10');expect(state.turns[0].path).toMatch(/\/audio$/);expect(state.turns[0].buffer.includes(Buffer.from('RIFF'))).toBe(true);expect(state.turns[0].buffer.length).toBeLessThan(641000);expect(await page.evaluate(()=>window.__stopped)).toBe(2);expect(state.errors).toEqual([]);
});
test('missing Chinese voice has a text fallback and unavailable provider disables start',async({page})=>{
 await setup(page,{voice:false});await page.getByRole('button',{name:'Bắt đầu trò chuyện'}).click();await expect(page.locator('.ai-chat-alert')).toContainText('chưa có giọng đọc tiếng Trung');await page.getByText('Hiện chữ tiếng Trung',{exact:true}).click();await expect(page.getByText(initial.opening,{exact:true})).toBeVisible();
});
test('provider not configured displays the real status',async({page})=>{await setup(page,{configured:false});await expect(page.getByRole('button',{name:'Bắt đầu trò chuyện'})).toBeDisabled();await expect(page.locator('.ai-chat-card .ai-chat-alert')).toContainText('chưa được bật');});
test('stops recording at twenty seconds and when the tab becomes hidden',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Bắt đầu trò chuyện'}).click();await page.clock.install();
 await page.locator('[data-record]').click();await expect(page.locator('[data-record]')).toContainText('Dừng ghi');await page.waitForTimeout(700);await page.clock.fastForward(21000);await expect(page.locator('[data-draft] audio')).toBeVisible();expect(await page.evaluate(()=>window.__stopped)).toBe(1);
 await page.getByRole('button',{name:'Ghi lại',exact:true}).click();await expect(page.locator('[data-record]')).toContainText('Dừng ghi');await page.waitForTimeout(700);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('[data-draft] audio')).toBeVisible();expect(await page.evaluate(()=>window.__stopped)).toBe(2);
});
