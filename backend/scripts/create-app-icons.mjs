// Export launcher sizes from the existing brand asset without changing the logo.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const source=await readFile(new URL('../../frontend/assets/images/ttnava-logo.png',import.meta.url));
const directory=new URL('../../frontend/assets/icons/',import.meta.url);await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 for(const [name,size,padding]of [['favicon-32.png',32,0],['apple-touch-icon.png',180,0],['icon-192.png',192,0],['icon-512.png',512,0],['icon-maskable-512.png',512,.16]]){
  const data=await page.evaluate(async({base64,size,padding})=>{
   const logo=new Image();logo.src='data:image/png;base64,'+base64;await logo.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
   ctx.fillStyle='#faf8fd';ctx.fillRect(0,0,size,size);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   const inset=Math.round(size*padding);ctx.drawImage(logo,inset,inset,size-inset*2,size-inset*2);return canvas.toDataURL('image/png').split(',')[1];
  },{base64:source.toString('base64'),size,padding});
  await writeFile(new URL(name,directory),Buffer.from(data,'base64'));
 }
 const png=await readFile(new URL('favicon-32.png',directory)),header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=header[7]=32;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);await writeFile(new URL('favicon.ico',directory),Buffer.concat([header,png]));
 console.log('TTNAVA icons exported: 32, 180, 192, 512 and maskable 512.');
}finally{await browser.close();}
