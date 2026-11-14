import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve('frontend');server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/call-test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Cuộc gọi</title><body><h1>TTNAVA</h1></body></html>');return;}
  const target=path.resolve(root,'.'+url.pathname);if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});

async function fixture(browser,{denied=false,enabled=true}={}){
 const alice={id:randomUUID(),display_name:'An',username:'an',role:'student'},bob={id:randomUUID(),display_name:'Bình',username:'binh',role:'student'},roomId=randomUUID(),calls=[],events=[],errors=[];
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844},permissions:['camera','microphone']}),browser.newContext({viewport:{width:320,height:568},permissions:['camera','microphone']})]);
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 function present(row,user,client=null){const caller=user.id===row.caller_id,claimed=Boolean(client)&&(caller?row.caller_client:row.callee_client)===client;return {...row,caller,claimed,peer:caller?bob:alice,offer_sdp:claimed&&!caller?row.offer_sdp:null,answer_sdp:claimed&&caller?row.answer_sdp:null};}
 for(const [i,page] of pages.entries()){
  const user=i===0?alice:bob;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({denied})=>{
   window.__media=[];window.__requests=0;
   const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async constraints=>{window.__requests++;if(window.__delayMedia)await new Promise(resolve=>window.__releaseMedia=resolve);if(denied)throw new DOMException('Permission denied','NotAllowedError');const s=await get(constraints);window.__media.push(s);return s;};
   // Test signaling/UI deterministically; no production TURN credentials in browser tests.
   class Peer{
    constructor(){this.iceGatheringState='complete';this.connectionState='new';this.remoteDescription=null;this.localDescription=null;}
    addTrack(){} close(){this.connectionState='closed';}
    async createOffer(){return {type:'offer',sdp:'v=0\r\na=candidate:1 1 udp 1 127.0.0.1 3478 typ relay\r\n'};}
    async createAnswer(){return {type:'answer',sdp:'v=0\r\na=candidate:2 1 udp 1 127.0.0.1 3479 typ relay\r\n'};}
    async setLocalDescription(d){this.localDescription=d;}
    async setRemoteDescription(d){this.remoteDescription=d;this.connectionState='connected';this.onconnectionstatechange?.();}
   }
   window.RTCPeerConnection=Peer;
  },{denied:denied&&i===0});
  await page.route('**/api/v1/chat/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname.split('/').slice(4),method=req.method(),body=req.postData()?req.postDataJSON():{};let data={};
   events.push({user:i,path:p.join('/'),method,body});
   if(p[0]==='calls'){
    if(p[1]==='config')data={enabled,receiving:true,max_seconds:900,push_enabled:false};
    else if(p[1]==='incoming'){const row=calls.find(c=>c.callee_id===user.id&&c.state==='ringing'&&c.offer_sdp);data=row?present(row,user):null;}
    else if(p[1]==='preferences')data={receiving:body.enabled};
    else if(p[1]==='history')data=calls.filter(c=>c.state==='ended').map(c=>present(c,user));
    else if(p.length===1&&method==='POST'){
     const now=Date.now(),row={id:randomUUID(),room_id:roomId,caller_id:user.id,callee_id:i===0?bob.id:alice.id,caller_client:body.client_id,media:body.media,state:'ringing',created_at:new Date(now).toISOString(),ring_until:new Date(now+45000).toISOString(),deadline_at:new Date(now+945000).toISOString()};calls.push(row);data=present(row,user,body.client_id);
    }else{
     const row=calls.find(c=>c.id===p[1]);
     if(p[2]==='credentials')data={iceTransportPolicy:'relay',iceServers:[]};
     else if(p[2]==='accept'){Object.assign(row,{state:'accepted',callee_client:body.client_id,accepted_at:new Date().toISOString()});data=present(row,user,body.client_id);}
     else if(p[2]==='signal'){row[body.type+'_sdp']=body.sdp;data={sent:true};}
     else if(p[2]==='end'){row.state='ended';row.outcome=body.reason;row.offer_sdp=row.answer_sdp=null;data=present(row,user,body.client_id);}
     else if(p[2]==='poll')data=present(row,user,body.client_id);
    }
   }else if(p[0]==='rooms'){
    if(p[2]==='messages')data={items:[],has_more:false};else if(p[2]==='read')data={};
    else data=[{id:roomId,kind:'direct',peer:i===0?bob:alice,members:[alice,bob],friendship:'friend',can_message:true,blocked:false,unread:0}];
   }else if(p[0]==='friends')data=[{...(i===0?bob:alice),friendship:'friend'}];
   await route.fulfill({json:{data}});
  });
  await page.goto(origin+'/call-test');await page.evaluate(async profile=>{const {setupChat}=await import('/assets/js/chat-widget.js');setupChat(profile);},{id:user.id,role:'student',displayName:user.display_name});
 }
 async function open(){await pages[0].getByRole('button',{name:'Mở trò chuyện'}).click();await pages[0].getByRole('button',{name:/^Bình/}).click();}
 return {pages,contexts,calls,events,errors,open,close:()=>Promise.all(contexts.map(c=>c.close()))};
}

