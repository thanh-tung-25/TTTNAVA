// Order-independent character silhouettes complement the stroke recognizer.
// This module is also used by the local data builder; it has no network calls.
import {strokeEvidence,decodeStrokeFeatures,directionCounts,directionDifference,assignedStrokeDistance} from './chinese-handwriting-strokes.js';
export const SHAPE_GRID=24;
export function strokeShape(strokes){
 const size=SHAPE_GRID,points=strokes.flat().filter(point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite));
 if(!points.length)return null;
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const [x,y] of points){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const width=right-left,height=bottom-top,scale=(size-5)/Math.max(width,height,1e-6);
 const offsetX=(size-1-width*scale)/2,offsetY=(size-1-height*scale)/2;
 const ink=new Uint8Array(size*size);
 const mark=(x,y)=>{const px=Math.max(0,Math.min(size-1,Math.round(x))),py=Math.max(0,Math.min(size-1,Math.round(y)));ink[py*size+px]=1;};
 for(const stroke of strokes){
  let previous;
  for(const point of stroke){
   if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))continue;
   const next=[(point[0]-left)*scale+offsetX,(point[1]-top)*scale+offsetY];
   if(previous){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(next[0]-previous[0]),Math.abs(next[1]-previous[1]))*2));for(let i=0;i<=steps;i++)mark(previous[0]+(next[0]-previous[0])*i/steps,previous[1]+(next[1]-previous[1])*i/steps);}
   else mark(...next);previous=next;
  }
 }
 const distance=new Uint16Array(size*size).fill(6000),indices=[];
 for(let i=0;i<ink.length;i++)if(ink[i]){distance[i]=0;indices.push(i);}
 // A two-pass chamfer transform with horizontal/diagonal costs 3/4.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x;let d=distance[i];if(x)d=Math.min(d,distance[i-1]+3);if(y)d=Math.min(d,distance[i-size]+3);if(x&&y)d=Math.min(d,distance[i-size-1]+4);if(x+1<size&&y)d=Math.min(d,distance[i-size+1]+4);distance[i]=d;
 }
 for(let y=size-1;y>=0;y--)for(let x=size-1;x>=0;x--){
  const i=y*size+x;let d=distance[i];if(x+1<size)d=Math.min(d,distance[i+1]+3);if(y+1<size)d=Math.min(d,distance[i+size]+3);if(x+1<size&&y+1<size)d=Math.min(d,distance[i+size+1]+4);if(x&&y+1<size)d=Math.min(d,distance[i+size-1]+4);distance[i]=d;
 }
 return {points:Uint16Array.from(indices),distance:Uint8Array.from(distance,d=>Math.min(15,Math.round(d/3))),aspect:width+height?Math.round(255*width/(width+height)):128,strokes:strokes.length};
}

export class HandwritingShapes{
 constructor(buffer){
  const view=new DataView(buffer),magic=new TextDecoder().decode(new Uint8Array(buffer,0,8));
  const version=magic==='TTNHW3\0\0'?3:magic==='TTNHW2\0\0'?2:magic==='TTNHW1\0\0'?1:0;
  const featureModel=version>=2,samples=version===3?view.getUint8(13):7;
  if(!version||view.getUint8(12)!==SHAPE_GRID||samples<2||samples>64)throw Error('INVALID_SHAPE_MODEL');
  const count=view.getUint32(8,true);if(count<1||count>20000)throw Error('INVALID_SHAPE_COUNT');
  this.entries=[];this.featureGroups=[];let offset=16;
  for(let i=0;i<count;i++){
   const hanzi=String.fromCodePoint(view.getUint32(offset,true)),strokes=view.getUint8(offset+4),aspect=view.getUint8(offset+5),length=view.getUint16(offset+6,true);offset+=8;
   if(!length||length>SHAPE_GRID*SHAPE_GRID)throw Error('INVALID_SHAPE_POINTS');
   const featureBytes=featureModel?new Uint8Array(buffer,offset,strokes*(samples*2+3)):null;if(featureModel)offset+=strokes*(samples*2+3);
   const points=new Uint16Array(length);for(let p=0;p<length;p++)points[p]=view.getUint16(offset+p*2,true);offset+=length*2;
   const packed=new Uint8Array(buffer,offset,SHAPE_GRID*SHAPE_GRID/2);offset+=packed.length;
   this.entries.push({hanzi,strokes,aspect,points,packed,featureBytes,samples,features:null,directions:null});
  }
  if(offset!==buffer.byteLength)throw Error('INVALID_SHAPE_LENGTH');
 }
 match(strokes,{characters=[],strokeMatches=[],limit=20,near=false}={}){
  const input=strokeShape(strokes);if(!input)return [];
  const needed=near?[input.strokes-1,input.strokes+1].filter(n=>n>0):[input.strokes];
  this.featureGroups=[...new Set([...needed,...this.featureGroups])].slice(0,3);
  for(const entry of this.entries)if(entry.features&&!this.featureGroups.includes(entry.strokes)){entry.features=null;entry.directions=null;}
  const features=strokeEvidence(strokes),directions=directionCounts(features);
  const known=new Set(characters),prior=new Map(strokeMatches.map((match,i)=>[match.hanzi,i]));
  const matches=[];
  for(const entry of this.entries){
   const difference=Math.abs(entry.strokes-input.strokes);
   if(near?difference!==1:difference!==0)continue;
   if(entry.featureBytes&&!entry.features){entry.features=decodeStrokeFeatures(entry.featureBytes,entry.strokes,entry.samples);entry.directions=directionCounts(entry.features);}
   let forward=0,reverse=0;
   for(const point of entry.points)forward+=input.distance[point];
   for(const point of input.points)reverse+=(entry.packed[point>>1]>>((point&1)*4))&15;
   const shapeDistance=(forward/entry.points.length+reverse/input.points.length)/2;
   const directionDistance=entry.directions?directionDifference(directions,entry.directions,Math.max(input.strokes,entry.strokes)):0;
   const strokeDistance=entry.features?assignedStrokeDistance(features,entry.features):0;
   let score=entry.features?shapeDistance*.16+strokeDistance*2.5+directionDistance*.55:shapeDistance;
   score+=Math.abs(entry.aspect-input.aspect)/255*.30;
   if(known.has(entry.hanzi))score-=.12;
   if(prior.has(entry.hanzi))score-=.10*(1-prior.get(entry.hanzi)/Math.max(1,strokeMatches.length));
   matches.push({hanzi:entry.hanzi,strokes:entry.strokes,score,shapeDistance,strokeDistance,directionDistance,entry});
  }
  matches.sort((a,b)=>a.score-b.score||a.hanzi.codePointAt(0)-b.hanzi.codePointAt(0));
  // Filter cheaply first, then spend DTW work on the most plausible characters.
  // Include a bounded number of stroke-engine and course-vocabulary candidates.
  const shortlist=new Set([...matches.slice(0,input.strokes>10?48:64),...matches.filter(row=>prior.has(row.hanzi)).slice(0,32),...matches.filter(row=>known.has(row.hanzi)).slice(0,32)]);
  const refined=[];
  for(const row of shortlist){
   const {entry,...result}=row;
   if(entry.features){const distance=assignedStrokeDistance(features,entry.features,{dtw:true});result.score+=(distance-result.strokeDistance)*2.5;result.strokeDistance=distance;}
   refined.push(result);
  }
  return refined.sort((a,b)=>a.score-b.score||a.hanzi.codePointAt(0)-b.hanzi.codePointAt(0)).slice(0,limit);
 }
}
