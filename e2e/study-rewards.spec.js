import {test,expect} from '@playwright/test';
import {query,closePool} from '../backend/src/config/db.js';
import {createTestUser,loginStudent} from '../backend/tests/helpers/index.js';

let learner,teacher,admin,lesson,set,words;
test.beforeAll(async()=>{
 if(process.env.DB_NAME!=='kids_learning_test')throw Error('Isolated test database required');
 learner=await createTestUser();teacher=await createTestUser({role:'admin'});admin=await loginStudent(teacher);
 lesson=(await admin.post('/api/v1/chinese/lessons').send({level_id:1,position:1001,title:'Reward UI',status:'published'})).body.data.id;
 set=(await admin.post('/api/v1/chinese/sets').send({lesson_id:lesson,title:'Reward UI words'})).body.data.id;
 const hanzi=['你','我','他','她','是','人','老师','学生','好','一','二','三'];
 const saved=await admin.put('/api/v1/chinese/sets/'+set).send({title:'Reward UI words',status:'published',items:[...hanzi.map((h,n)=>({kind:'vocabulary',data:{hanzi:h,pinyin:'nǐ',meaning:'Nghĩa '+n}})),...['你好。','我是学生。'].map((text,n)=>({kind:'reading',data:{title:'Bài đọc '+n,text}}))]});expect(saved.status,saved.text).toBe(200);
 words=(await admin.get('/api/v1/chinese/sets/'+set)).body.data.items.filter(i=>i.kind==='vocabulary');
 const activity=await admin.put('/api/v1/chinese/lessons/'+lesson+'/activities').send({revision:0,status:'published',topic:'Reward UI activities',tasks:Array.from({length:10},(_,n)=>({type:'fill',prompt:'Câu '+n+': 我___学生。',answer:'是',explanation:'是 nghĩa là là.'}))});expect(activity.status,activity.text).toBe(200);
});
test.afterAll(async()=>{for(const user of [learner,teacher])if(user)await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);if(lesson)await admin.delete('/api/v1/chinese/lessons/'+lesson);for(const user of [learner,teacher])if(user)await query('DELETE FROM profiles WHERE id=?',[user.id]);await closePool();});
async function login(page){
 await page.addInitScript(()=>{window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-CN',name:'Chinese'}],cancel(){},speak(u){window.__spoken.push(u.text);queueMicrotask(()=>u.onend?.());}}});});
 await page.goto('/pages/login/');await page.locator('[name=username]').fill(learner.username);await page.locator('[name=password]').fill(learner.password);await page.locator('#login-button').click();await page.waitForURL(/\/student\//);await page.evaluate(()=>{localStorage.setItem('ttnava-course','hsk-1');document.cookie='ttnava_course=hsk-1; Path=/; SameSite=Lax';});
}
const open=async(page,mode)=>page.goto('/pages/student/chinese/?set='+set+'&mode='+mode);
const balance=async(page,total)=>expect(page.locator('#diamond-chip span')).toHaveText(String(total));
async function stroke(page,canvas,count=3){
 await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();
 for(let n=0;n<count;n++){const y=b.y+b.height*(.2+n*.1);await page.mouse.move(b.x+b.width*.15,y);await page.mouse.down();await page.mouse.move(b.x+b.width*.75,y+b.height*.05,{steps:8});await page.mouse.up();}
}

test('all self-study sections credit real diamonds and update the Chinese header without duplicate rewards',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await login(page);
 await open(page,'words');for(const word of words.slice(0,5))await page.getByRole('checkbox',{name:'Đã học '+word.data.hanzi,exact:true}).check();await expect(page.locator('.study-reward-status')).toContainText('Đã lưu vào tài khoản');await balance(page,1);
 await page.reload();for(const word of words.slice(0,5))await page.getByRole('checkbox',{name:'Đã học '+word.data.hanzi,exact:true}).check();await expect(page.locator('.study-reward-status')).toContainText('Đã nhận thưởng phần này hôm nay');await balance(page,1);
 await open(page,'listen');await page.getByRole('button',{name:'Bắt đầu chặng 1',exact:true}).click();
 for(const word of words.slice(0,10)){await page.getByRole('button',{name:'Nghe từ tiếng Trung',exact:true}).click();await page.locator('.listening-answer').getByText(word.data.meaning,{exact:true}).click();await page.getByRole('button',{name:'Câu tiếp theo',exact:true}).click();}
 await expect(page.locator('.listening-result .study-reward-status')).toContainText('Đã lưu vào tài khoản');await balance(page,2);
 await open(page,'cards');for(let n=0;n<5;n++){await page.locator('.flashcard').click();await page.getByRole('button',{name:'Đã nhớ',exact:true}).click();}await balance(page,3);
 await open(page,'apply');await page.getByRole('button',{name:'Điền từ',exact:true}).click();for(let n=0;n<10;n++){await page.getByRole('textbox',{name:'Từ cần điền',exact:true}).fill('是');await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await page.getByRole('button',{name:n===9?'Xem kết quả':'Tiếp tục →',exact:true}).click();}await balance(page,4);
 await open(page,'read');for(let n=0;n<2;n++)await page.locator('.card').filter({has:page.getByRole('heading',{name:'Bài đọc '+n,exact:true})}).getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();await balance(page,5);
 await open(page,'cards');await page.locator('summary').filter({hasText:'Tự luyện viết và đọc theo'}).click();
 const writing=page.locator('.card').filter({has:page.getByRole('heading',{name:'Tự luyện viết',exact:true})});await stroke(page,writing.locator('canvas'));await writing.getByRole('button',{name:'Hoàn thành lượt viết',exact:true}).click();await balance(page,6);
 const recording=page.locator('.card').filter({has:page.getByRole('heading',{name:'Luyện đọc theo mẫu',exact:true})});await recording.getByRole('button',{name:'Ghi âm (cho phép microphone)',exact:true}).click();await expect(recording.getByRole('button',{name:'Dừng ghi',exact:true})).toBeEnabled();await page.waitForTimeout(5200);await recording.getByRole('button',{name:'Dừng ghi',exact:true}).click();await recording.getByRole('button',{name:'Hoàn thành lượt đọc',exact:true}).click();await balance(page,7);
 await page.goto('/pages/student/lab/');await stroke(page,page.locator('.experience-lab canvas'),5);await balance(page,8);
 const response=await page.request.get('/api/v1/diamonds/summary');const data=(await response.json()).data;expect(data.programs.chinese.total).toBe(8);expect(data.total).toBe(8);expect(errors).toEqual([]);
});
test('losing a completion response allows a safe retry and never credits the same session twice',async({page})=>{
 await login(page);let lost=false,retryAllowed=false;
 await page.route('**/api/v1/experience/study-sessions/*/finish',async route=>{
  if(!retryAllowed){if(!lost){await route.fetch();lost=true;}return route.fulfill({status:503,json:{error:{code:'BUSY',message:'Kết nối tạm gián đoạn.'}}});}await route.continue();
 });
 await open(page,'listen');await page.getByRole('button',{name:'Chặng 2 · 2 từ',exact:true}).click();await page.getByRole('button',{name:'Bắt đầu chặng 2',exact:true}).click();
 for(const word of words.slice(10)){await page.getByRole('button',{name:word.data.meaning,exact:true}).click();await page.getByRole('button',{name:'Câu tiếp theo',exact:true}).click();}
 await expect(page.getByRole('button',{name:'Thử lưu thưởng',exact:true})).toBeVisible();retryAllowed=true;await page.getByRole('button',{name:'Thử lưu thưởng',exact:true}).click();await balance(page,9);
 const data=(await (await page.request.get('/api/v1/diamonds/summary')).json()).data;expect(data.total).toBe(9);
});