test('mobile video call requires acceptance, keeps controls visible and stops all media on hangup',async({browser})=>{
 const f=await fixture(browser);try{
  const [a,b]=f.pages;await f.open();await a.getByRole('button',{name:'Gọi video',exact:true}).click();
  await expect(a.getByRole('dialog',{name:'Cuộc gọi video',exact:true})).toBeVisible();await expect(a.getByLabel('Camera của con')).toBeVisible();
  await expect(b.getByRole('button',{name:'Nhận cuộc gọi',exact:true})).toBeVisible({timeout:15000});expect(await b.evaluate(()=>window.__requests)).toBe(0);
  await b.getByRole('button',{name:'Nhận cuộc gọi',exact:true}).click();await expect(b.getByRole('button',{name:'Kết thúc',exact:true})).toBeVisible();
  await expect.poll(()=>a.evaluate(()=>document.querySelector('.chat-call-status').textContent)).toContain('Còn');
  await a.getByRole('button',{name:'Tắt micro',exact:true}).click();await expect(a.getByRole('button',{name:'Bật micro',exact:true})).toBeVisible();expect(await a.evaluate(()=>window.__media[0].getAudioTracks()[0].enabled)).toBe(false);
  await a.getByRole('button',{name:'Tắt camera',exact:true}).click();expect(await a.evaluate(()=>window.__media[0].getVideoTracks()[0].enabled)).toBe(false);
  for(const page of f.pages){
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const rect=await page.getByRole('button',{name:'Kết thúc',exact:true}).boundingBox();expect(rect.y+rect.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));
   expect(await page.evaluate(()=>document.querySelector('.chat-call-dialog audio').srcObject)).toBeNull();
  }
  await b.screenshot({path:'test-results/chat-calls/call-mobile-320.png'});
  await b.getByRole('button',{name:'Kết thúc',exact:true}).click();await expect(a.getByText('Cuộc gọi đã kết thúc',{exact:true})).toBeVisible();
  for(const page of f.pages)expect(await page.evaluate(()=>window.__media.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  expect(f.errors).toEqual([]);
 }finally{await f.close();}
});

test('refusing an incoming voice call never opens the recipient microphone',async({browser})=>{
 const f=await fixture(browser);try{
  const [a,b]=f.pages;await f.open();await a.getByRole('button',{name:'Gọi thoại',exact:true}).click();
  await expect(b.getByRole('button',{name:'Từ chối',exact:true})).toBeVisible({timeout:15000});await b.getByRole('button',{name:'Từ chối',exact:true}).click();
  await expect(a.getByText('Cuộc gọi đã bị từ chối',{exact:true})).toBeVisible();expect(await b.evaluate(()=>window.__requests)).toBe(0);
  expect(await a.evaluate(()=>window.__media.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  await a.getByRole('button',{name:'Đóng',exact:true}).last().click();await expect(a.locator('.chat-call-dialog')).toHaveCount(0);expect(f.errors).toEqual([]);
 }finally{await f.close();}
});

test('permission failure explains recovery and releases the call',async({browser})=>{
 const f=await fixture(browser,{denied:true});try{
  const [a,b]=f.pages;await f.open();await a.getByRole('button',{name:'Gọi video',exact:true}).click();
  await expect(a.locator('.chat-call-message')).toContainText('Chưa có quyền camera/micro');expect(f.calls[0].state).toBe('ended');
  expect(await b.evaluate(()=>window.__requests)).toBe(0);expect(f.errors).toEqual([]);
 }finally{await f.close();}
});

test('disabled service preserves text chat and never asks for media permissions',async({browser})=>{
 const f=await fixture(browser,{enabled:false});try{
  const [a]=f.pages;await f.open();await expect(a.getByRole('button',{name:'Gọi video',exact:true})).toHaveCount(0);await expect(a.getByRole('textbox',{name:'Tin nhắn',exact:true})).toBeVisible();
  expect(await a.evaluate(()=>window.__requests)).toBe(0);expect(f.errors).toEqual([]);
 }finally{await f.close();}
});

test('canceling while permission is pending stops tracks granted later',async({browser})=>{
 const f=await fixture(browser);try{
  const [a]=f.pages;await f.open();await a.evaluate(()=>window.__delayMedia=true);
  await a.getByRole('button',{name:'Gọi video',exact:true}).click();await expect.poll(()=>a.evaluate(()=>window.__requests)).toBe(1);
  await a.getByRole('button',{name:'Hủy cuộc gọi',exact:true}).click();expect(f.calls[0].state).toBe('ended');
  await a.evaluate(()=>window.__releaseMedia());await expect.poll(()=>a.evaluate(()=>window.__media.length)).toBe(1);
  await expect.poll(()=>a.evaluate(()=>window.__media.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  expect(f.events.filter(e=>e.path.endsWith('/signal'))).toHaveLength(0);expect(f.errors).toEqual([]);
 }finally{await f.close();}
});

test('logout immediately stops media and notifies the other participant',async({browser})=>{
 const f=await fixture(browser);try{
  const [a,b]=f.pages;await f.open();await a.getByRole('button',{name:'Gọi thoại',exact:true}).click();
  await expect(b.getByRole('button',{name:'Nhận cuộc gọi',exact:true})).toBeVisible({timeout:15000});
  await a.evaluate(()=>window.dispatchEvent(new Event('ttnava:logout')));
  expect(await a.evaluate(()=>window.__media.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  await expect(b.getByText('Cuộc gọi đã kết thúc',{exact:true})).toBeVisible();expect(f.errors).toEqual([]);
 }finally{await f.close();}
});
