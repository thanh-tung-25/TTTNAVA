import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {extractChinese} from '../backend/src/services/chinese-import.js';
import {setSchema,issues} from '../backend/src/validators/chinese.js';

let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+decodeURIComponent(pathname));if(pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});

async function mock(page,{mixed=false,legacy=false}={}){
 const state={role:'admin',requests:[],destination:null,set:null,items:[]};
 const lesson={id:randomUUID(),level_id:1,title:'Bài 3 · 很高兴认识你',position:3,status:'draft',description:'',image_url:''};state.lesson=lesson;
 if(mixed){state.set={id:randomUUID(),lesson_id:lesson.id,level_id:1,title:'Từ vựng và câu hỏi',lesson_title:lesson.title,status:'published',lesson_status:'published'};lesson.status='published';state.items=[{id:randomUUID(),kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'xin chào'}},{id:randomUUID(),kind:'question',data:{prompt:'“请问” (qǐngwèn) có nghĩa là gì?',type:'choice',options:['xin hỏi','sách'],accepted:['xin hỏi'],explanation:'Lời giải kín',approved:true}},{id:randomUUID(),kind:'reading',data:{text:'你好！很高兴认识你。'}}];}
 await page.addInitScript(()=>{
  localStorage.setItem('ttnava-course','hsk-1');window.__spoken=[];
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-CN',name:'Chinese'}],cancel:()=>{},speak:u=>window.__spoken.push({text:u.text,lang:u.lang})}});
 });
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,method=req.method();state.requests.push({path:p,method});let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'teacher',role:state.role,adminScope:'super',username:'co_lan',displayName:'Cô Lan',avatarKey:'gau-truc',grade:null}};
  else if(p.endsWith('/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'HSK 1',unlocked:true};
  else if(p.endsWith('/diamonds/summary'))data={total:0};
  else if(p.endsWith('/runtime'))data={directWordUpload:false};
  else if(p.includes('/chat/'))data=[];
  else if(p.endsWith('/experience/preferences'))data={font_scale:'normal',speech_rate:1};
  else if(p.endsWith('/chinese/catalog')){
   const visible=state.set&&(state.role==='admin'||state.set.status==='published'&&lesson.status==='published');
   const counts=state.items.reduce((all,i)=>{let row=all.find(c=>c.kind===i.kind);if(!row){row={set_id:state.set.id,kind:i.kind,total:0,speaking_total:0};all.push(row);}row.total++;if(i.data.practice==='speaking')row.speaking_total++;return all;},[]);
   const bank=state.items.filter(i=>i.data.practice==='speaking'),assigned=bank.some(i=>i.data.speaking_selected!==undefined)?bank.filter(i=>i.data.speaking_selected!==false):bank.slice(0,3);
   data={levels:[{id:1,title:'HSK 1'}],lessons:[lesson],sets:visible?[{...state.set,speaking_count:assigned.length,activity_count:0}]:[],counts:visible?counts:[],progress:[],reviews:[],completion:[]};
  }else if(p.endsWith('/imports')&&method==='POST'){
   // The API integration test exercises binary multipart. Here use the selected
   // real fixture, since CDP's intercepted multipart text can replace ZIP bytes.
   const body=req.postData(),fields={};for(const name of ['title','destination'])fields[name]=body.match(new RegExp('name="'+name+'"\\r\\n\\r\\n([^\\r]+)'))?.[1];
   const extracted=await extractChinese(await readFile('frontend/assets/templates/chinese-speaking-template.docx'),{destination:fields.destination});state.destination=fields.destination;
   state.set={id:randomUUID(),document_id:randomUUID(),filename:'oral.docx',lesson_id:lesson.id,level_id:1,lesson_title:lesson.title,lesson_status:lesson.status,title:fields.title,status:'draft',activity_count:0};state.items=extracted.items.map(i=>({...i,id:randomUUID()}));data={id:state.set.id,issues:issues(state.items)};
  }else if(p.endsWith('/sets/'+state.set?.id)){
   if(method==='PUT'){
    const body=setSchema.parse(req.postDataJSON()),errors=issues(body.items);if(body.status==='published'&&errors.length)return route.fulfill({status:400,json:{error:{message:'Chưa thể xuất bản',details:errors}}});
    state.set={...state.set,title:body.title,status:body.status,...(body.speaking_settings!==undefined?{speaking_settings:body.speaking_settings}:{})};state.items=body.items;data={id:state.set.id};
   }else data={set:{...state.set,lesson_status:lesson.status},items:state.items.filter(i=>state.role==='admin'||i.data.practice!=='speaking'||i.data.speaking_selected!==false).map(i=>state.role==='admin'?i:i.data.practice==='speaking'?{...i,data:{practice:'speaking',text:i.data.text,speaking_selected:i.data.speaking_selected}}:i),issues:issues(state.items),activities:null,progress:null};
  }else if(p.endsWith('/lessons/'+lesson.id)&&method==='PUT'){Object.assign(lesson,req.postDataJSON());data={id:lesson.id};}
  else if(p.endsWith('/activities'))data={topic:'',status:legacy?'published':'draft',tasks:legacy?['你叫什么名字？','你是哪国人？','你今天好吗？'].map(speech=>({type:'dialogue',speech})):[]};
  return route.fulfill({json:{data}});
 });return state;
}

