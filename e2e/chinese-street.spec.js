import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {test,expect} from '@playwright/test';
import {streetMissionBank} from '../backend/src/data/chinese-street-missions.js';
const lessonId=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),hash=m=>createHash('sha256').update(JSON.stringify(m)).digest('hex');
async function setup(page,{role='student',voice=true,lesson=null,failAnswer=false}={}){
 const configs=new Map(streetMissionBank.map(b=>[lessonId(b.number),{...structuredClone(b),enabled:true,revision:0}])),progress=new Map(),answers=[],saves=[],errors=[],providers=[];let failed=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{const url=new URL(r.url());if(url.hostname==='api.groq.com'||url.pathname==='/api/v1/question-audio')providers.push(r.url());});
 await page.addInitScript(({voice})=>{
  localStorage.setItem('ttnava-course','hsk-1');window.__streetSpeech=[];window.__streetCanceled=0;
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voice?[{lang:'zh-CN',name:'Test Chinese'}]:[],cancel(){window.__streetCanceled++;},addEventListener(){},removeEventListener(){},speak(u){window.__streetSpeech.push({text:u.text,rate:u.rate});queueMicrotask(()=>u.onend?.());}}});
 },{voice});
 await page.route('**/pages/'+role+'/chinese/**',async route=>{const file=route.request().resourceType()==='document'?'index.html':new URL(route.request().url()).pathname.split('/').pop();if(!/\.(html|js|css)$/.test(file))return route.continue();await route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:await fs.readFile('frontend/pages/'+role+'/chinese/'+file,'utf8')});});
 const detail=id=>{const c=configs.get(id);return {lesson:{id,title:'Bài '+c.number,status:'published'},enabled:c.enabled,place_id:c.place_id,revision:c.revision,missions:c.missions.map(m=>{const {answer,feedback,...visible}=m;return {...(role==='admin'?m:visible),content_hash:hash(m),progress:progress.get(id+':'+m.id)||{completed:false,stars:0,wrong_count:0}};})};};
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data={};
  if(path.endsWith('/auth/me'))data={profile:{id:role,role,adminScope:'chinese',displayName:'Bạn học',avatarKey:'meo'}};
  else if(path.endsWith('/courses/hsk-1/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'Tiếng Trung HSK 1'};
  else if(path.endsWith('/diamonds/summary'))data={total:8};
  else if(path.endsWith('/experience/preferences'))data={minutes:10,onboarding_at:'2026-11-01',companion:'lion',companion_name:'Sư tử'};
  else if(path.endsWith('/chinese/street'))data={level:1,lessons:[...configs].map(([id,c])=>{const d=detail(id);return {id,title:'Bài '+c.number,number:c.number,level_id:1,status:'published',enabled:c.enabled,place_id:c.place_id,total:c.missions.length,completed:d.missions.filter(m=>m.progress.completed).length,stars:d.missions.reduce((s,m)=>s+m.progress.stars,0)};})};
  else if(path.endsWith('/street/results'))data=[{display_name:'An',lesson_title:'Bài 7',total:3,completed:2,stars:5,wrong_count:1,updated_at:'2026-11-12T08:00:00Z'}];
  else if(/\/missions\/.+\/answers$/.test(path)){
   const match=path.match(/\/lessons\/([^/]+)\/missions\/([^/]+)/),id=match[1],m=configs.get(id).missions.find(m=>m.id===match[2]),input=req.postDataJSON();answers.push(input);
   if(failAnswer&&!failed){failed=true;return route.fulfill({status:503,json:{error:{code:'INTERNAL_ERROR',message:'Máy chủ tạm gián đoạn. Con thử gửi lại nhé.'}}});}
   const key=id+':'+m.id,old=progress.get(key)||{completed:false,stars:0,wrong_count:0},correct=input.choice_id===m.answer,wrong=old.wrong_count+(!correct&&!old.completed?1:0),stars=old.stars||(correct?Math.max(1,3-wrong):0);
   progress.set(key,{completed:old.completed||correct,stars,wrong_count:wrong});data={...progress.get(key),correct,feedback:correct?m.feedback:'Chưa đúng rồi. Con nghe lại rồi thử nhé.'};
  }else if(/\/street\/lessons\//.test(path)){
   const id=path.split('/').at(-1);if(req.method()==='PUT'){const body=req.postDataJSON();saves.push(body);const old=configs.get(id);configs.set(id,{...old,...body,revision:old.revision+1});}data=detail(id);
  }else if(/\/history$|\/tests$/.test(path))data=[];
  await route.fulfill({json:{data}});
 });
 await page.goto(`/pages/${role}/chinese/?view=street&level=1${lesson?'&lesson='+lessonId(lesson):''}`);await expect(page.locator('.street-building')).toHaveCount(8);if(lesson)await expect(page.locator('.street-mission-card')).toBeVisible();return {answers,saves,errors,providers};
}
test('town map fits phones and desktop, loads all landmarks and keeps left/right positions stable',async({page})=>{
 const state=await setup(page);
 for(const width of [320,360,768,1440]){
  await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect.poll(()=>page.locator('.street-building>img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
  const left=await page.locator('[data-place=restaurant]').boundingBox(),right=await page.locator('[data-place=bank]').boundingBox();expect(right.x).toBeGreaterThan(left.x);expect(Math.abs(right.y-left.y)).toBeLessThan(1);
  if([360,1440].includes(width))await page.screenshot({path:`test-results/street-map-${width}.png`,fullPage:true});
 }
 expect(state.providers).toEqual([]);expect(state.errors).toEqual([]);
});
test('listening is opt-in, wrong map answers retry and progress survives reload',async({page})=>{
 const state=await setup(page,{lesson:7});const speech=streetMissionBank[6].missions[0].speech;await expect(page.getByText(speech,{exact:true})).not.toBeVisible();
 await page.locator('[data-place=bank]').click();await expect(page.locator('[data-check]')).toBeDisabled();expect(state.answers).toHaveLength(0);
 await page.getByRole('button',{name:'Nghe chậm',exact:false}).click();expect(await page.evaluate(()=>window.__streetSpeech.at(-1).rate)).toBe(.6);
 await page.locator('[data-place=home]').click();await page.locator('[data-check]').click();await expect(page.locator('.street-feedback')).toContainText('Chưa đúng');
 await page.locator('[data-place=bank]').click();await page.locator('[data-check]').click();await expect(page.locator('.street-feedback')).toContainText('Đúng rồi');await expect(page.locator('.street-stats')).toContainText('2 sao');
 await page.screenshot({path:'test-results/street-map-correct.png',fullPage:true});await page.reload();await expect(page.locator('.street-mission-kicker')).toContainText('2/3');await expect(page.locator('.street-stats')).toContainText('2 sao');expect(state.providers).toEqual([]);expect(state.errors).toEqual([]);
});
test('school includes three lessons and text fallback unlocks answer choices',async({page})=>{
 const state=await setup(page,{voice:false});await page.locator('[data-place=school]').click();await expect(page.locator('.street-lesson-tabs>.btn')).toHaveCount(3);
 await expect(page.locator('.street-choice input').first()).toBeDisabled();await page.getByRole('button',{name:'Nghe câu nói',exact:false}).click();await expect(page.locator('.street-voice-status')).toContainText('chưa có giọng');
 await page.locator('.street-reveal>summary').click();await expect(page.locator('.street-choice input').first()).toBeEnabled();await page.locator('.street-choice input[value=c2]').check();await page.locator('[data-check]').click();await expect(page.locator('.street-feedback')).toContainText('Đúng rồi');expect(state.answers).toHaveLength(1);expect(state.providers).toEqual([]);expect(state.errors).toEqual([]);
});
test('teacher edits and previews the same map without creating student progress',async({page})=>{
 await page.setViewportSize({width:360,height:800});const state=await setup(page,{role:'admin',lesson:7});
 await page.locator('[name=speech]').fill('请问，中国银行在哪儿？');await page.getByRole('button',{name:'Xem thử phần vừa sửa',exact:true}).click();await page.getByRole('button',{name:'Nghe câu nói',exact:false}).click();expect(await page.evaluate(()=>window.__streetSpeech.at(-1).text)).toBe('请问，中国银行在哪儿？');
 await page.locator('[data-place=bank]').click();await page.locator('[data-check]').click();await expect(page.locator('.street-feedback')).toContainText('Đúng rồi');expect(state.answers).toHaveLength(0);
 await page.getByRole('button',{name:'+ Thêm nhiệm vụ',exact:true}).click();await expect(page.locator('.street-mission-steps>.btn')).toHaveCount(4);await page.getByRole('button',{name:'Lưu nhiệm vụ cho bài này',exact:true}).click();await expect(page.locator('.street-alert')).toHaveText('Đã lưu nhiệm vụ cho bài này.');expect(state.saves[0].missions).toHaveLength(4);expect(state.saves[0].missions[0]).not.toHaveProperty('content_hash');
 await page.locator('.street-reports>summary').click();await expect(page.locator('.street-report')).toContainText('An');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/street-admin-mobile.png',fullPage:true});expect(state.errors).toEqual([]);
});
test('network retry keeps the same request and prevents navigation while checking',async({page})=>{
 const state=await setup(page,{lesson:1,failAnswer:true});await page.locator('.street-reveal>summary').click();await page.locator('.street-choice input[value=c2]').check();await page.locator('[data-check]').click();await expect(page.locator('.street-alert')).toContainText('gián đoạn');await page.locator('[data-check]').click();await expect(page.locator('.street-feedback')).toContainText('Đúng rồi');expect(state.answers).toHaveLength(2);expect(state.answers[0].request_id).toBe(state.answers[1].request_id);expect(state.errors).toEqual([]);
});
test('completes all map missions then returns to usable town navigation',async({page})=>{
 const state=await setup(page,{lesson:7});for(const [i,target]of ['bank','office','home'].entries()){
  await page.locator('.street-reveal>summary').click();await page.locator('[data-place='+target+']').click();await page.locator('[data-check]').click();await expect(page.locator('.street-feedback')).toHaveClass(/is-correct/);await page.getByRole('button',{name:i===2?'Hoàn thành chuyến ghé thăm':'Nhiệm vụ tiếp theo',exact:false}).click();
 }
 await expect(page.locator('.street-complete')).toContainText('3/3 nhiệm vụ');await page.getByRole('button',{name:'Quay về bản đồ',exact:true}).click();await page.locator('[data-place=restaurant]').click();await expect(page.locator('.street-lesson-title')).toHaveText('Bài 5');expect(state.errors).toEqual([]);
});
