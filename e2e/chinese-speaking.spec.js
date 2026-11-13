import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {speakingQuestions,speakingFilename} from '../frontend/assets/js/chinese-speaking-data.js';
let server,origin;
test.use({permissions:['microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}});
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
async function mock(page,{published=true,audio=true,configured=true,settings={duration_seconds:90,order:'sequential'}}={}){
 const state={audio,configured,requests:[],clips:[],role:'student',submission:null,failFinish:false,failAvailability:false};
 await page.addInitScript(()=>{
  localStorage.setItem('ttnava-course','hsk-1');window.__micTracks=[];window.__mediaRequests=[];window.__recorderKinds=[];window.__recorders=0;window.__failRecord=false;
  const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async config=>{window.__mediaRequests.push(config);const stream=await get(config);window.__micTracks.push(...stream.getTracks());return stream;};
  const Recorder=window.MediaRecorder;window.MediaRecorder=class extends Recorder{constructor(...args){if(window.__failRecord)throw Error('Chưa mở được bộ ghi mới');super(...args);window.__recorders++;window.__recorderKinds.push(args[0].getTracks().map(track=>track.kind));}};
 });
 const lesson={id:'lesson',level_id:1,title:'Bài 3. Trao danh thiếp',status:'published'},set={id:'sample',lesson_id:'lesson',level_id:1,lesson_title:lesson.title,title:'Nghe và trả lời',activity_count:published?3:0,speaking_settings:settings};
 const activities=published?{topic:'Trao danh thiếp',tasks:questions.map(speech=>({type:'dialogue',prompt:'Hãy đáp lại với ý: Tôi cũng rất vui.',speech,pinyin:'pinyin bí mật',meaning:'nghĩa bí mật',answer:'đáp án bí mật'}))}:null;
 await page.route('**/api/v1/**',async r=>{
  const req=r.request(),p=new URL(req.url()).pathname;state.requests.push({path:p,method:req.method(),body:req.postData()});
  if(p.endsWith('/question-audio'))return r.fulfill(state.audio?{contentType:'audio/wav',body:audioFixture()}:{status:502,json:{error:{message:'Unavailable'}}});let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'student-1',role:state.role,adminScope:'chinese',username:'ngoc_anh',displayName:'Ngọc Anh',grade:null}};
  else if(p.endsWith('/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'HSK 1',unlocked:true};else if(p.endsWith('/diamonds/summary'))data={total:0};else if(p.includes('/chat/'))data=[];else if(p.endsWith('/experience/preferences'))data={font_scale:'normal',speech_rate:1};
  else if(p.endsWith('/chinese/catalog'))data={levels:[{id:1,title:'HSK 1'}],lessons:[lesson],sets:[set],counts:[{set_id:set.id,kind:'vocabulary',total:1}],reviews:[],progress:[],completion:[]};
  else if(p.endsWith('/chinese/sets/sample'))data={set,activities,items:[{id:'word',kind:'vocabulary',data:{hanzi:'名片',pinyin:'míngpiàn',meaning:'danh thiếp'}}],progress:null};
  else if(p.endsWith('/speaking/availability')){
   if(state.failAvailability)return r.fulfill({status:503,json:{error:{message:'Unavailable'}}});
   data={configured:state.configured,reason:state.configured?'':'Chấm AI chưa được bật. Bạn vẫn có thể ghi âm, nghe lại và tải bản ghi tùy ý.'};
  }
  else if(p.endsWith('/sets/sample/speaking-submissions')){const body=req.postDataJSON();state.submission={id:'result-1',student_id:'student-1',username:'ngoc_anh',display_name:'Ngọc Anh',recording_code:body.recording_id.slice(0,8).toUpperCase(),recorded_at:body.recorded_at,created_at:body.recorded_at,level_id:1,lesson_title:lesson.title,set_title:set.title,status:'pending',score:null,result:null};data={id:state.submission.id};}
  else if(/\/clips\/\d+\/\d+$/.test(p)){
   const body=req.postDataBuffer(),start=body.indexOf(Buffer.from('RIFF')),size=start>=0?body.readUInt32LE(start+4)+8:0;
   expect(start).toBeGreaterThan(0);expect(size).toBeGreaterThan(3243);expect(size).toBeLessThanOrEqual(800044);expect(body.toString('ascii',start+8,start+16)).toBe('WAVEfmt ');
   state.clips.push({question:Number(p.split('/').at(-2)),chunk:Number(p.split('/').at(-1)),bytes:size});data={processed:true};
  }else if(p.endsWith('/speaking-submissions/result-1/finish')){
   if(state.failFinish){state.failFinish=false;state.submission.status='failed';return r.fulfill({status:502,json:{error:{message:'Dịch vụ chấm đang bận, thử lại nhé.'}}});}
   state.submission.status='completed';state.submission.score=86;state.submission.result={overall_score:86,scored_count:3,question_count:3,assessment_mode:'content_grammar',weights:{content:60,grammar:40,pronunciation:0,fluency:0},notice:'Điểm dựa trên bản nhận diện: đúng ý 60%, từ và ngữ pháp 40%. Chưa chấm phát âm hoặc thanh điệu.',questions:questions.map((question,n)=>({index:n+1,question,transcript:'我叫安。',status:'scored',score:86,content_score:90,grammar_score:80,pronunciation_score:null,fluency_score:null,feedback:'Con trả lời đúng ý.',correction:'我叫安。',correction_pinyin:'Wǒ jiào Ān.',errors:[{original:'我叫是安',suggestion:'我叫安',explanation:'Bỏ từ 是 sau 叫.'}],practice_words:[]}))};data=state.submission;
  }else if(p.endsWith('/speaking-submissions/result-1'))data=state.submission;
  else if(p.endsWith('/speaking-results'))data=state.submission?[state.submission]:[];
  return r.fulfill({json:{data}});
 });return state;
}
const open=async page=>{await page.goto(origin+'/pages/student/chinese/?set=sample&mode=speak');await expect(page.getByRole('heading',{name:'Nghe câu hỏi, ghi âm trả lời'})).toBeVisible();};
const microphone=async page=>{await page.getByRole('button',{name:'Bật micro',exact:true}).click();await expect(page.getByRole('button',{name:'Bắt đầu ghi âm',exact:true})).toBeEnabled();};
const record=async page=>{await page.getByRole('button',{name:'Bắt đầu ghi âm',exact:true}).click();await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');};
const hear=async(page,n,times=1)=>{const b=page.locator(`.speaking-question-button[data-question="${n}"]`);await b.click();await expect(b.locator('small')).toHaveText(`Đã nghe · ${times}/2`);await expect(page.locator('.speaking-state')).toHaveText('● Đang ghi âm');};
const stop=async page=>{await page.getByRole('button',{name:'Dừng ghi âm',exact:true}).click();await expect(page.locator('.speaking-result')).toBeVisible();};

const recordAnswers=async page=>{
 await open(page);await microphone(page);await record(page);
 for(const n of [1,2,3]){await hear(page,n);await page.waitForTimeout(350);}
 await stop(page);
};

test('grades microphone-only answers after explicit submission and shows the same stored result to the Chinese admin',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await mock(page,{settings:{duration_seconds:90,order:'sequential',ai_assessment:true}}),errors=[];page.on('pageerror',error=>errors.push(error.message));let downloads=0;page.on('download',()=>downloads++);
 await recordAnswers(page);expect(state.clips).toEqual([]);expect(downloads).toBe(0);
 const recordingUrl=await page.locator('.speaking-result audio').getAttribute('src');expect(recordingUrl).toMatch(/^blob:/);
 await page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true}).click();
 await expect(page.locator('.speaking-ai-score')).toHaveText('86/100');await expect(page.locator('.speaking-ai-question')).toHaveCount(3);
 await expect(page.locator('.speaking-ai-metrics dt')).toHaveText(['Đúng ý','Từ & ngữ pháp','Đúng ý','Từ & ngữ pháp','Đúng ý','Từ & ngữ pháp']);
 await expect(page.locator('.speaking-ai-panel')).toContainText('Đã gửi kết quả cho cô');
 expect([...new Set(state.clips.map(c=>c.question))]).toEqual([1,2,3]);expect(downloads).toBe(0);
 await expect(page.locator('.speaking-result audio')).toHaveAttribute('src',recordingUrl);await expect(page.getByRole('button',{name:'Đã gửi kết quả cho cô',exact:true})).toBeDisabled();
 expect(state.requests.filter(r=>r.method==='POST'&&!r.path.endsWith('/question-audio')).every(r=>r.path.includes('speaking-submissions'))).toBe(true);
 expect(state.requests.some(r=>r.method==='POST'&&/video|storage|upload/i.test(r.path))).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/speaking-ai-student-mobile.png',fullPage:true});
 state.role='admin';await page.goto(origin+'/pages/admin/chinese/?view=speaking-results');
 await expect(page.getByRole('heading',{name:'Kết quả luyện nói',exact:true})).toBeVisible();
 const row=page.locator('.speaking-result-row');await expect(row).toContainText('Ngọc Anh');await expect(row).toContainText(state.submission.recording_code);await row.locator('summary').click();
 await expect(row.locator('.speaking-ai-question')).toHaveCount(3);await expect(row).toContainText('我叫安');await expect(row).toContainText('Bỏ từ 是 sau 叫.');
 await expect(page.locator('#content video,#content audio')).toHaveCount(0);
 await page.locator('select[name=status]').selectOption('needs_review');await expect(page.locator('.speaking-result-row')).toHaveCount(0);
 await page.locator('select[name=status]').selectOption('');await page.screenshot({path:'test-results/speaking-ai-admin-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('provider failure preserves the local recording and allows retry; downloading remains optional',async({page})=>{
 const state=await mock(page,{settings:{duration_seconds:90,order:'sequential',ai_assessment:true}});state.failFinish=true;await recordAnswers(page);
 const recordingUrl=await page.locator('.speaking-download').getAttribute('href');await page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true}).click();
 await expect(page.locator('.speaking-ai-panel')).toContainText('Dịch vụ chấm đang bận');await expect(page.locator('.speaking-download')).toHaveAttribute('href',recordingUrl);
 await expect(page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true})).toBeEnabled();await page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true}).click();
 await expect(page.locator('.speaking-ai-score')).toHaveText('86/100');
 const event=page.waitForEvent('download');await page.locator('.speaking-download').click();expect((await event).suggestedFilename()).toContain(state.submission.recording_code);
});

