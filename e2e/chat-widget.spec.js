import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/chat-test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Chat test</title><body><h1>Trang học</h1></body></html>');return;}
  const target=path.resolve(root,'.'+pathname);if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
test('floating chat sends private text between students, persists across reload and creates a study group on mobile',async({browser})=>{
 const alice={id:randomUUID(),display_name:'An',username:'alice',role:'admin',adminScope:'chinese'},bob={id:randomUUID(),display_name:'Bình',username:'bob',role:'student'};
 const rooms=[],messages=[],students=[alice,bob],reads=new Map(),friendships=new Map();
 const state=(a,b)=>{const row=friendships.get([a,b].sort().join(':'));return !row?'none':row.status==='accepted'?'friend':row.requester===a?'outgoing':'incoming';};
 const contexts=await Promise.all([browser.newContext({hasTouch:true}),browser.newContext()]);
 const pages=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
 async function install(page,user){
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/v1/chat/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname.split('/').filter(Boolean).slice(3),method=req.method();let data={};
   if(p[0]==='friends'){
    if(method==='PUT'){const action=req.postDataJSON().action,key=[user.id,p[1]].sort().join(':');if(action==='request')friendships.set(key,{requester:user.id,status:'pending'});else if(action==='accept')friendships.get(key).status='accepted';else friendships.delete(key);data={friendship:state(user.id,p[1])};}
    else data=students.filter(u=>u.id!==user.id&&state(user.id,u.id)!=='none').map(u=>({...u,friendship:state(user.id,u.id)}));
   }
   else if(p[0]==='students')data=students.filter(u=>u.id!==user.id&&(u.display_name+u.username).toLowerCase().includes(url.searchParams.get('q').toLowerCase())).map(u=>({...u,friendship:state(user.id,u.id)}));
   else if(p[0]==='rooms'&&p.length===1){
    if(method==='POST'){const b=req.postDataJSON();let r=b.kind==='direct'?rooms.find(r=>r.kind==='direct'):null;if(!r){r={id:randomUUID(),kind:b.kind,title:b.title||'',owner_id:user.id,members:students.filter(s=>s.id===user.id||b.members.includes(s.id))};rooms.push(r);}data={id:r.id};}
    else data=rooms.filter(r=>r.members.some(m=>m.id===user.id)).map(r=>({...r,peer:r.kind==='direct'?r.members.find(s=>s.id!==user.id):null,friendship:r.kind==='direct'?state(user.id,r.members.find(s=>s.id!==user.id).id):null,can_message:r.kind==='group'||state(user.id,r.members.find(s=>s.id!==user.id).id)==='friend',blocked:false,unread:messages.filter(m=>m.room_id===r.id&&m.sender_id!==user.id).length-(reads.get(user.id+r.id)||0)}));
   }else if(p[0]==='rooms'&&p[2]==='messages'){
    if(method==='POST'){const b=req.postDataJSON(),m={id:randomUUID(),room_id:p[1],sender_id:user.id,display_name:user.display_name,body:b.text,created_at:new Date().toISOString(),hidden:0};messages.push(m);data={id:m.id};}
    else data={items:messages.filter(m=>m.room_id===p[1]),has_more:false};
   }else if(p[0]==='rooms'&&p[2]==='read')reads.set(user.id+p[1],messages.filter(m=>m.room_id===p[1]&&m.sender_id!==user.id).length);
   await route.fulfill({json:{data}});
  });
  await page.goto(origin+'/chat-test');await mount(page,user);
 }
 async function mount(page,user){await page.evaluate(async profile=>{const {setupChat}=await import('/assets/js/chat-widget.js');setupChat(profile);},{id:user.id,displayName:user.display_name,role:user.role,adminScope:user.adminScope});}
 try{
  await install(pages[0],alice);await install(pages[1],bob);
  pages[0].on('dialog',d=>d.accept());
  const [a,b]=pages;await a.getByRole('button',{name:'Mở trò chuyện'}).click();
  await a.getByRole('button',{name:'Nhắn riêng',exact:true}).click();await expect(a.locator('.chat-body')).toContainText('Chưa có bạn bè phù hợp');await a.getByRole('button',{name:'← Danh sách',exact:true}).click();
  await a.getByRole('button',{name:/^Bạn bè/}).click();await a.getByRole('textbox',{name:'Tìm người để kết bạn'}).fill('bob');await a.getByRole('button',{name:'Tìm',exact:true}).click();await expect(a.getByRole('button',{name:'Nhắn tin',exact:true})).toHaveCount(0);await a.getByRole('button',{name:'Kết bạn',exact:true}).click();await expect(a.locator('.chat-body')).toContainText('Đang chờ chấp nhận');
  await b.getByRole('button',{name:'Mở trò chuyện'}).click();await b.getByRole('button',{name:/^Bạn bè/}).click();await expect(b.locator('.chat-body')).toContainText('Quản trị viên');await b.getByRole('button',{name:'Chấp nhận',exact:true}).click();await b.getByRole('button',{name:'← Danh sách',exact:true}).click();
  await a.getByRole('button',{name:'← Danh sách',exact:true}).click();await a.getByRole('button',{name:'Nhắn riêng',exact:true}).click();await a.getByRole('textbox',{name:'Tìm bạn'}).fill('bob');await a.getByRole('button',{name:'Tìm bạn',exact:true}).click();await a.getByRole('button',{name:'Bình (@bob)',exact:true}).click();
  await a.getByRole('textbox',{name:'Tin nhắn',exact:true}).fill('Cùng ôn bài nhé <script>window.hacked=true</script>');await a.getByRole('button',{name:'Gửi',exact:true}).click();await expect(a.locator('.chat-message p')).toContainText('<script>');expect(await a.evaluate(()=>window.hacked)).toBeUndefined();
  await expect(b.getByRole('button',{name:/An.*tin mới/})).toBeVisible({timeout:10000});await b.getByRole('button',{name:/An.*tin mới/}).click();await expect(b.locator('.chat-message p')).toContainText('Cùng ôn bài');await b.getByRole('textbox',{name:'Tin nhắn',exact:true}).fill('Đồng ý!');await b.getByRole('button',{name:'Gửi',exact:true}).click();await expect(a.locator('.chat-thread')).toContainText('Đồng ý!',{timeout:10000});
  await a.reload();await mount(a,alice);await a.getByRole('button',{name:'Mở trò chuyện'}).click();await a.getByRole('button',{name:/^Bình/}).click();await expect(a.locator('.chat-thread')).toContainText('Đồng ý!');
  await a.getByRole('button',{name:'← Danh sách'}).click();await a.getByRole('button',{name:'Tạo nhóm học'}).click();await a.getByRole('textbox',{name:'Tên nhóm',exact:true}).fill('Cùng học HSK 1');await a.getByRole('textbox',{name:'Tìm bạn'}).fill('bob');await a.getByRole('button',{name:'Tìm bạn',exact:true}).click();await a.getByRole('button',{name:'Bình (@bob)',exact:true}).click();await a.getByRole('button',{name:'Tạo nhóm',exact:true}).click();await expect(a.locator('.chat-header')).toContainText('Cùng học HSK 1');
  await a.setViewportSize({width:390,height:844});await a.getByRole('textbox',{name:'Tin nhắn',exact:true}).fill('Mình cùng ôn 10 câu tiếng Trung nhé!');await a.getByRole('button',{name:'Gửi',exact:true}).click();await expect(a.locator('.chat-message p')).toContainText('10 câu');
  await expect(a.getByRole('button',{name:'Chặn bạn này',exact:true})).toHaveCount(0);await expect(a.getByRole('button',{name:'Gỡ',exact:true})).toBeHidden();await a.screenshot({path:'test-results/chat-room-mobile.png',fullPage:true});
  await a.getByLabel('Tùy chọn trò chuyện',{exact:true}).click();await a.getByRole('button',{name:'Thành viên',exact:true}).click();await expect(a.locator('.chat-body')).toContainText('2/20 người');expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await a.screenshot({path:'test-results/chat-mobile.png',fullPage:true});
  await a.getByRole('button',{name:'Đóng',exact:true}).click();await expect(a.locator('.chat-panel')).toBeHidden();expect(errors).toEqual([]);
  const launcher=a.getByRole('button',{name:'Mở trò chuyện'}),old=await launcher.boundingBox();
  await a.mouse.move(old.x+old.width/2,old.y+old.height/2);await a.mouse.down();await a.mouse.move(46,190,{steps:10});await a.mouse.up();
  await expect(a.locator('.chat-panel')).toBeHidden();const moved=await launcher.boundingBox();expect(Math.abs(moved.y-old.y)).toBeGreaterThan(50);
  await launcher.click();await expect(a.locator('.chat-panel')).toBeVisible();const before=await a.locator('.chat-panel').boundingBox();
  const header=await a.locator('.chat-identity').boundingBox();await a.mouse.move(header.x+header.width/2,header.y+header.height/2);await a.mouse.down();await a.mouse.move(header.x+header.width/2,header.y+header.height/2+95,{steps:8});await a.mouse.up();
  const after=await a.locator('.chat-panel').boundingBox();expect(after.y-before.y).toBeGreaterThan(30);
  await a.getByRole('button',{name:'Đóng',exact:true}).click();await a.reload();await mount(a,alice);const restored=await launcher.boundingBox();expect(Math.abs(restored.y-moved.y)).toBeLessThan(3);
  await launcher.click();await a.setViewportSize({width:320,height:480});await expect.poll(async()=>{const rect=await a.locator('.chat-panel').boundingBox();return rect.y+rect.height;}).toBeLessThanOrEqual(473);const fitted=await a.locator('.chat-panel').boundingBox();expect(fitted.x).toBeGreaterThanOrEqual(7);
  await a.getByRole('button',{name:'Đóng',exact:true}).click();const touchStart=await launcher.boundingBox(),cdp=await contexts[0].newCDPSession(a);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchStart.x+28,y:touchStart.y+28}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:260,y:70}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(a.locator('.chat-panel')).toBeHidden();const touched=await launcher.boundingBox();expect(Math.abs(touched.x-touchStart.x)).toBeGreaterThan(30);
  await launcher.click();await a.getByRole('button',{name:/^Bạn bè/}).click();await a.getByRole('button',{name:'Hủy kết bạn',exact:true}).click();await a.getByRole('button',{name:'← Danh sách',exact:true}).click();await a.getByRole('button',{name:/^Bình/}).click();await expect(a.getByRole('textbox',{name:'Tin nhắn',exact:true})).toBeDisabled();await expect(a.locator('.chat-friend-gate')).toContainText('Cần được chấp nhận kết bạn');
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