test('teacher imports Chinese Word, listens, previews an unsaved draft, then publishes to student speaking',async({page})=>{
 const state=await mock(page),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin+'/pages/admin/chinese/?lesson='+state.lesson.id+'&mode=speak');
 await expect(page.locator('.admin-destination')).toContainText('Luyện nói');
 await expect(page.locator('input[name=destination]')).toHaveValue('speaking');
 await page.screenshot({path:'test-results/chinese-admin-speaking-workspace.png',fullPage:true});
 await page.locator('input[type=file]').setInputFiles('frontend/assets/templates/chinese-speaking-template.docx');
 await page.getByRole('button',{name:'Tải lên và kiểm tra',exact:true}).click();
 await expect(page.locator('.admin-speaking-question')).toHaveCount(3);expect(state.destination).toBe('speaking');
 await expect(page.locator('textarea[name=text]').first()).toHaveValue('你叫什么名字？');
 await expect(page.locator('textarea[name=meaning]').first()).toHaveValue('Bạn tên là gì?');
 await page.getByRole('button',{name:'Nghe câu hỏi',exact:false}).first().click();
 expect(await page.evaluate(()=>window.__spoken)).toEqual([{text:'你叫什么名字？',lang:'zh-CN'}]);
 await page.locator('textarea[name=text]').first().fill('你今天好吗？');
 const mutations=()=>state.requests.filter(r=>r.method==='PUT').length;
 await page.getByRole('button',{name:'Xem như học sinh',exact:true}).first().click();
 await expect(page.locator('.admin-student-preview .speaking-studio')).toBeVisible();
 await expect(page.locator('.admin-student-preview')).not.toContainText('Bạn tên là gì?');
 await expect(page.locator('.admin-speaking-edit')).toBeHidden();expect(mutations()).toBe(0);
 await page.screenshot({path:'test-results/chinese-admin-speaking-preview.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/chinese-admin-speaking-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
 await expect(page.locator('textarea[name=text]').first()).toHaveValue('你今天好吗？');
 await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();
 await expect(page.locator('.simple-document')).toContainText('3 câu luyện nói');expect(state.items[0].data.text).toBe('你今天好吗？');expect(state.lesson.status).toBe('published');
 state.role='student';await page.goto(origin+'/pages/student/chinese/');
 await expect(page.getByRole('link',{name:'Luyện nói',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Quiz 20 câu',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Bài đọc',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Luyện nói',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Nghe từng câu, trả lời trong một video'})).toBeVisible();await expect(page.locator('.speaking-studio')).toContainText('Đã nghe 0 / 3 câu');
 await expect(page.locator('#content')).not.toContainText('Bạn tên là gì?');expect(errors).toEqual([]);
});

test('admin sections map to the same student destinations and preview current edits without saving',async({page})=>{
 const state=await mock(page,{mixed:true});
 for(const [key,label,destination]of [['words','Từ mới','vocabulary'],['listen','Luyện nghe','vocabulary'],['quiz','Quiz 20 câu','question'],['read','Bài đọc','reading'],['cards','Thẻ lật','general']]){
  await page.goto(origin+'/pages/admin/chinese/?lesson='+state.lesson.id+'&mode='+key);
  await expect(page.locator('.admin-destination')).toContainText(label);await expect(page.locator('input[name=destination]')).toHaveValue(destination);await expect(page.locator('.simple-document')).toContainText('Học sinh →');
 }
 await page.goto(origin+'/pages/admin/chinese/?set='+state.set.id+'&mode=quiz');
 await page.getByText('Sửa câu hỏi',{exact:true}).click();await page.locator('textarea[name=prompt]').fill('“你好” có nghĩa là gì?');
 await page.getByRole('button',{name:'Xem như học sinh',exact:true}).click();
 const preview=page.locator('.admin-student-preview');await expect(preview.locator('.quiz-prompt')).toHaveText('“你好” có nghĩa là gì?');await expect(preview).not.toContainText('Lời giải kín');
 await preview.getByText('xin hỏi',{exact:true}).click();await preview.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(preview).toContainText('Lời giải kín');
 await preview.getByRole('button',{name:'Từ mới',exact:true}).click();await expect(preview.locator('.hub-table')).toContainText('你好');
 await preview.getByRole('link',{name:'xin chào',exact:true}).click();await expect(preview.locator('.flashcard')).toContainText('你好');
 expect(state.requests.filter(r=>r.method==='PUT'||r.method==='POST')).toEqual([]);
});

test('teacher selects, reorders and saves a two-question video assignment with a custom duration and free listening order',async({page})=>{
 const state=await mock(page);page.on('dialog',d=>d.accept());await page.goto(origin+'/pages/admin/chinese/?lesson='+state.lesson.id+'&mode=speak');await page.locator('input[type=file]').setInputFiles('frontend/assets/templates/chinese-speaking-template.docx');await page.getByRole('button',{name:'Tải lên và kiểm tra',exact:true}).click();await expect(page.locator('.admin-speaking-question')).toHaveCount(3);
 await page.getByRole('combobox',{name:'Thời lượng một video',exact:true}).selectOption('120');await page.getByRole('combobox',{name:'Thứ tự học sinh nghe',exact:true}).selectOption('free');await page.getByLabel('Chọn nhanh số câu đầu',{exact:true}).fill('2');await page.getByRole('button',{name:'Áp dụng số câu',exact:true}).click();await expect(page.locator('.admin-speaking-count')).toHaveText('2/3 câu được giao');
 await page.getByRole('checkbox',{name:'Giao câu 2',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Giao câu 3',exact:true}).check();const thirdText=await page.locator('textarea[name=text]').nth(2).inputValue();await page.locator('.admin-speaking-question').nth(2).getByRole('button',{name:'↑ Lên',exact:true}).click();await page.locator('.admin-speaking-question').nth(1).getByRole('button',{name:'↑ Lên',exact:true}).click();await expect(page.locator('textarea[name=text]').first()).toHaveValue(thirdText);
 await page.getByRole('button',{name:'Xem như học sinh',exact:true}).first().click();await expect(page.locator('.admin-student-preview .speaking-question-button')).toHaveCount(2);await expect(page.locator('.admin-student-preview .speaking-clock')).toHaveText('Còn 02:00');await expect(page.locator('.admin-student-preview')).toContainText('Được chọn thứ tự nghe');expect(state.requests.filter(r=>r.method==='PUT')).toHaveLength(0);
 await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();await expect(page.locator('.simple-document')).toContainText('2 câu luyện nói');expect(state.set.speaking_settings).toEqual({duration_seconds:120,order:'free'});expect(state.items[0].data.text).toBe(thirdText);
 await page.getByRole('link',{name:'Mở tài liệu',exact:true}).click();await expect(page.getByRole('combobox',{name:'Thời lượng một video',exact:true})).toHaveValue('120');await expect(page.getByRole('checkbox',{name:'Giao câu 3',exact:true})).not.toBeChecked();
 state.role='student';await page.goto(origin+'/pages/student/chinese/?set='+state.set.id+'&mode=speak');await expect(page.locator('.speaking-question-button')).toHaveCount(2);await expect(page.locator('.speaking-clock')).toHaveText('Còn 02:00');await expect(page.locator('.speaking-counter')).toHaveText('Đã nghe 0 / 2 câu');
});

test('legacy lesson dialogue can become a configurable speaking assignment without losing quiz content',async({page})=>{
 const state=await mock(page,{mixed:true,legacy:true});page.on('dialog',d=>d.accept());await page.goto(origin+'/pages/admin/chinese/?set='+state.set.id+'&mode=speak');await expect(page.locator('.admin-speaking-question')).toHaveCount(3);await expect(page.locator('.admin-speaking-edit')).toContainText('Hội thoại đang đăng');await page.getByRole('checkbox',{name:'Giao câu 3',exact:true}).uncheck();await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();await expect(page.locator('.simple-document')).toContainText('2 câu luyện nói');expect(state.items.filter(i=>i.kind==='question')).toHaveLength(1);expect(state.items.filter(i=>i.kind==='vocabulary')).toHaveLength(1);expect(state.items.filter(i=>i.data.practice==='speaking'&&i.data.speaking_selected)).toHaveLength(2);
});