test('unconfigured AI leaves audio recording usable and sends no audio for grading',async({page})=>{
 const state=await mock(page,{configured:false,settings:{duration_seconds:90,order:'sequential',ai_assessment:true}});await recordAnswers(page);
 await expect(page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true})).toBeDisabled();await expect(page.locator('.speaking-ai-panel')).toContainText('Chấm AI chưa được bật');
 expect(state.clips).toEqual([]);expect(state.requests.filter(r=>r.method==='POST').every(r=>r.path.endsWith('/question-audio'))).toBe(true);
 await expect(page.locator('.speaking-download')).toHaveAttribute('href',/^blob:/);await page.getByRole('button',{name:'Ghi âm lại',exact:true}).click();await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');
});

test('rechecks AI after configuration changes and grades the same recording without reloading',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await mock(page,{configured:false,settings:{duration_seconds:90,order:'sequential',ai_assessment:true}});
 await recordAnswers(page);await expect(page.locator('.speaking-ai-panel')).toContainText('Chấm AI chưa được bật');
 const recordingUrl=await page.locator('.speaking-download').getAttribute('href');state.configured=true;
 await page.getByRole('button',{name:'Kiểm tra lại AI',exact:true}).click();
 await expect(page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Kiểm tra lại AI',exact:true})).toBeHidden();
 await expect(page.locator('.speaking-download')).toHaveAttribute('href',recordingUrl);expect(await page.evaluate(()=>window.__recorders)).toBe(1);
 expect(state.requests.filter(r=>r.method==='POST').every(r=>r.path.endsWith('/question-audio'))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true}).click();await expect(page.locator('.speaking-ai-score')).toHaveText('86/100');
 await expect(page.locator('.speaking-result audio')).toHaveAttribute('src',recordingUrl);
 const checked=state.requests.filter(r=>r.path.endsWith('/speaking/availability')).length;
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 expect(state.requests.filter(r=>r.path.endsWith('/speaking/availability'))).toHaveLength(checked);await expect(page.locator('.speaking-ai-score')).toHaveText('86/100');
});

