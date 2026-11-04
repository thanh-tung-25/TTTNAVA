// Connection check only: no migrations, imports or application config changes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendRoot=fileURLToPath(new URL('../',import.meta.url));
const config=dotenv.parse(await fs.readFile(path.join(backendRoot,'.env.supabase'),'utf8'));
const required=['SUPABASE_PROJECT_REF','PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD'];
const missing=required.filter(name=>!config[name]?.trim());
if(missing.length){console.error(JSON.stringify({ok:false,code:'MISSING_SETTINGS',fields:missing}));process.exit(1);}
if(!/^[a-z0-9.-]+$/i.test(config.PGHOST)||!/^\d+$/.test(config.PGPORT)){
  console.error(JSON.stringify({ok:false,code:'INVALID_HOST_OR_PORT',hint:'PGHOST must contain only the hostname, without a URL prefix, username, password or port.'}));process.exit(1);
}
const ssl={rejectUnauthorized:true};
if(config.PGSSLROOTCERT)ssl.ca=await fs.readFile(path.resolve(backendRoot,config.PGSSLROOTCERT),'utf8');
const client=new pg.Client({host:config.PGHOST,port:Number(config.PGPORT),database:config.PGDATABASE,
  user:config.PGUSER,password:config.PGPASSWORD,ssl,connectionTimeoutMillis:10000,
  statement_timeout:10000,application_name:'ttnava-read-only-connection-check'});
try{
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const {rows:[server]}=await client.query("SELECT current_database() AS database,current_setting('server_version') AS version");
  const {rows:tables}=await client.query("SELECT table_schema AS schema,COUNT(*)::int AS tables FROM information_schema.tables WHERE table_schema IN ('public','app') AND table_type='BASE TABLE' GROUP BY table_schema ORDER BY table_schema");
  await client.query('ROLLBACK');
  console.log(JSON.stringify({ok:true,encrypted:true,certificateVerified:true,
    project:config.SUPABASE_PROJECT_REF,connectionMode:config.PGHOST.endsWith('.pooler.supabase.com')?(config.PGPORT==='5432'?'session-pooler':'transaction-pooler'):'direct',
    ...server,applicationSchemas:tables,dataChanged:false}));
}catch(error){
  // Never echo the raw driver error or connection configuration: a malformed
  // setting can otherwise expose a password in tool output or logs.
  const hints={
    '28P01':'Database authentication failed. Check the database password and the pooler username.',
    ENOTFOUND:'Database hostname was not found. Copy Host from the Connect panel.',
    ENETUNREACH:'Database endpoint is unreachable. Use the IPv4 session pooler for this machine.',
    ECONNREFUSED:'Database connection was refused. Check the pooler port and project status.',
    EPERM:'Network access is blocked in this execution environment.',
    EACCES:'Network access is blocked in this execution environment.',
    SELF_SIGNED_CERT_IN_CHAIN:'TLS certificate is not trusted. Configure the trusted CA; certificate checks remain enabled.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE:'TLS certificate is not trusted. Configure the trusted CA; certificate checks remain enabled.',
  };
  const code=typeof error.code==='string'?error.code:'CONNECTION_FAILED';
  console.error(JSON.stringify({ok:false,code,hint:hints[code]||'The secure read-only connection check failed. Recheck connection settings and project availability.',dataChanged:false}));
  process.exitCode=1;
}finally{await client.end().catch(()=>{});}
