import fs from 'node:fs/promises';
import {test,expect} from '@playwright/test';
const lessonId='00000000-0000-4000-8000-000000000001';
const settings={enabled:true,scenario_id:'identity',goal:'Giới thiệu tên và quốc tịch.',opening:'你好！你叫什么名字？',translation:'Chào bạn! Bạn tên là gì?',required_words:['名字','越南'],max_turns:10};
const answer='很高兴认识你！今天想聊什么？';
async function setup(page,{role='student',voice=true,configured=true,fail=false,delay=0,denyMic=false,startDelay=0}={}){
 let config={...settings},session=null,failed=false;const turns=[],finishes=[],errors=[],starts=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({voice,denyMic})=>{
  localStorage.setItem('ttnava-course','hsk-1');window.__spoken=[];window.__stopped=0;window.__microphones=0;window.__rms=0;window.__speaking=false;
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  let timer;
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voice?[{lang:'zh-CN',name:'Test Chinese'}]:[],addEventListener(){},removeEventListener(){},cancel(){clearTimeout(timer);window.__speaking=false;},speak(u){window.__spoken.push({text:u.text,rate:u.rate});window.__speaking=true;timer=setTimeout(()=>{window.__speaking=false;u.onend?.();},80);}}});
  AnalyserNode.prototype.getFloatTimeDomainData=function(buffer){buffer.fill(window.__rms);};
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async constraints=>{
   window.__microphones++;window.__constraints=constraints;if(denyMic)throw new DOMException('Denied','NotAllowedError');
   const stream=await original(constraints);for(const t of stream.getTracks()){const stop=t.stop.bind(t);t.stop=()=>{window.__stopped++;stop();};}return stream;
  }});
 },{voice,denyMic});
 await page.route('**/pages/'+role+'/chinese/**',async route=>{
  const file=route.request().resourceType()==='document'?'index.html':new URL(route.request().url()).pathname.split('/').pop();
  if(!/\.(html|js|css)$/.test(file))return route.continue();await route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:await fs.readFile('frontend/pages/'+role+'/chinese/'+file,'utf8')});
 });
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data={};
  if(path.endsWith('/auth/me'))data={profile:{id:role,role,adminScope:'chinese',displayName:'Bạn học',avatarKey:'meo'}};
  else if(path.endsWith('/courses/hsk-1/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'Tiếng Trung HSK 1'};
  else if(path.endsWith('/diamonds/summary'))data={total:8};
  else if(path.endsWith('/experience/preferences'))data={minutes:10,onboarding_at:'2026-11-01',companion:'lion',companion_name:'Sư tử'};
  else if(path.endsWith('/chinese/ai-chat'))data={configured,reason:configured?'':'AI chưa được bật.',remaining:2,limits:{daily:2,turns:20,session_minutes:5},lessons:[{id:lessonId,title:'Bài 2. Hỏi tên, quốc tịch',level_id:1,settings:config}],active:null};
  else if(path.endsWith('/ai-chat/lessons/'+lessonId)){config=req.postDataJSON();data={settings:config};}
  else if(path.endsWith('/ai-chat/sessions')){
   starts.push(req.postDataJSON());
   if(startDelay)await new Promise(r=>setTimeout(r,startDelay));
   session={id:'session',lesson_id:lessonId,lesson_title:'Bài 2',status:'active',turn_count:0,max_turns:20,expires_at:new Date(Date.now()+300000).toISOString(),state:'opaque-state-0',reply:{reply_zh:config.opening,translation_vi:config.translation}};data=session;
  }else if(path.includes('/turns/')){
   turns.push({path,body:req.postData(),buffer:req.postDataBuffer(),speaking:await page.evaluate(()=>window.__speaking)});
   if(delay)await new Promise(r=>setTimeout(r,delay));
   if(fail&&!failed){failed=true;return route.fulfill({status:429,json:{error:{code:'CHAT_FREE_LIMIT',message:'AI đang chạm hạn mức. Bạn nghỉ rồi thử lại nhé.'}}});}
   session={...session,turn_count:session.turn_count+1,state:'opaque-state-'+(session.turn_count+1),reply:{reply_zh:answer,translation_vi:'Rất vui được gặp bạn! Hôm nay bạn muốn nói chuyện gì?'}};data=session;
  }else if(path.endsWith('/finish')){finishes.push(path);session={...session,status:'completed'};data=session;}
  else if(/\/history$|\/tests$/.test(path))data=[];
  await route.fulfill({json:{data}});
 });
 await page.goto('/pages/'+role+'/chinese/?view=ai-chat&level=1&lesson='+lessonId);await expect(page.locator('[data-start]')).toBeVisible();return {turns,finishes,starts,errors};
}
test('simple setup and voice controls fit mobile and desktop without scoring or teacher reports',async({page})=>{
 const state=await setup(page);
 for(const width of [320,360,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if([360,1440].includes(width))await page.screenshot({path:'test-results/voice-setup-'+width+'.png',fullPage:true});}
 await page.locator('[data-start]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');await expect(page.getByText(settings.opening,{exact:true})).not.toBeVisible();
 await expect(page.locator('[data-pause]')).toBeEnabled();await expect(page.locator('[data-done]')).toBeEnabled();await expect(page.locator('[data-end]')).toBeEnabled();
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.voice-call').evaluate(node=>node.scrollIntoView({block:'start'}));
 for(const selector of ['[data-end]','[data-pause]','[data-done]']){const box=await page.locator(selector).boundingBox();expect(box.y).toBeGreaterThanOrEqual(80);expect(box.y+box.height).toBeLessThan(720);}
 await page.screenshot({path:'test-results/voice-call-mobile.png',fullPage:true});await page.locator('[data-end]').click();expect(state.errors).toEqual([]);
});
for(const viewport of [{width:320,height:568},{width:360,height:800},{width:390,height:844}])test(`mobile ${viewport.width}: AI controls remain reachable while reading replies and typing`,async({page})=>{
 await page.setViewportSize(viewport);const state=await setup(page);await page.locator('[data-start]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');
 await page.locator('.voice-captions>summary').click();await page.locator('.voice-captions details>summary').click();await page.locator('.voice-typing>summary').click();
 await page.locator('[data-text]').scrollIntoViewIfNeeded();
 for(const selector of ['[data-pause]','[data-done]','[data-end]']){
  await expect(page.locator('.voice-controls').locator(selector)).toHaveCount(1);
  const box=await page.locator(selector).boundingBox();expect(box.y).toBeGreaterThanOrEqual(70);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height-78);
 }
 await page.screenshot({path:'test-results/voice-controls-compact-'+viewport.width+'.png',animations:'disabled'});
 await page.locator('[data-pause]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','paused');expect(await page.evaluate(()=>window.__stopped)).toBe(1);
 await page.locator('[data-pause]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');expect(await page.evaluate(()=>window.__microphones)).toBe(2);
 await page.locator('[data-end]').click();await expect(page.locator('.voice-ended')).toBeVisible();expect(state.finishes).toHaveLength(1);expect(state.errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('automatically sends after silence, speaks a response and listens again using one microphone permission',async({page})=>{
 const state=await setup(page);await page.locator('[data-start]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');
 await page.evaluate(()=>window.__rms=.05);await page.waitForTimeout(700);await page.evaluate(()=>window.__rms=0);
 await expect.poll(()=>state.turns.length).toBe(1);await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');expect(await page.evaluate(()=>window.__spoken.length)).toBe(2);expect(state.turns[0].speaking).toBe(false);
 expect(state.turns[0].buffer.includes(Buffer.from('RIFF'))).toBe(true);expect(state.turns[0].buffer.length).toBeLessThan(682000);expect(await page.evaluate(()=>window.__microphones)).toBe(1);expect(await page.evaluate(()=>window.__constraints.video)).toBe(false);
 await page.evaluate(()=>window.__rms=.05);await page.waitForTimeout(700);await page.evaluate(()=>window.__rms=0);await expect.poll(()=>state.turns.length).toBe(2);await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');expect(state.turns[1].body).toContain('opaque-state-1');
 await page.locator('[data-end]').click();await expect(page.locator('.voice-ended')).toBeVisible();expect(await page.evaluate(()=>window.__stopped)).toBe(1);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('opaque-state');await expect(page.getByText(answer,{exact:true})).toHaveCount(0);expect(state.errors).toEqual([]);
});
test('Nói xong supports manual turn completion and pause/resume releases the microphone',async({page})=>{
 const state=await setup(page);await page.locator('[data-start]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');await page.waitForTimeout(700);await page.locator('[data-done]').click();await expect.poll(()=>state.turns.length).toBe(1);await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');
 await page.locator('[data-pause]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','paused');expect(await page.evaluate(()=>window.__stopped)).toBe(1);
 await page.locator('[data-pause]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');expect(await page.evaluate(()=>window.__microphones)).toBe(2);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','paused');expect(await page.evaluate(()=>window.__stopped)).toBe(2);await page.locator('[data-end]').click();expect(state.errors).toEqual([]);
});
test('text fallback retries the same request without microphone access and clears all dialogue at end',async({page})=>{
 const state=await setup(page,{fail:true});await page.getByRole('button',{name:'Dùng bàn phím thay micro',exact:true}).click();await page.locator('[data-text]').fill('我叫安。');await page.locator('[data-text-send]').click();await expect(page.locator('[data-voice-hint]')).toContainText('hạn mức');await page.locator('[data-pause]').click();await expect(page.locator('[data-caption]')).toHaveText(answer);
 expect(state.turns[0].path).toBe(state.turns[1].path);expect(await page.evaluate(()=>window.__microphones)).toBe(0);await page.locator('[data-end]').click();await expect(page.locator('.voice-ended')).toBeVisible();expect(state.finishes).toHaveLength(1);expect(await page.evaluate(()=>JSON.stringify(sessionStorage))).not.toContain('opaque-state');expect(state.errors).toEqual([]);
});
test('ending while a response is pending cannot reopen the mic or show a late response',async({page})=>{
 const state=await setup(page,{delay:700});await page.locator('[data-start]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');await page.waitForTimeout(700);await page.locator('[data-done]').click();await expect.poll(()=>state.turns.length).toBe(1);await page.locator('[data-end]').click();await page.waitForTimeout(900);await expect(page.locator('.voice-ended')).toBeVisible();expect(await page.evaluate(()=>window.__stopped)).toBe(1);await expect(page.locator('[data-caption]')).toHaveCount(0);expect(state.errors).toEqual([]);
});
test('leaving the screen while connecting closes the microphone and waits for a deliberate resume',async({page})=>{
 const state=await setup(page,{startDelay:700});await page.locator('[data-start]').click();await expect.poll(()=>state.starts.length).toBe(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','paused');expect(await page.evaluate(()=>window.__stopped)).toBe(1);expect(await page.evaluate(()=>window.__spoken)).toEqual([]);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.locator('[data-pause]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');await page.locator('[data-end]').click();expect(state.errors).toEqual([]);
});
test('missing Chinese voice and denied microphone both provide an explicit text fallback',async({page})=>{
 const state=await setup(page,{voice:false});await page.locator('[data-start]').click();await expect(page.locator('[data-voice-hint]')).toContainText('chưa phát được giọng Trung');await page.locator('.voice-captions>summary').click();await expect(page.locator('[data-caption]')).toHaveText(settings.opening);await page.locator('[data-pause]').click();await expect(page.locator('.ai-voice-app')).toHaveAttribute('data-phase','listening');await page.locator('[data-end]').click();expect(state.errors).toEqual([]);
});
test('microphone permission failure never starts a server session or prevents typing',async({page})=>{
 const state=await setup(page,{denyMic:true});await page.locator('[data-start]').click();await expect(page.locator('.voice-notice')).toContainText('cho phép dùng micro');expect(state.starts).toHaveLength(0);await page.getByRole('button',{name:'Dùng bàn phím thay micro'}).click();await expect(page.locator('[data-text]')).toBeVisible();await page.locator('[data-end]').click();expect(state.errors).toEqual([]);
});
test('admin configures topics without a reporting panel',async({page})=>{
 const state=await setup(page,{role:'admin'});await page.locator('.voice-teacher>summary').click();await page.locator('[name=scenario_id]').selectOption('family');await page.getByRole('button',{name:'Lưu chủ đề',exact:true}).click();await expect(page.locator('.voice-topic h3')).toHaveText('Gia đình của mình');await expect(page.locator('.ai-chat-reports,.ai-chat-summary')).toHaveCount(0);await page.screenshot({path:'test-results/voice-admin.png',fullPage:true});expect(state.errors).toEqual([]);
});
test('unconfigured AI reports its status and disables both start modes',async({page})=>{
 await setup(page,{configured:false});await expect(page.locator('[data-start]')).toBeDisabled();await expect(page.getByRole('button',{name:'Dùng bàn phím thay micro'})).toBeDisabled();await expect(page.locator('.voice-unavailable')).toContainText('chưa được bật');
});
