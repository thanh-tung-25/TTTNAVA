import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {speakingQuestions,speakingFilename} from '../frontend/assets/js/chinese-speaking-data.js';

let server,origin;
test.use({permissions:['camera','microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}});
const questions=['请问，这是谁的名片？','你叫什么名字？'];
function audioFixture(){
 const rate=16000,count=rate,bytes=Buffer.alloc(44+count*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(count*2,40);
 for(let n=0;n<count;n++)bytes.writeInt16LE(Math.round(Math.sin(2*Math.PI*220*n/rate)*8000),44+n*2);return bytes;
}
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+decodeURIComponent(pathname));if(pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
async function mock(page,{published=true,audio=true}={}){
 const state={audio,requests:[]};
 await page.addInitScript(()=>{
  localStorage.setItem('ttnava-course','hsk-1');window.__cameraTracks=[];window.__painted=[];
  const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async config=>{const stream=await get(config);window.__cameraTracks.push(...stream.getTracks());return stream;};
  const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(this.canvas.width===800&&this.canvas.height===800)window.__painted.push(String(text));return fill.call(this,text,...args);};
 });
 const lesson={id:'lesson',level_id:1,title:'Bài 3. Trao danh thiếp',status:'published'},set={id:'sample',lesson_id:'lesson',level_id:1,lesson_title:lesson.title,title:'Từ vựng và hội thoại',activity_count:published?2:0};
 const activities=published?{topic:'Trao danh thiếp',tasks:questions.map(speech=>({type:'dialogue',prompt:'Hãy đáp lại với ý: Tôi cũng rất vui.',speech,pinyin:'pinyin bí mật',meaning:'nghĩa bí mật',answer:'đáp án bí mật'}))}:null;
 await page.route('**/api/v1/**',async r=>{
  const req=r.request(),p=new URL(req.url()).pathname;state.requests.push({path:p,method:req.method(),body:req.postData()});
  if(p.endsWith('/question-audio'))return r.fulfill(state.audio?{contentType:'audio/wav',body:audioFixture()}:{status:502,json:{error:{message:'Unavailable'}}});
  let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'student-1',role:'student',username:'ngoc_anh',displayName:'Ngọc Anh',grade:null}};
  else if(p.endsWith('/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'HSK 1',unlocked:true};
  else if(p.endsWith('/diamonds/summary'))data={total:0};
  else if(p.includes('/chat/'))data=[];
  else if(p.endsWith('/experience/preferences'))data={font_scale:'normal',speech_rate:1};
  else if(p.endsWith('/chinese/catalog'))data={levels:[{id:1,title:'HSK 1'}],lessons:[lesson],sets:[set],counts:[{set_id:set.id,kind:'vocabulary',total:1}],reviews:[],progress:[],completion:[]};
  else if(p.endsWith('/chinese/sets/sample'))data={set,activities,items:[{id:'word',kind:'vocabulary',data:{hanzi:'名片',pinyin:'míngpiàn',meaning:'danh thiếp'}}],progress:null};
  return r.fulfill({json:{data}});
 });return state;
}
const open=async page=>{await page.goto(origin+'/pages/student/chinese/?set=sample&mode=speak');await expect(page.getByRole('heading',{name:'Nghe một câu, nói thật tự tin!'})).toBeVisible();};
const camera=async page=>{await page.getByRole('button',{name:'Bật camera & micro',exact:true}).click();await expect(page.getByRole('button',{name:'Bắt đầu quay',exact:true})).toBeEnabled();};
const record=async page=>{await page.getByRole('button',{name:'Bắt đầu quay',exact:true}).click();await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');};

test('uses only published, distinct dialogue prompts and creates safe download names',()=>{
 expect(speakingQuestions(null)).toEqual([]);
 expect(speakingQuestions({tasks:[{type:'dialogue',speech:questions[1]}]},[{kind:'dialogue',data:{practice:'speaking',text:questions[0],meaning:'Nghĩa chỉ dành cho giáo viên'}},{kind:'reading',data:{text:'Không dùng làm câu nói'}}])).toEqual([{text:questions[0]}]);
 expect(speakingQuestions({tasks:[{type:'fix',speech:questions[0]},{type:'dialogue',speech:questions[0]},{type:'dialogue',speech:questions[0]},{type:'dialogue',speech:'Chọn đáp án'},{type:'dialogue',speech:'你'.repeat(181)}]})).toEqual([{text:questions[0]}]);
 const name=speakingFilename({name:'Ngọc Anh / ../',level:1,index:2,code:'ABC12345'},'video/mp4');expect(name).toBe('TTNAVA_HSK1_Cau02_Ngoc_Anh_ABC12345.mp4');
});

test('lesson navigation opens a matching, responsive speaking studio without exposing answers',async({page})=>{
 await mock(page);await page.goto(origin+'/pages/student/chinese/');await page.getByRole('link',{name:'Luyện nói',exact:true}).click();
 await expect(page.getByRole('link',{name:'Luyện nói',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('button',{name:'Bắt đầu quay',exact:true})).toBeDisabled();await expect(page.locator('.speaking-studio')).not.toContainText('bí mật');
 for(const q of questions)await expect(page.locator('.speaking-studio')).not.toContainText(q);
 expect(await page.evaluate(()=>window.__cameraTracks.length)).toBe(0);
 await page.screenshot({path:'test-results/chinese-speaking-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/chinese-speaking-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.chinese-pagebar')).toBeHidden();expect(await page.locator('.speaking-camera').evaluate(e=>e.getBoundingClientRect().top)).toBeLessThan(await page.locator('.speaking-listen').evaluate(e=>e.getBoundingClientRect().top));
});

test('records a real local video with question and student watermark, downloads it, and never uploads media',async({page})=>{
 const state=await mock(page),errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await camera(page);await record(page);
 await expect(page.locator('.speaking-status')).toContainText('Đến lượt bạn!',{timeout:10000});
 for(const q of questions)await expect(page.locator('.speaking-studio')).not.toContainText(q);
 const speech=JSON.parse(state.requests.find(r=>r.path.endsWith('/question-audio')).body).text;
 const drawn=await page.evaluate(()=>window.__painted);expect(drawn).toContain(speech);expect(drawn.some(t=>t.includes('Ngọc Anh')&&t.includes('ngoc_anh'))).toBe(true);expect(drawn.some(t=>t.includes('Bài 3. Trao danh thiếp'))).toBe(true);expect(drawn.some(t=>t.includes('Mã lượt:'))).toBe(true);
 await page.getByRole('button',{name:'Nghe lại câu hỏi',exact:true}).click();await expect(page.locator('.speaking-listen-count')).toContainText('2/2');await expect(page.getByRole('button',{name:'Nghe lại câu hỏi',exact:true})).toBeDisabled();
 await expect(page.locator('.speaking-status')).toContainText('Đến lượt bạn!',{timeout:10000});await page.getByRole('button',{name:'Dừng quay',exact:true}).click();
 await expect(page.locator('.speaking-result')).toBeVisible();await expect(page.locator('.speaking-result-question')).toHaveText(speech);await expect.poll(()=>page.locator('.speaking-result video').evaluate(v=>v.videoWidth)).toBe(800);
 await expect(page.getByRole('button',{name:'Câu tiếp theo →',exact:true})).toBeDisabled();
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Tải video về máy',exact:false}).click()]);
 expect(download.suggestedFilename()).toMatch(/^TTNAVA_HSK1_Cau01_Ngoc_Anh_[A-F0-9]{8}\.(mp4|webm)$/);expect((await stat(await download.path())).size).toBeGreaterThan(1000);
 await page.screenshot({path:'test-results/chinese-speaking-recorded.png',fullPage:true});
 await page.getByRole('button',{name:'Câu tiếp theo →',exact:true}).click();await expect(page.locator('.speaking-counter')).toHaveText('Câu 2 / 2');await expect(page.locator('.speaking-result')).toBeHidden();
 expect(state.requests.filter(r=>r.method!=='GET').every(r=>r.path.endsWith('/question-audio')&&Object.keys(JSON.parse(r.body)).sort().join(',')==='lang,text')).toBe(true);
 await page.getByRole('button',{name:'Tắt camera',exact:true}).click();expect(await page.evaluate(()=>window.__cameraTracks.every(t=>t.readyState==='ended'))).toBe(true);expect(errors).toEqual([]);
});

test('camera denial is actionable and can be retried without creating a recording',async({page})=>{
 await mock(page);await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});
 await open(page);await page.getByRole('button',{name:'Bật camera & micro',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('đang bị chặn');await expect(page.getByRole('button',{name:'Bật camera & micro',exact:true})).toBeEnabled();await expect(page.locator('.speaking-result')).toBeHidden();
});

test('audio failures do not produce a silent recording and recover after retry',async({page})=>{
 const state=await mock(page,{audio:false});await open(page);await camera(page);await page.getByRole('button',{name:'Bắt đầu quay',exact:true}).click();
 await expect(page.locator('.speaking-status')).toContainText('Chưa tải được giọng đọc');await expect(page.locator('.speaking-result')).toBeHidden();await expect(page.getByRole('button',{name:'Bắt đầu quay',exact:true})).toBeEnabled();
 state.audio=true;await record(page);await expect(page.locator('.speaking-status')).toContainText('Đến lượt bạn!',{timeout:10000});await page.getByRole('button',{name:'Dừng quay',exact:true}).click();await expect(page.locator('.speaking-result')).toBeVisible();
});

test('retakes hide the previous question and preserve the old video if preparation fails',async({page})=>{
 const state=await mock(page);await open(page);await camera(page);await record(page);await expect(page.locator('.speaking-status')).toContainText('Đến lượt bạn!',{timeout:10000});await page.getByRole('button',{name:'Dừng quay',exact:true}).click();await expect(page.locator('.speaking-result')).toBeVisible();
 const original=await page.locator('.speaking-download').getAttribute('href');state.audio=false;
 await page.getByRole('button',{name:'Quay lại câu này',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('Chưa tải được giọng đọc');await expect(page.locator('.speaking-result')).toBeVisible();await expect(page.locator('.speaking-download')).toHaveAttribute('href',original);
 state.audio=true;await page.getByRole('button',{name:'Quay lại câu này',exact:true}).click();await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');await expect(page.locator('.speaking-result')).toBeHidden();
 await expect(page.locator('.speaking-status')).toContainText('Đến lượt bạn!',{timeout:10000});await page.getByRole('button',{name:'Dừng quay',exact:true}).click();await expect(page.locator('.speaking-result')).toBeVisible();expect(await page.locator('.speaking-download').getAttribute('href')).not.toBe(original);
});

test('leaving the active screen stops capture and keeps the partial video available locally',async({page})=>{
 await mock(page);await open(page);await camera(page);await record(page);await expect(page.locator('.speaking-status')).toContainText('Đến lượt bạn!',{timeout:10000});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('.speaking-result')).toBeVisible();await expect(page.locator('.speaking-status')).toContainText('rời màn hình');expect(await page.evaluate(()=>window.__cameraTracks.every(t=>t.readyState==='ended'))).toBe(true);
});

test('recording stops automatically after thirty seconds',async({page})=>{
 await mock(page);await open(page);await camera(page);await record(page);await expect(page.locator('.speaking-result')).toBeVisible({timeout:35000});await expect(page.locator('.speaking-status')).toContainText('Đã đủ 30 giây');
});

test('unsupported browsers and lessons without published dialogue have a usable fallback',async({page})=>{
 await mock(page);await page.addInitScript(()=>Object.defineProperty(window,'MediaRecorder',{value:undefined,configurable:true}));await open(page);await expect(page.locator('.speaking-status')).toContainText('chưa hỗ trợ quay video');await expect(page.getByRole('button',{name:'Bật camera & micro',exact:true})).toBeDisabled();
 await page.unrouteAll();await mock(page,{published:false});await page.goto(origin+'/pages/student/chinese/?set=sample&mode=speak');await expect(page.locator('#content')).toContainText('chưa có câu hỏi phù hợp');await expect(page.locator('.speaking-studio')).toHaveCount(0);
});
