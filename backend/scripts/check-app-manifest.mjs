import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createApp} from '../src/app.js';
import {closePool} from '../src/config/db.js';
const server=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext(),page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
 const session=await context.newCDPSession(page),result=await session.send('Page.getAppManifest');assert.deepEqual(result.errors,[]);const manifest=JSON.parse(result.data);assert.equal(manifest.name,'TTNAVA');assert.equal(manifest.short_name,'TTNAVA');
 assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'),'TTNAVA');
 const apple=await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');const dimensions=await page.evaluate(async path=>{const image=new Image();image.src=path;await image.decode();return [image.naturalWidth,image.naturalHeight];},apple);assert.deepEqual(dimensions,[180,180]);
 console.log(JSON.stringify({ready:true,manifest_errors:0,name:manifest.name,android_icons:manifest.icons.map(i=>i.sizes),apple_touch_icon:dimensions}));await context.close();
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await closePool();}
