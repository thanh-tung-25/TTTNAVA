// Build a self-hosted shape index. No handwriting or account data is used.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {strokeShape,SHAPE_GRID} from '../../frontend/assets/js/chinese-handwriting-shapes.js';
import {strokeEvidence,encodeStrokeFeatures} from '../../frontend/assets/js/chinese-handwriting-strokes.js';
const root=new URL('../../',import.meta.url),headers={'User-Agent':'TTNAVA-local-handwriting-data'};
let sha;
if(process.argv.includes('--cached'))sha=JSON.parse(await readFile(new URL('frontend/assets/vendor/hanzi-lookup/SHAPES-SOURCE.json',root),'utf8')).revision;
else{const response=await fetch('https://api.github.com/repos/skishore/makemeahanzi/commits/master',{headers});if(!response.ok)throw Error('Cannot read public graphics revision');({sha}=await response.json());}
if(!/^[0-9a-f]{40}$/.test(sha))throw Error('Invalid graphics revision');
const directory=new URL('backend/backups/local-handwriting/',root);await mkdir(directory,{recursive:true});
const cache=new URL('graphics-'+sha+'.txt',directory);let source;
try{source=await readFile(cache,'utf8');}catch{
 if(process.argv.includes('--cached'))throw Error('Cached graphics source missing');
 const graphics=await fetch('https://raw.githubusercontent.com/skishore/makemeahanzi/'+sha+'/graphics.txt',{headers});if(!graphics.ok)throw Error('Cannot download public graphics');source=await graphics.text();await writeFile(cache,source,'utf8');
}
const records=[];
for(const line of source.split(/\r?\n/)){
 if(!line.trim())continue;const data=JSON.parse(line);
 if(!/^\p{Script=Han}$/u.test(data.character)||!Array.isArray(data.medians)||!data.medians.length)continue;
 const strokes=data.medians.map(stroke=>stroke.map(([x,y])=>[x,900-y])),shape=strokeShape(strokes);if(!shape)continue;
 const features=encodeStrokeFeatures(strokeEvidence(strokes));
 const entry=Buffer.alloc(8+features.length+shape.points.length*2+SHAPE_GRID*SHAPE_GRID/2);
 entry.writeUInt32LE(data.character.codePointAt(0),0);entry.writeUInt8(shape.strokes,4);entry.writeUInt8(shape.aspect,5);entry.writeUInt16LE(shape.points.length,6);
 let at=8;entry.set(features,at);at+=features.length;for(const point of shape.points){entry.writeUInt16LE(point,at);at+=2;}
 for(let i=0;i<shape.distance.length;i+=2)entry[at++]=shape.distance[i]|(shape.distance[i+1]<<4);
 records.push(entry);
}
const header=Buffer.alloc(16);header.write('TTNHW2\0\0',0,'ascii');header.writeUInt32LE(records.length,8);header.writeUInt8(SHAPE_GRID,12);
const model=Buffer.concat([header,...records]),destination=new URL('frontend/assets/vendor/hanzi-lookup/',root);
await writeFile(new URL('shapes-v2.bin',destination),model);
await writeFile(new URL('SHAPES-V2-SOURCE.json',destination),JSON.stringify({upstream:'https://github.com/skishore/makemeahanzi',revision:sha,source:'graphics.txt',license:'Arphic Public License; see LICENSE-APL',format:2,characters:records.length,grid:SHAPE_GRID,features:['stroke_count','horizontal_vertical_diagonal_directions','dots','turns_hooks','per_stroke_geometry'],bytes:model.length,sha256:createHash('sha256').update(model).digest('hex')},null,2)+'\n');
console.log(JSON.stringify({characters:records.length,bytes:model.length,revision:sha}));