test('a failed status check disables stale availability and recovers on return without losing the recording',async({page})=>{
 const state=await mock(page,{settings:{duration_seconds:90,order:'sequential',ai_assessment:true}});
 await open(page);await microphone(page);await record(page);await hear(page,1);await page.waitForTimeout(350);state.failAvailability=true;await stop(page);
 await expect(page.locator('.speaking-ai-panel')).toContainText('Chưa kiểm tra được dịch vụ chấm');await expect(page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true})).toBeDisabled();
 const recordingUrl=await page.locator('.speaking-download').getAttribute('href');state.failAvailability=false;
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.getByRole('button',{name:'AI chấm bài & gửi cô',exact:true})).toBeEnabled();
 await expect(page.locator('.speaking-download')).toHaveAttribute('href',recordingUrl);expect(state.clips).toEqual([]);expect(await page.evaluate(()=>window.__recorders)).toBe(1);
});

test('uses the assigned order, defaults to three source questions, and creates safe session filenames',()=>{
 expect(speakingQuestions(null)).toEqual([]);expect(speakingQuestions({tasks:[{type:'dialogue',speech:questions[1]}]},[{kind:'dialogue',data:{practice:'speaking',speaking_selected:true,text:questions[0],meaning:'Nghĩa chỉ dành cho cô'}},{kind:'dialogue',data:{practice:'speaking',speaking_selected:false,text:questions[1]}}])).toEqual([{text:questions[0]}]);
 expect(speakingFilename({name:'Ngọc Anh / ../',level:1,total:3,code:'ABC12345'},'audio/mp4')).toBe('TTNAVA_HSK1_BaiNoi_3Cau_Ngoc_Anh_ABC12345.m4a');
});
test('shows numbered audio buttons without exposing questions or opening devices and stays responsive',async({page})=>{
 await mock(page);await page.goto(origin+'/pages/student/chinese/');await page.getByRole('button',{name:'Luyện nói với AI',exact:true}).click();await page.getByRole('link',{name:'Luyện nói theo bài',exact:true}).click();await expect(page.locator('.speaking-question-button')).toHaveCount(3);await expect(page.locator('.speaking-clock')).toHaveText('Còn 01:30');
 for(const b of await page.locator('.speaking-question-button').all())await expect(b).toBeDisabled();for(const q of questions)await expect(page.locator('.speaking-studio')).not.toContainText(q);await expect(page.locator('.speaking-studio')).not.toContainText('bí mật');expect(await page.evaluate(()=>window.__micTracks.length)).toBe(0);
 await page.screenshot({path:'test-results/chinese-speaking-desktop.png',fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/chinese-speaking-mobile.png',fullPage:true,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const viewport of [{width:320,height:568},{width:360,height:800},{width:390,height:844}])test(`mobile ${viewport.width}: recording controls stay beside a long question list and preserve the same recording on resize`,async({page})=>{
 await page.setViewportSize(viewport);const state=await mock(page);
 const bank=['你叫什么名字？','你是哪国人？','你住在哪里？','你今年多大？','你喜欢喝什么？','你喜欢吃什么？','你今天忙吗？','你在哪儿工作？'];
 await page.route('**/api/v1/chinese/sets/sample',r=>r.fulfill({json:{data:{set:{id:'sample',level_id:1,lesson_id:'lesson',lesson_title:'Nghe và trả lời',speaking_settings:{duration_seconds:120,order:'free'}},items:bank.map((text,n)=>({id:'spoken-'+n,kind:'dialogue',data:{practice:'speaking',speaking_selected:true,text}})),activities:null,progress:null}}}));
 await open(page);await expect(page.locator('.speaking-listen > .speaking-recorder')).toHaveCount(1);
 await microphone(page);await record(page);await hear(page,1);
 const last=page.locator('.speaking-question-button').last();await last.scrollIntoViewIfNeeded();
 const bounds=await page.evaluate(()=>{const recorder=document.querySelector('.speaking-recorder').getBoundingClientRect(),question=[...document.querySelectorAll('.speaking-question-button')].at(-1).getBoundingClientRect(),stop=document.querySelector('.speaking-stop').getBoundingClientRect();return {recorderBottom:recorder.bottom,questionTop:question.top,stopTop:stop.top,stopBottom:stop.bottom,height:innerHeight};});
 expect(bounds.stopTop).toBeGreaterThanOrEqual(70);expect(bounds.stopBottom).toBeLessThanOrEqual(viewport.height-78);
 expect(bounds.questionTop).toBeGreaterThanOrEqual(bounds.recorderBottom);
 await hear(page,8);await page.screenshot({path:'test-results/speaking-compact-'+viewport.width+'.png',animations:'disabled'});
 await page.setViewportSize({width:1280,height:950});await expect(page.locator('.speaking-grid > .speaking-recorder')).toHaveCount(1);
 await page.setViewportSize(viewport);await expect(page.locator('.speaking-listen > .speaking-recorder')).toHaveCount(1);
 await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');expect(await page.evaluate(()=>window.__recorders)).toBe(1);
 await stop(page);await expect(page.locator('.speaking-result audio')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(state.requests.filter(r=>r.method==='POST').every(r=>r.path.endsWith('/question-audio'))).toBe(true);
});
test('records a real audio-only answer file, enforces listens and closes the microphone without requesting camera',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.captureStream=undefined;});
 const state=await mock(page),errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await microphone(page);await record(page);expect(await page.evaluate(()=>window.__recorders)).toBe(1);
 await expect(page.locator('.speaking-question-button').nth(1)).toBeDisabled();await hear(page,1);await hear(page,1,2);await expect(page.locator('.speaking-question-button').first()).toBeDisabled();await hear(page,2);await hear(page,3);
 expect(await page.evaluate(()=>window.__recorders)).toBe(1);await expect(page.locator('.speaking-counter')).toHaveText('Đã nghe 3 / 3 câu');
 expect(await page.evaluate(()=>window.__mediaRequests.every(config=>config.video===false&&config.audio.echoCancellation))).toBe(true);
 expect(await page.evaluate(()=>window.__recorderKinds)).toEqual([['audio']]);await expect(page.locator('.speaking-studio video,.speaking-studio canvas')).toHaveCount(0);
 await stop(page);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 3/3');await expect(page.locator('.speaking-result-timeline li')).toHaveCount(3);
 const event=page.waitForEvent('download');await page.locator('.speaking-download').click();const download=await event;expect(download.suggestedFilename()).toMatch(/BaiNoi_3Cau_Ngoc_Anh_.*\.(m4a|webm|ogg)$/);expect((await stat(await download.path())).size).toBeGreaterThan(1000);
 const audio=await page.evaluate(async()=>{const player=document.querySelector('.speaking-result audio');await player.play();player.pause();const response=await fetch(player.src);return {type:(await response.blob()).type};});expect(audio.type).toMatch(/^audio\//);
 expect(state.requests.filter(r=>r.method!=='GET').every(r=>r.path.endsWith('/question-audio')&&Object.keys(JSON.parse(r.body)).sort().join(',')==='lang,text')).toBe(true);
 expect(await page.evaluate(()=>window.__micTracks.every(t=>t.readyState==='ended'))).toBe(true);expect(errors).toEqual([]);
});
test('supports teacher-selected free order and identifies incomplete recordings',async({page})=>{
 await mock(page,{settings:{duration_seconds:120,order:'free'}});await open(page);await microphone(page);await record(page);await expect(page.locator('.speaking-clock')).toHaveText('Còn 02:00');await hear(page,3);await expect(page.locator('.speaking-question-button').first()).toBeEnabled();await stop(page);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 1/3 câu');await expect(page.locator('.speaking-result-question')).toContainText('Chưa nghe đủ');
});
test('microphone denial can be retried without losing the assignment',async({page})=>{
 await mock(page);await open(page);await page.evaluate(()=>{window.__getMicrophone=navigator.mediaDevices.getUserMedia;navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});await page.getByRole('button',{name:'Bật micro',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('đang bị chặn');await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=window.__getMicrophone;});await microphone(page);await record(page);await hear(page,1);await stop(page);
});
test('prepares all audio before capture, and an audio failure can be retried',async({page})=>{
 const state=await mock(page,{audio:false});await open(page);await microphone(page);await page.getByRole('button',{name:'Bắt đầu ghi âm',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('Chưa tải được giọng đọc');expect(await page.evaluate(()=>window.__recorders)).toBe(0);await expect(page.locator('.speaking-result')).toBeHidden();state.audio=true;await microphone(page);await record(page);await hear(page,1);await stop(page);
});
test('retakes the entire same assignment, resets the clock and listens, and preserves the old recording if the new recorder fails',async({page})=>{
 await mock(page);await open(page);await microphone(page);await record(page);await hear(page,1);await hear(page,2);await hear(page,3);await stop(page);const old=await page.locator('.speaking-download').getAttribute('href');
 await page.evaluate(()=>{window.__failRecord=true;});await page.getByRole('button',{name:'Ghi âm lại',exact:true}).click();await expect(page.locator('.speaking-status')).toContainText('Chưa mở được bộ ghi mới');await expect(page.locator('.speaking-download')).toHaveAttribute('href',old);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 3/3');
 await page.evaluate(()=>{window.__failRecord=false;});await page.getByRole('button',{name:'Ghi âm lại',exact:true}).click();await expect(page.locator('.speaking-studio')).toHaveAttribute('data-phase','recording');await expect(page.locator('.speaking-counter')).toHaveText('Đã nghe 0 / 3 câu');await expect(page.locator('.speaking-clock')).toHaveText('Còn 01:30');await expect(page.locator('.speaking-result')).toBeHidden();await expect(page.locator('.speaking-question-button').nth(1)).toBeDisabled();await hear(page,1);await stop(page);expect(await page.locator('.speaking-download').getAttribute('href')).not.toBe(old);await expect(page.locator('.speaking-result-question')).toContainText('Đã nghe 1/3');
});
test('leaving the active screen stops devices and keeps the partial recording available',async({page})=>{
 await mock(page);await open(page);await microphone(page);await record(page);await hear(page,1);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('.speaking-result')).toBeVisible();await expect(page.locator('.speaking-status')).toContainText('rời màn hình');expect(await page.evaluate(()=>window.__micTracks.every(t=>t.readyState==='ended'))).toBe(true);
});
for(const seconds of [90,120])test(`automatically ends at the assigned ${seconds} seconds`,async({page})=>{
 await page.clock.install();await mock(page,{settings:{duration_seconds:seconds,order:'sequential'}});await open(page);await microphone(page);await record(page);await page.waitForTimeout(500);await page.clock.fastForward(seconds*1000);await expect(page.locator('.speaking-result')).toBeVisible();await expect(page.locator('.speaking-status')).toContainText(`Đã đủ ${seconds} giây`);await expect(page.locator('.speaking-clock')).toHaveText('Còn 00:00');
});
test('unsupported browsers and empty lessons have a usable fallback',async({page})=>{
 await mock(page);await page.addInitScript(()=>Object.defineProperty(window,'MediaRecorder',{value:undefined,configurable:true}));await open(page);await expect(page.locator('.speaking-status')).toContainText('chưa hỗ trợ ghi âm');await expect(page.getByRole('button',{name:'Bật micro',exact:true})).toBeDisabled();await page.unrouteAll();await mock(page,{published:false});await page.goto(origin+'/pages/student/chinese/?set=sample&mode=speak');await expect(page.locator('#content')).toContainText('chưa có câu hỏi phù hợp');
});
