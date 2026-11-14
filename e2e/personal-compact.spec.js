import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
async function setup(page,{kind='chinese',pending=false,failGallery=false}={}){
 const course={id:kind==='chinese'?'hsk-1':kind==='secondary'?'grade-6':'grade-1',kind,level:kind==='secondary'?6:1,title:kind==='chinese'?'Tiếng Trung HSK 1':kind==='secondary'?'Lớp 6':'Lớp 1'};
 const state={prefs:{minutes:10,font_scale:'normal',speech_rate:1,effects_enabled:1,companion:'owl',companion_name:'Sư tử nhỏ',onboarding_at:'2026-11-01'},wallet:43,gallery:[],requests:[],errors:[],failGallery,guardianRows:pending?[{id:'family-1',guardian_name:'Phụ huynh',guardian_email:'m***@gmail.com',status:'pending',needsApproval:true}]:[]};
 const store=[{sku:'frame-lilac',title:'Khung tím mộng mơ',price:20},{sku:'frame-mint',title:'Khung xanh khám phá',price:20},{sku:'frame-gold',title:'Khung ngôi sao',price:50},{sku:'room-garden',title:'Góc học khu vườn',price:30},{sku:'room-space',title:'Góc học vũ trụ',price:40},{sku:'room-ocean',title:'Góc học đại dương',price:30}];
 const owned=new Set(['frame-lilac']);let equipped='frame-lilac';
 page.on('pageerror',e=>state.errors.push(e.message));await page.addInitScript(id=>localStorage.setItem('ttnava-course',id),course.id);
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,method=req.method(),body=method==='GET'?null:req.postDataJSON();state.requests.push({p,method,body});let data={};
  if(p.endsWith('/auth/me'))data={profile:{id:'personal-student',username:'thanh_tung',role:'student',displayName:'Đặng Thanh Tùng',grade:null,avatarKey:'meo'}};
  else if(p.endsWith('/access'))data=course;
  else if(p.endsWith('/diamonds/summary'))data={total:43,programs:{primary:{total:6},secondary:{total:8},chinese:{total:29}}};
  else if(p.includes('/chat/'))data=p.endsWith('/calls/config')?{enabled:false}:[];
  else if(p.endsWith('/preferences')){if(method==='PUT')Object.assign(state.prefs,body);data={...state.prefs};}
  else if(p.endsWith('/rewards/sync'))data={awarded:[]};
  else if(p.endsWith('/rewards'))data={wallet:{total:state.wallet},companion:{animal:'owl',name:'Sư tử nhỏ',level:1},badges:[{key:'first-step',title:'Bước đầu tiên',awardedAt:'2026-11-13T10:00:00Z'},{key:'steady',title:'Ba ngày bền bỉ'},{key:'repair',title:'Người sửa lỗi'}],store:store.map(s=>({...s,owned:owned.has(s.sku),equipped:s.sku===equipped}))};
  else if(/\/store\/[^/]+\/(buy|equip)$/.test(p)){const sku=p.split('/').at(-2),item=store.find(s=>s.sku===sku);if(p.endsWith('/buy')){state.wallet-=item.price;owned.add(sku);}else{equipped=sku;state.prefs.equipped_frame=sku;}data={owned:true};}
  else if(p.endsWith('/gallery')){
   if(state.failGallery){state.failGallery=false;return route.fulfill({status:503,json:{error:{code:'BUSY',message:'Chưa tải được bài viết. Thử lại nhé.'}}});}
   if(method==='POST'){const old=state.gallery.find(r=>r.id===body.id);if(old)Object.assign(old,body,{revision:old.revision+1});else state.gallery.push({...body,id:'saved-1',revision:1});data=state.gallery.find(r=>r.id===(body.id||'saved-1'));}else data=state.gallery.map(r=>({...r}));
  }else if(p.endsWith('/gallery/saved-1')&&method==='DELETE'){state.gallery=[];data={deleted:true};}
  else if(p.endsWith('/guardian/links'))data=state.guardianRows;
  else if(p.endsWith('/guardian/links/family-1')){Object.assign(state.guardianRows[0],{needsApproval:false,status:body.action==='accept'?'accepted':'declined'});data={updated:true};}
  else if(p.endsWith('/guardian/code'))data={code:'ABCDEF123456',expiresAt:'2026-11-16T10:00:00Z'};
  else if(p.endsWith('/catalog'))data={items:[],focus:{}};
  await route.fulfill({json:{data}});
 });await page.goto(origin+'/pages/student/personal/');await expect(page.locator('.personal-menu-row')).toHaveCount(4);return state;
}
const panel=page=>page.getByRole('dialog');
async function open(page,key){await page.locator('[data-personal-panel='+key+']').click();await expect(panel(page)).toBeVisible();await expect(panel(page).getByText('Đang tải…',{exact:true})).toHaveCount(0);}

