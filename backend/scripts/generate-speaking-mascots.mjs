// Retain the existing vector artwork and animate just the mouth. SVG animation
// attributes work inside images under the app's policy without inline CSS/JS.
import {readFile,writeFile} from 'node:fs/promises';
const images=new URL('../../frontend/assets/images/',import.meta.url);
const mouths={
 panda:{path:'M140 146V151M126 151Q140 166 154 151',stem:'M140 146V151',x:140,y:155,stroke:'#514154',width:3,fill:'#463046',tongue:'#e69aa9'},
 lion:{path:'M119 132V139M104 139Q110 146 119 139Q128 146 135 139',stem:'M119 132V139',x:119,y:143,stroke:'#80604a',width:2.6,fill:'#65443b',tongue:'#e89594'}
};
for(const [name,mouth]of Object.entries(mouths)){
 const source=await readFile(new URL(`mascot-${name}.svg`,images),'utf8');
 const pattern=new RegExp('<path d="'+mouth.path+'"[^>]+/>');
 if(!pattern.test(source))throw Error('Cannot find the original '+name+' mouth.');
 const animated=`<path d="${mouth.stem}" stroke="${mouth.stroke}" stroke-width="${mouth.width}" stroke-linecap="round"/>
<g transform="translate(${mouth.x} ${mouth.y})"><g>
 <animateTransform attributeName="transform" type="scale" values="1 .18;1 .9;1 .4;1 1;1 .25;1 .7;1 .18" keyTimes="0;.18;.36;.55;.73;.88;1" dur=".58s" repeatCount="indefinite"/>
 <ellipse rx="12" ry="8" fill="${mouth.fill}"/><ellipse cy="4" rx="7" ry="3" fill="${mouth.tongue}"/>
</g></g>`;
 await writeFile(new URL(`mascot-${name}-talking.svg`,images),source.replace(pattern,animated));
}
console.log('Generated speaking panda and lion from the existing SVG artwork.');
