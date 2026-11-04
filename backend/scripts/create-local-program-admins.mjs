import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import env from '../src/config/env.js';
import { query, closePool } from '../src/config/db.js';
import { createAdmin } from '../src/services/admin-team.js';

// This helper deliberately cannot modify Supabase or any remote database.
if (env.db.driver!=='mysql' || !['127.0.0.1','localhost','::1'].includes(env.db.host) || env.isProduction) {
  throw Error('This helper only supports a local development MySQL database.');
}
const programs=[
  {username:'admin_tiengtrung',displayName:'Quản lý Tiếng Trung',adminScope:'chinese'},
  {username:'admin_cap1',displayName:'Quản lý Tiểu học',adminScope:'primary'},
];
let output,report;
try{
  const [actor]=await query("SELECT * FROM profiles WHERE role='admin' AND admin_scope='super' AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) ORDER BY created_at,id LIMIT 1");
  if(!actor)throw Error('An active local super admin is required.');
  const accounts=[];
  for(const program of programs){
    const [existing]=await query('SELECT role,admin_scope FROM profiles WHERE username=?',[program.username]);
    if(existing&&(existing.role!=='admin'||existing.admin_scope!==program.adminScope))throw Error('A reserved username already belongs to a different account.');
    accounts.push({...program,...(existing?{existing:true,passwordUnchanged:true}:{password:randomBytes(18).toString('base64url'),created:false})});
  }
  if(!process.argv.includes('--apply')){
    console.log(JSON.stringify({mode:'preview',accounts:accounts.map(({username,adminScope,existing})=>({username,adminScope,existing:Boolean(existing)})),databaseChanged:false}));
  }else{
    const directory=path.join(env.backendRoot,'backups/admin-accounts');
    await fs.mkdir(directory,{recursive:true});
    output=path.join(directory,new Date().toISOString().replace(/[:.]/g,'-')+'.json');
    report={database:env.db.database,localOnly:true,createdAt:new Date().toISOString(),accounts};
    // Save credentials before creating accounts, so an interruption cannot lose them.
    await fs.writeFile(output,JSON.stringify(report,null,2),{mode:0o600});
    for(const account of accounts){
      if(account.existing)continue;
      const profile=await createAdmin(actor,{username:account.username,displayName:account.displayName,password:account.password,adminScope:account.adminScope});
      account.id=profile.id;account.created=true;
      await fs.writeFile(output,JSON.stringify(report,null,2),{mode:0o600});
    }
    console.log(JSON.stringify({ok:true,localOnly:true,accounts:accounts.map(({username,adminScope,created,existing})=>({username,adminScope,created:Boolean(created),existing:Boolean(existing)})),credentialsFile:output,secretsPrinted:false}));
  }
}catch(error){
  console.error(JSON.stringify({ok:false,code:error.code||'LOCAL_ADMIN_SETUP_FAILED',credentialsFile:output||null}));process.exitCode=1;
}finally{await closePool();}
