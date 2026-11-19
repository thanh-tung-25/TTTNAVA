// Geometric evidence for all characters, independent of pen order/direction.
export const STROKE_SAMPLES=7;
export const STROKE_BYTES=STROKE_SAMPLES*2+3;

function sampled(points,count){
 if(!points.length)return Array.from({length:count},()=>[0,0]);
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
 const total=lengths.at(-1);if(total<1e-8)return Array.from({length:count},()=>[...points[0]]);
 const result=[];let at=1;
 for(let i=0;i<count;i++){
  const target=total*i/(count-1);while(at<points.length-1&&lengths[at]<target)at++;
  const ratio=(target-lengths[at-1])/Math.max(1e-8,lengths[at]-lengths[at-1]);
  result.push([points[at-1][0]+(points[at][0]-points[at-1][0])*ratio,points[at-1][1]+(points[at][1]-points[at-1][1])*ratio]);
 }
 return result;
}
function descriptor(points,angle,length,dot,turn){
 let cx=0,cy=0,left=1,top=1,right=0,bottom=0;
 for(const [x,y] of points){cx+=x;cy+=y;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 cx/=points.length;cy/=points.length;
 const width=right-left,height=bottom-top,size=Math.max(width,height,.03);
 return {points,angle,length,dot,turn,cx,cy,width,height,relative:points.map(([x,y])=>[(x-cx)/size,(y-cy)/size])};
}
export function strokeEvidence(strokes){
 const valid=strokes.map(stroke=>stroke.filter(point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)));
 const all=valid.flat();if(!all.length)return [];
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const [x,y] of all){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const size=Math.max(right-left,bottom-top,1e-6),offsetX=(1-(right-left)/size)/2,offsetY=(1-(bottom-top)/size)/2;
 return valid.map(stroke=>{
  const normalized=stroke.map(([x,y])=>[(x-left)/size+offsetX,(y-top)/size+offsetY]),dense=sampled(normalized,25),points=sampled(normalized,STROKE_SAMPLES);
  let length=0,cx=0,cy=0;for(let i=1;i<normalized.length;i++)length+=Math.hypot(normalized[i][0]-normalized[i-1][0],normalized[i][1]-normalized[i-1][1]);
  for(const [x,y] of dense){cx+=x;cy+=y;}cx/=dense.length;cy/=dense.length;
  let xx=0,yy=0,xy=0;for(const [x,y] of dense){xx+=(x-cx)**2;yy+=(y-cy)**2;xy+=(x-cx)*(y-cy);}
  let angle=.5*Math.atan2(2*xy,xx-yy);if(angle<0)angle+=Math.PI;
  const extent=Math.max(...dense.map(p=>p[0]))-Math.min(...dense.map(p=>p[0]));
  const vertical=Math.max(...dense.map(p=>p[1]))-Math.min(...dense.map(p=>p[1]));
  const dot=Math.max(extent,vertical)<.22&&length<.30;
  const chord=Math.hypot(points.at(-1)[0]-points[0][0],points.at(-1)[1]-points[0][1]);
  return descriptor(points,angle,length,dot,!dot&&length>Math.max(.12,chord*1.16));
 });
}
export function encodeStrokeFeatures(features){
 const bytes=new Uint8Array(features.length*STROKE_BYTES);let at=0;
 for(const feature of features){
  for(const [x,y] of feature.points){bytes[at++]=Math.max(0,Math.min(255,Math.round(x*255)));bytes[at++]=Math.max(0,Math.min(255,Math.round(y*255)));}
  bytes[at++]=Math.round(feature.angle/Math.PI*255);bytes[at++]=Math.min(255,Math.round(feature.length*127.5));bytes[at++]=(feature.dot?1:0)|(feature.turn?2:0);
 }
 return bytes;
}
export function decodeStrokeFeatures(bytes,count){
 const features=[];let at=0;
 for(let i=0;i<count;i++){
  const points=[];for(let p=0;p<STROKE_SAMPLES;p++)points.push([bytes[at++]/255,bytes[at++]/255]);
  const angle=bytes[at++]/255*Math.PI,length=bytes[at++]/127.5,flags=bytes[at++];features.push(descriptor(points,angle,length,Boolean(flags&1),Boolean(flags&2)));
 }
 return features;
}
export function directionCounts(features){
 // Soft bins tolerate slanted horizontals and verticals. First five sum to N;
 // the final component is supplementary evidence for bends/hooks.
 const counts=new Float64Array(6),bins=[0,3,1,2];
 for(const feature of features){
  if(feature.dot)counts[4]++;else{
   const position=feature.angle/(Math.PI/4),base=Math.floor(position)%4,fraction=position-Math.floor(position);
   counts[bins[base]]+=1-fraction;counts[bins[(base+1)%4]]+=fraction;
  }
  if(feature.turn)counts[5]++;
 }
 return counts;
}
export function directionDifference(a,b,count){return a.reduce((total,value,i)=>total+Math.abs(value-b[i])*(i===5?.45:1),0)/Math.max(1,count);}
function pairCost(a,b){
 let same=0,reverse=0;
 for(let i=0;i<STROKE_SAMPLES;i++){
  same+=Math.hypot(a.relative[i][0]-b.relative[i][0],a.relative[i][1]-b.relative[i][1]);
  reverse+=Math.hypot(a.relative[i][0]-b.relative[STROKE_SAMPLES-1-i][0],a.relative[i][1]-b.relative[STROKE_SAMPLES-1-i][1]);
 }
 const angle=Math.abs(a.angle-b.angle),orientation=Math.min(angle,Math.PI-angle)/(Math.PI/2);
 return Math.min(same,reverse)/STROKE_SAMPLES*.55+Math.hypot(a.cx-b.cx,a.cy-b.cy)*.75+(Math.abs(a.width-b.width)+Math.abs(a.height-b.height))*.24+Math.abs(Math.log((a.length+.04)/(b.length+.04)))*.10+orientation*.10+(a.dot!==b.dot?.15:0)+(a.turn!==b.turn?.08:0);
}
export function assignedStrokeDistance(input,target){
 // Minimum-cost one-to-one assignment avoids assuming textbook stroke order.
 const n=Math.max(input.length,target.length);if(!n)return Infinity;
 const cost=Array.from({length:n},(_,i)=>Float64Array.from({length:n},(_,j)=>i<input.length&&j<target.length?pairCost(input[i],target[j]):.55));
 const u=new Float64Array(n+1),v=new Float64Array(n+1),p=new Int16Array(n+1),way=new Int16Array(n+1);
 for(let i=1;i<=n;i++){
  p[0]=i;let j0=0;const min=new Float64Array(n+1).fill(Infinity),used=new Uint8Array(n+1);
  do{
   used[j0]=1;const i0=p[j0];let delta=Infinity,j1=0;
   for(let j=1;j<=n;j++)if(!used[j]){const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}
   for(let j=0;j<=n;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;
   j0=j1;
  }while(p[j0]!==0);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0!==0);
 }
 return -v[0]/n;
}
