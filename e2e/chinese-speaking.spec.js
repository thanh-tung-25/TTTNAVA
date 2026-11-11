import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {speakingQuestions,speakingFilename} from '../frontend/assets/js/chinese-speaking-data.js';
let server,origin;
test.use({permissions:['camera','microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}});
const questions=['请问，这是谁的名片？','你叫什么名字？','你今天好吗？'];
function audioFixture(){
 const rate=16000,count=rate/3,bytes=Buffer.alloc(44+count*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(count*2,40);
 for(let n=0;n<Math.floor(count);n++)bytes.writeInt16LE(Math.round(Math.sin(2*Math.PI*220*n/rate)*8000),44+n*2);return bytes;
}
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+decodeURIComponent(pathname));if(pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
async function mock(page,{published=true,audio=true,settings={duration_seconds:90,order:'sequential'}}={}){
 const state={audio,requests:[]};
 await page.addInitScript(()=>{
  localStorage.setItem('ttnava-course','hsk-1');window.__cameraTracks=[];window.__painted=[];window.__recorders=0;window.__failRecord=false;
  const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async config=>{const stream=await get(config);window.__cameraTracks.push(...stream.getTracks());return stream;};
  const Recorder=window.MediaRecorder;window.MediaRecorder=class extends Recorder{constructor(...args){if(window.__failRecord)throw Error('Chưa mở được bộ ghi mới');super(...args);window.__recorders++;}};
  const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(this.canvas.width===800&&this.canvas.height===800)window.__painted.push(String(text));return fill.call(this,text,...args);};
 });
 const lesson={id:'lesson',level_id:1,title:'Bài 3. Trao danh thiếp',status:'published'},set={id:'sample',lesson_id:'lesson',level_id:1,lesson_title:lesson.title,title:'Nghe và trả lời',activity_count:published?3:0,speaking_settings:settings};
 const activities=published?{topic:'Trao danh thiếp',tasks:questions.map(speech=>({type:'dialogue',prompt:'Hãy đáp lại với ý: Tôi cũng rất vui.',speech,pinyin:'pinyin bí mật',meaning:'nghĩa bí mật',answer:'đáp án bí mật'}))}:null;
 await page.route('**/api/v1/**',async r=>{
  const req=r.request(),p=new URL(req.url()).pathname;state.requests.push({path:p,method:req.method(),body:req.postData()});
  if(p.endsWith('/question-audio'))return r.fulfill(state.audio?{contentType:'audio/wav',body:audioFixture()}:{status:502,json:{error:{message:'Unavailable'}}});let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'student-1',role:'student',username:'ngoc_anh',displayName:'Ngọc Anh',grade:null}};
  else if(p.endsWith('/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'HSK 1',unlocked:true};else if(p.endsWith('/diamonds/summary'))data={total:0};else if(p.includes('/chat/'))data=[];else if(p.endsWith('/experience/preferences'))data={font_scale:'normal',speech_rate:1};
  else if(p.endsWith('/chinese/catalog'))data={levels:[{id:1,title:'HSK 1'}],lessons:[lesson],sets:[set],counts:[{set_id:set.id,kind:'vocabulary',total:1}],reviews:[],progress:[],completion:[]};
  else if(p.endsWith('/chinese/sets/sample'))data={set,activities,items:[{id:'word',kind:'vocabulary',data:{hanzi:'名片',pinyin:'míngpiàn',meaning:'danh thiếp'}}],progress:null};return r.fulfill({json:{data}});
 });return state;
}
const open=async page=>{await page.goto(origin+'/pages/student/chinese/?set=sample&mode=speak');await expect(page.getByRole('heading',{name:'Nghe từng câu, trả lời trong một video'})).toBeVisible();};
const camera=async page=>{await page.getByRole('button',{name:'Bật camera & micro',exact:true}).click();await expect(page.getByRole('button',{name:'Bắt đầu quay',exact:true})).toBeEnabled();};
const record=async page=>{await page.getByRole('button',{name:'Bắt đầu quay',exact:true}).click();await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');};
const hear=async(page,n,times=1)=>{const b=page.locator(`.speaking-question-button[data-question="${n}"]`);await b.click();await expect(b.locator('small')).toHaveText(`Đã nghe · ${times}/2`);await expect(page.locator('.speaking-state')).toHaveText('● Đang quay');};
const stop=async page=>{await page.getByRole('button',{name:'Dừng quay',exact:true}).click();await expect(page.locator('.speaking-result')).toBeVisible();};

test('uses the assigned order, defaults to three source questions, and creates safe session filenames',()=>{
 expect(speakingQuestions(null)).toEqual([]);expect(speakingQuestions({tasks:[{type:'dialogue',speech:questions[1]}]},[{kind:'dialogue',data:{practice:'speaking',speaking_selected:true,text:questions[0],meaning:'Nghĩa chỉ dành cho cô'}},{kind:'dialogue',data:{practice:'speaking',speaking_selected:false,text:questions[1]}}])).toEqual([{text:questions[0]}]);
 expect(speakingFilename({name:'Ngọc Anh / ../',level:1,total:3,code:'ABC12345'},'video/mp4')).toBe('TTNAVA_HSK1_BaiNoi_3Cau_Ngoc_Anh_ABC12345.mp4');
});
test('shows numbered audio buttons without exposing questions or opening devices and stays responsive',async({page})=>{
 await mock(page);await page.goto(origin+'/pages/student/chinese/');await page.getByRole('link',{name:'Luyện nói',exact:true}).click();await expect(page.locator('.speaking-question-button')).toHaveCount(3);await expect(page.locator('.speaking-clock')).toHaveText('Còn 01:30');
 for(const b of await page.locator('.speaking-question-button').all())await expect(b).toBeDisabled();for(const q of questions)await expect(page.locator('.speaking-studio')).not.toContainText(q);await expect(page.locator('.speaking-studio')).not.toContainText('bí mật');expect(await page.evaluate(()=>window.__cameraTracks.length)).toBe(0);
 await page.screenshot({path:'test-results/chinese-speaking-desktop.png',fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/chinese-speaking-mobile.png',fullPage:true,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('records all question audios and answers into one real video, changes the watermark, enforces per-question listens and downloads locally',async({page})=>{
 const state=await mock(page),errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await camera(page);await record(page);expect(await page.evaluate(()=>window.__recorders)).toBe(1);
 await expect(page.locator('.speaking-question-button').nth(1)).toBeDisabled();await hear(page,1);await hear(page,1,2);await expect(page.locator('.speaking-question-button').first()).toBeDisabled();await hear(page,2);await hear(page,3);
 expect(await page.evaluate(()=>window.__recorders)).toBe(1);await expect(page.locator('.speaking-counter')).toHaveText('Đã nghe 3 / 3 câu');const painted=await page.evaluate(()=>window.__painted);for(const q of questions)expect(painted).toContain(q);expect(painted.some(s=>s.includes('Ngọc Anh'))).toBe(true);expect(painted.some(s=>s.includes('Câu 3/3'))).toBe(true);
 await stop(page);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 3/3');await expect(page.locator('.speaking-result-timeline li')).toHaveCount(3);
 const event=page.waitForEvent('download');await page.locator('.speaking-download').click();const download=await event;expect(download.suggestedFilename()).toMatch(/BaiNoi_3Cau_Ngoc_Anh_.*\.(mp4|webm)$/);expect((await stat(await download.path())).size).toBeGreaterThan(1000);
 expect(state.requests.filter(r=>r.method!=='GET').every(r=>r.path.endsWith('/question-audio')&&Object.keys(JSON.parse(r.body)).sort().join(',')==='lang,text')).toBe(true);
 await page.getByRole('button',{name:'Tắt camera',exact:true}).click();expect(await page.evaluate(()=>window.__cameraTracks.every(t=>t.readyState==='ended'))).toBe(true);expect(errors).toEqual([]);
});
test('supports teacher-selected free order and identifies incomplete recordings',async({page})=>{
 await mock(page,{settings:{duration_seconds:120,order:'free'}});await open(page);await camera(page);await record(page);await expect(page.locator('.speaking-clock')).toHaveText('Còn 02:00');await hear(page,3);await expect(page.locator('.speaking-question-button').first()).toBeEnabled();await stop(page);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 1/3 câu');await expect(page.locator('.speaking-result-question')).toContainText('Chưa nghe đủ');
});
test('camera denial can be retried without losing the assignment',async({page})=>{
 await mock(page);await open(page);await page.evaluate(()=>{window.__getCamera=navigator.mediaDevices.getUserMedia;navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});await page.getByRole('button',{name:'Bật camera & micro',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('đang bị chặn');await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=window.__getCamera;});await camera(page);await record(page);await hear(page,1);await stop(page);
});
test('prepares all audio before capture, and an audio failure can be retried',async({page})=>{
 const state=await mock(page,{audio:false});await open(page);await camera(page);await page.getByRole('button',{name:'Bắt đầu quay',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('Chưa tải được giọng đọc');expect(await page.evaluate(()=>window.__recorders)).toBe(0);await expect(page.locator('.speaking-result')).toBeHidden();state.audio=true;await record(page);await hear(page,1);await stop(page);
});
test('retakes the entire same assignment, resets the clock and listens, and preserves the old video if the new recorder fails',async({page})=>{
 await mock(page);await open(page);await camera(page);await record(page);await hear(page,1);await hear(page,2);await hear(page,3);await stop(page);const old=await page.locator('.speaking-download').getAttribute('href');
 await page.evaluate(()=>{window.__failRecord=true;});await page.getByRole('button',{name:'Quay lại video',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('Chưa mở được bộ ghi mới');await expect(page.locator('.speaking-download')).toHaveAttribute('href',old);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 3/3');
 await page.evaluate(()=>{window.__failRecord=false;});await page.getByRole('button',{name:'Quay lại video',exact:true}).click();await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');await expect(page.locator('.speaking-counter')).toHaveText('Đã nghe 0 / 3 câu');await expect(page.locator('.speaking-clock')).toHaveText('Còn 01:30');await expect(page.locator('.speaking-result')).toBeHidden();await expect(page.locator('.speaking-question-button').nth(1)).toBeDisabled();await hear(page,1);await stop(page);expect(await page.locator('.speaking-download').getAttribute('href')).not.toBe(old);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 1/3');
});
test('leaving the active screen stops devices and keeps the partial video available',async({page})=>{
 await mock(page);await open(page);await camera(page);await record(page);await hear(page,1);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('.speaking-result')).toBeVisible();await expect(page.locator('.speaking-status')).toContainText('rời màn hình');expect(await page.evaluate(()=>window.__cameraTracks.every(t=>t.readyState==='ended'))).toBe(true);
});
for(const seconds of [90,120])test(`automatically ends at the assigned ${seconds} seconds`,async({page})=>{
 await page.clock.install();await mock(page,{settings:{duration_seconds:seconds,order:'sequential'}});await open(page);await camera(page);await record(page);await page.waitForTimeout(500);await page.clock.fastForward(seconds*1000);await expect(page.locator('.speaking-result')).toBeVisible();await expect(page.locator('.speaking-status')).toContainText(`Đã đủ ${seconds} giây`);await expect(page.locator('.speaking-clock')).toHaveText('Còn 00:00');
});
test('unsupported browsers and empty lessons have a usable fallback',async({page})=>{
 await mock(page);await page.addInitScript(()=>Object.defineProperty(window,'MediaRecorder',{value:undefined,configurable:true}));await open(page);await expect(page.locator('.speaking-status')).toContainText('chưa hỗ trợ quay video');await expect(page.getByRole('button',{name:'Bật camera & micro',exact:true})).toBeDisabled();await page.unrouteAll();await mock(page,{published:false});await page.goto(origin+'/pages/student/chinese/?set=sample&mode=speak');await expect(page.locator('#content')).toContainText('chưa có câu hỏi phù hợp');
});
