// Save public integrity metadata only; learning answers remain in private files.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadHighschoolContent} from './lib/seed-highschool-content.mjs';
const rows=await loadHighschoolContent(),files=[];
for(const subjectId of [...new Set(rows.map(row=>row.subjectId))]){
 const file=subjectId+'.json',bytes=await fs.readFile(new URL('../seed-data/highschool-content/'+file,import.meta.url)),subject=rows.filter(row=>row.subjectId===subjectId);
 files.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),lessons:subject.length,questions:subject.reduce((n,row)=>n+row.questions.length,0)});
}
await fs.writeFile(new URL('../seed-data/highschool-content-manifest.json',import.meta.url),JSON.stringify({version:1,privatePackage:'learning-content-private.zip',lessons:rows.length,questions:rows.reduce((n,row)=>n+row.questions.length,0),files},null,2)+'\n','utf8');
console.log(JSON.stringify({manifestReady:true,lessons:rows.length,subjects:files.length}));
