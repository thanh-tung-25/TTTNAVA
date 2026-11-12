// Update only the four speaking variables in the existing private Vercel file.
// Default is read-only. Never print a secret or replace unrelated settings.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
const root=new URL('../',import.meta.url),write=process.argv.includes('--write');
try{
 assert(process.argv.slice(2).every(arg=>arg==='--write'));
 const local=parseEnv(await readFile(new URL('.env',root),'utf8'));
 const target=new URL('.env.vercel',root),before=await readFile(target,'utf8'),remote=parseEnv(before);
 assert.equal(remote.DB_DRIVER,'postgres');assert.equal(remote.PGSCHEMA,'ttnava_stage');
 assert.equal(new URL(remote.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
 assert.equal(local.CHINESE_SPEAKING_AI_ENABLED,'true');assert.equal(local.GROQ_ZERO_DATA_RETENTION_CONFIRMED,'true');assert(local.GROQ_API_KEY?.startsWith('gsk_'));
 const daily=Number(local.CHINESE_SPEAKING_DAILY_LIMIT||5);assert(Number.isInteger(daily)&&daily>=1&&daily<=50);
 const values={CHINESE_SPEAKING_AI_ENABLED:'true',GROQ_API_KEY:local.GROQ_API_KEY,GROQ_ZERO_DATA_RETENTION_CONFIRMED:'true',CHINESE_SPEAKING_DAILY_LIMIT:String(daily)};
 let lines=before.split(/\r?\n/);const newline=before.includes('\r\n')?'\r\n':'\n';
 for(const [key,value]of Object.entries(values)){
  const pattern=new RegExp('^[ \\t]*(?:export[ \\t]+)?'+key+'[ \\t]*=');let found=false;
  lines=lines.filter(line=>{if(!pattern.test(line))return true;if(found)return false;found=true;return true;}).map(line=>pattern.test(line)?key+'='+JSON.stringify(value):line);
  if(!found)lines.push(key+'='+JSON.stringify(value));
 }
 const output=lines.join(newline),after=parseEnv(output);
 for(const [key,value]of Object.entries(remote))if(!(key in values))assert.equal(after[key],value);
 for(const [key,value]of Object.entries(values))assert.equal(after[key],value);
 if(write&&output!==before){
  const backup=new URL('backups/chinese-speaking-deploy/',root);await mkdir(backup,{recursive:true});
  await writeFile(new URL('vercel-env-before-speaking-'+new Date().toISOString().replace(/[:.]/g,'-')+'.env',backup),before,{mode:0o600});
  await writeFile(target,output.endsWith(newline)?output:output+newline,{mode:0o600});
 }
 console.log(JSON.stringify({ready:true,fileWritten:write,file:'backend/.env.vercel',variableNames:Object.keys(values),unrelatedSettingsPreserved:true,secretsPrinted:false}));
}catch{console.error(JSON.stringify({ready:false,message:'Vercel speaking configuration could not be prepared; no secrets printed.'}));process.exitCode=1;}
