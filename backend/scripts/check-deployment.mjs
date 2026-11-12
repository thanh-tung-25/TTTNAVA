// Read-only preflight. Use --origin to compare deployed assets and backend release.
import {readFile} from 'node:fs/promises';
import {deploymentCheck} from '../src/services/deployment-check.js';
import {closePool} from '../src/config/db.js';
const originIndex=process.argv.indexOf('--origin');
try{
 const checks=[];
 for(const name of ['question-audio','chat-widget','learning-support','learning-feedback','study-hub','chinese-study-extras','chinese-journey','animal-path','chinese-ai-chat','chinese-ai-chat-audio','chinese-ai-chat-data']){
  await readFile(new URL('../../frontend/assets/js/'+name+'.js',import.meta.url));checks.push({asset:name,ready:true});
 }
 if(originIndex>=0){
  const origin=new URL(process.argv[originIndex+1]);if(origin.protocol!=='https:')throw Error('Expected HTTPS deployment origin.');
  const get=async path=>{const r=await fetch(new URL(path,origin),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Deployment check failed: '+path+' HTTP '+r.status);return r;};
  const health=await (await get('/api/v1/health')).json(),build=await (await get('/assets/build-info.json')).json();
  if(health.data.release!==build.release)throw Error('Frontend và backend khác phiên bản.');
  for(const row of checks)await get('/assets/js/'+row.asset+'.js');
  console.log(JSON.stringify({ready:true,release:build.release,assets:checks}));
 }else{const db=await deploymentCheck();console.log(JSON.stringify({...db,assets:checks}));if(!db.ready)process.exitCode=1;}
}catch(error){console.error(JSON.stringify({ready:false,error:error.message}));process.exitCode=1;}finally{await closePool();}
