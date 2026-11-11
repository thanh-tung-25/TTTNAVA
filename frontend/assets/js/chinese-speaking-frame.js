function panel(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function lines(ctx,text,width){
 const result=[];let line='';
 for(const char of String(text)){if(char==='\n'||ctx.measureText(line+char).width>width){result.push(line);line=char==='\n'?'':char;}else line+=char;}
 if(line)result.push(line);return result;
}
export function drawSpeakingFrame(ctx,video,meta,elapsed){
 const width=800,height=800;
 const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#f5edff');bg.addColorStop(1,'#fff4df');
 ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
 panel(ctx,18,18,764,764,24,'#fffdfa');
 panel(ctx,36,36,124,34,10,'#815cc5');
 ctx.fillStyle='#fff';ctx.font='bold 21px Arial';ctx.fillText('TTNAVA',50,60);
 ctx.fillStyle='#765496';ctx.font='bold 16px Arial';ctx.fillText('LUYỆN NÓI TIẾNG TRUNG',176,59);
 ctx.fillStyle='#514262';ctx.font='bold 21px Arial';
 const name=lines(ctx,meta.name+(meta.username?' · '+meta.username:''),720).slice(0,2);
 name.forEach((line,n)=>ctx.fillText(line,38,101+n*25));
 let y=110+name.length*25;
 ctx.font='17px Arial';ctx.fillStyle='#786c84';
 const lesson=lines(ctx,`HSK ${meta.level} · ${meta.lesson} · Câu ${meta.index}/${meta.total} · Đã nghe ${meta.heard_count||0}/${meta.total}`,720).slice(0,2);
 lesson.forEach(line=>{ctx.fillText(line,38,y);y+=24;});
 y+=9;
 const text=meta.question||'Chưa phát câu hỏi';
 ctx.font=`bold ${text.length>80?25:33}px "Microsoft YaHei",Arial,sans-serif`;
 const question=lines(ctx,text,682),lineHeight=text.length>80?33:43;
 panel(ctx,34,y,732,question.length*lineHeight+32,16,'#f0e9fb');
 ctx.fillStyle='#493760';question.forEach((line,n)=>ctx.fillText(line,54,y+34+n*lineHeight));
 y+=question.length*lineHeight+49;
 const box={x:34,y,w:732,h:Math.max(140,704-y)};
 panel(ctx,box.x,box.y,box.w,box.h,18,'#e8e1ef');
 if(video.readyState>=2&&video.videoWidth){
  const scale=Math.min(box.w/video.videoWidth,box.h/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;
  ctx.save();ctx.beginPath();ctx.roundRect(box.x,box.y,box.w,box.h,18);ctx.clip();
  ctx.drawImage(video,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);ctx.restore();
 }
 panel(ctx,48,y+12,112,29,9,'#b94463');ctx.fillStyle='white';ctx.font='bold 15px Arial';ctx.fillText('● ĐANG QUAY',58,y+32);
 ctx.textAlign='right';ctx.fillStyle='#514262';ctx.font='bold 18px Arial';ctx.fillText(`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`,750,734);ctx.textAlign='left';
 ctx.font='15px Arial';ctx.fillStyle='#6e5c80';ctx.fillText(`${meta.date} · Mã lượt: ${meta.code}`,38,734);
 ctx.font='14px Arial';ctx.fillStyle='#8f7aa1';ctx.fillText(meta.origin,38,761);
}