for(const [kind,width]of [['chinese',320],['chinese',390],['primary',390],['secondary',390],['chinese',1280]])test(`${kind} ${width}px: personal starts with only identity and four compact entries`,async({page})=>{
 await page.setViewportSize({width,height:844});const state=await setup(page,{kind});
 await expect(page.locator('.personal-account')).toContainText('Đặng Thanh Tùng');await expect(page.locator('.personal-account')).toContainText('@thanh_tung');
 await expect(page.locator('.personal-page input,.personal-page select,.personal-page textarea')).toHaveCount(0);await expect(page.locator('.personal-page .experience-card')).toHaveCount(0);await expect(panel(page)).toHaveCount(0);
 expect(state.requests.some(r=>/\/rewards$|\/rewards\/sync$|\/gallery$|\/dashboard$/.test(r.p))).toBe(false);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(width===390&&kind==='chinese')await page.screenshot({path:'test-results/personal-compact-mobile.png',fullPage:true});
 expect(state.errors).toEqual([]);
});
test('learning settings save independently, persist on reload and return keyboard focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await setup(page);await open(page,'settings');
 await panel(page).getByLabel('Thời lượng buổi học').selectOption('15');await panel(page).getByLabel('Cỡ chữ').selectOption('large');await panel(page).getByLabel('Tốc độ đọc',{exact:true}).selectOption('0.7');
 await panel(page).getByRole('button',{name:'Lưu cài đặt',exact:true}).click();await expect(panel(page)).toContainText('Đã lưu cài đặt.');expect(state.prefs.companion_name).toBe('Sư tử nhỏ');
 expect(state.requests.find(r=>r.method==='PUT').body).toEqual({minutes:15,font_scale:'large',speech_rate:.7});
 await page.keyboard.press('Escape');await expect(panel(page)).toHaveCount(0);await expect(page.locator('[data-personal-panel=settings]')).toBeFocused();await expect(page.locator('[data-personal-panel=settings]')).toContainText('15 phút');
 await page.reload();await open(page,'settings');await expect(panel(page).getByLabel('Thời lượng buổi học')).toHaveValue('15');await expect(panel(page).getByLabel('Cỡ chữ')).toHaveValue('large');expect(state.errors).toEqual([]);
});
test('awards and cosmetics stay inside their panel; buying updates the wallet and equipping still works',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await setup(page);await open(page,'appearance');
 await expect(panel(page).getByRole('tab',{name:'Thành tích',exact:true})).toHaveAttribute('aria-selected','true');await expect(panel(page)).toContainText('Bước đầu tiên');await expect(panel(page).getByRole('heading',{name:'Trang trí góc học',exact:true})).toBeHidden();
 await panel(page).getByRole('tab',{name:'Trang trí',exact:true}).click();
 const item=panel(page).locator('.personal-store-item').filter({has:page.getByRole('heading',{name:'Khung xanh khám phá',exact:true})});await item.getByRole('button',{name:'Đổi vật phẩm',exact:true}).click();await expect(item.getByRole('button',{name:'Sử dụng',exact:true})).toBeVisible();expect(state.wallet).toBe(23);
 await item.getByRole('button',{name:'Sử dụng',exact:true}).click();await expect(item).toContainText('Đang sử dụng');await expect(page.locator('body')).toHaveClass(/frame-mint/);await expect(page.locator('#diamond-chip span')).toHaveText('29');
 await panel(page).getByLabel('Tên bạn đồng hành',{exact:true}).fill('Bạn nhỏ');await panel(page).getByRole('button',{name:'Lưu giao diện',exact:true}).click();await expect(panel(page)).toContainText('Đã lưu giao diện.');expect(state.prefs.minutes).toBe(10);expect(state.prefs.companion_name).toBe('Bạn nhỏ');
 expect(await panel(page).evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);expect(state.errors).toEqual([]);
});
test('gallery keeps a draft across closing and opening, then saves, reloads and deletes it',async({page})=>{
 const state=await setup(page);page.on('dialog',d=>d.accept());await open(page,'gallery');
 await panel(page).getByLabel('Tên bài muốn giữ',{exact:true}).fill('Bài viết riêng');await panel(page).getByLabel('Bài viết, cách giải hoặc điều mình học được',{exact:true}).fill('Mình học được điều mới.');await panel(page).getByRole('button',{name:'Đóng',exact:true}).click();
 await open(page,'gallery');await expect(panel(page).getByLabel('Tên bài muốn giữ',{exact:true})).toHaveValue('Bài viết riêng');await expect(panel(page).getByLabel('Bài viết, cách giải hoặc điều mình học được',{exact:true})).toHaveValue('Mình học được điều mới.');
 await panel(page).getByRole('button',{name:'Lưu bài',exact:true}).click();await expect(panel(page)).toContainText('Đã lưu vào tài khoản');expect(state.gallery).toHaveLength(1);
 await panel(page).getByRole('button',{name:'Đóng',exact:true}).click();await page.reload();await open(page,'gallery');await panel(page).getByRole('button',{name:'Mở',exact:true}).click();await expect(panel(page).getByLabel('Tên bài muốn giữ',{exact:true})).toHaveValue('Bài viết riêng');
 await panel(page).getByRole('button',{name:'Xóa bài lưu',exact:true}).click();await expect(panel(page).getByRole('button',{name:'Mở',exact:true})).toHaveCount(0);expect(state.gallery).toEqual([]);expect(state.errors).toEqual([]);
});
test('pending family requests remain visible and can be approved without expanding the whole page',async({page})=>{
 const state=await setup(page,{pending:true});await expect(page.locator('[data-personal-panel=family]')).toContainText('1 yêu cầu đang chờ xác nhận');await open(page,'family');
 await panel(page).getByRole('button',{name:'Đồng ý',exact:true}).click();await expect(panel(page)).toContainText('Đã liên kết');await expect(page.locator('[data-personal-panel=family]')).not.toContainText('đang chờ');
 await panel(page).getByRole('button',{name:'Tạo mã ghép phụ huynh',exact:true}).click();await expect(panel(page).getByLabel('Mã ghép phụ huynh',{exact:true})).toHaveValue('ABCDEF123456');expect(state.guardianRows[0].status).toBe('accepted');expect(state.errors).toEqual([]);
});
test('an optional panel can fail and retry without blocking the account or learning settings',async({page})=>{
 const state=await setup(page,{failGallery:true});await open(page,'gallery');await expect(panel(page)).toContainText('Chưa tải được bài viết');await panel(page).getByRole('button',{name:'Thử lại',exact:true}).click();await expect(panel(page).getByLabel('Tên bài muốn giữ',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await open(page,'settings');await expect(panel(page).getByLabel('Cỡ chữ')).toBeVisible();expect(state.errors).toEqual([]);
});
