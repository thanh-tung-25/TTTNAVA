/* Recognition stays in this worker. All code and model data are same-origin. */
import '/assets/vendor/hanzi-lookup/hanzi_lookup.js';
import {HandwritingShapes} from './chinese-handwriting-shapes.js';
let engine,shapes,strokeReady=false;
async function ready(){
 if(!engine){
  const bytes=path=>fetch(path).then(response=>{if(!response.ok)throw new Error('MODEL_UNAVAILABLE');return response.arrayBuffer();});
  engine=Promise.allSettled([
   bytes('/assets/vendor/hanzi-lookup/hanzi_lookup_bg.wasm').then(data=>self.wasm_bindgen(data)).then(()=>{strokeReady=true;}),
   bytes('/assets/vendor/hanzi-lookup/shapes.bin').then(data=>{shapes=new HandwritingShapes(data);})
  ]).then(()=>{if(!strokeReady&&!shapes)throw Error('MODEL_UNAVAILABLE');});
 }
 await engine;
}
self.onmessage=async({data})=>{
 const {id,type,strokes,characters}=data||{};
 try{
  await ready();
  if(type==='init'){self.postMessage({type:'ready',id});return;}
  if(type!=='recognize')return;
  if(!Array.isArray(strokes)||!strokes.length||strokes.length>45||strokes.some(stroke=>!Array.isArray(stroke)||!stroke.length||stroke.length>400||stroke.some(point=>!Array.isArray(point)||point.length!==2||point.some(n=>!Number.isFinite(n)||n<0||n>256))))throw new Error('INVALID_STROKES');
  let ordered=[];if(strokeReady)try{ordered=JSON.parse(self.wasm_bindgen.lookup(strokes,32));}catch{}
  const matches=shapes?shapes.match(strokes,{characters:Array.isArray(characters)?characters.filter(char=>/^\p{Script=Han}$/u.test(char)).slice(0,3000):[],strokeMatches:ordered,limit:20}):ordered;
  self.postMessage({type:'matches',id,matches:matches.filter(match=>/^\p{Script=Han}$/u.test(match.hanzi)).map(match=>match.hanzi),shapeMatching:Boolean(shapes)});
 }catch{self.postMessage({type:'error',id});}
};
