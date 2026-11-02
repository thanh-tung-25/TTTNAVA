import {el} from './api.js';
// Clip the presentation only: the bank's original QR pixels are never redrawn.
export function paymentQrView(src,crop,alt){
 const img=el('img',{class:'payment-qr-image',src,alt,width:260,height:260});
 if(typeof crop==='string'){try{crop=JSON.parse(crop);}catch{crop=null;}}
 if(!crop||!['x','y','width','height','sourceWidth','sourceHeight'].every(k=>Number.isFinite(crop[k]))||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>crop.sourceWidth||crop.y+crop.height>crop.sourceHeight)return img;
 const frame=el('div',{class:'payment-qr-crop'},[img]);frame.style.aspectRatio=crop.width+'/'+crop.height;
 img.style.width=(crop.sourceWidth/crop.width*100)+'%';img.style.height=(crop.sourceHeight/crop.height*100)+'%';img.style.left=(-crop.x/crop.width*100)+'%';img.style.top=(-crop.y/crop.height*100)+'%';
 return frame;
}
