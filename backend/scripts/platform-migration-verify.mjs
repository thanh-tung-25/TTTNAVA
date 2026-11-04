import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';

if(!process.argv[2])throw Error('Usage: node scripts/platform-migration-verify.mjs <snapshot-directory>');
const directory=path.resolve(process.argv[2]);
const manifest=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
if(manifest.format!=='ttnava-mysql-snapshot-v1'||!manifest.complete||!Array.isArray(manifest.tables))throw Error('Incomplete or unsupported snapshot');
let total=0,binaryValues=0;
for(const table of manifest.tables){
  if(!/^[a-zA-Z0-9_]+$/.test(table.name)||table.file!==table.name+'.jsonl')throw Error('Unsafe snapshot filename');
  const file=path.join(directory,table.file);const hash=createHash('sha256');
  for await(const chunk of createReadStream(file))hash.update(chunk);
  if(hash.digest('hex')!==table.sha256)throw Error('Checksum mismatch: '+table.name);
  if((await fs.stat(file)).size!==table.bytes)throw Error('File size mismatch: '+table.name);
  const rows=createInterface({input:createReadStream(file),crlfDelay:Infinity});
  let count=0;const seen=new Set();
  for await(const line of rows){
    const row=JSON.parse(line);const key=JSON.stringify(table.primaryKey.map(k=>row[k]));
    if(seen.has(key))throw Error('Duplicate primary key: '+table.name);
    seen.add(key);count++;
    for(const value of Object.values(row))if(value&&typeof value==='object'&&'$binary' in value){
      if(typeof value.$binary!=='string'||Buffer.from(value.$binary,'base64').toString('base64')!==value.$binary)throw Error('Invalid binary encoding: '+table.name);
      binaryValues++;
    }
  }
  if(count!==table.rows)throw Error('Row count mismatch: '+table.name);total+=count;
}
console.log(JSON.stringify({verified:true,tables:manifest.tables.length,rows:total,binaryValues,uniquePrimaryKeys:true}));
