// Additive schema only; preview by default. No user events or fixtures inserted.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createPostgresDatabase} from '../src/config/postgres.js';
const args=process.argv.slice(2);assert(args.every(arg=>arg==='--apply'));const apply=args.includes('--apply'),settings=parseEnv(await readFile(new URL('../.env.vercel',import.meta.url),'utf8'));
assert.equal(settings.DB_DRIVER,'postgres');assert.equal(settings.PGSCHEMA,'ttnava_stage');assert.equal(new URL(settings.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
const db=createPostgresDatabase({...settings,PG_READ_ONLY:apply?'false':'true'},fileURLToPath(new URL('../',import.meta.url)));
try{const tables=['user_access_tracking','user_access_events'];if(apply)await db.transaction(async client=>{await client.query("SELECT pg_advisory_xact_lock(hashtext('ttnava-user-access-schema'))");await client.query(await readFile(new URL('../sql/postgres/037_user_access_history.sql',import.meta.url),'utf8'));});
 const present=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN ('user_access_tracking','user_access_events')")).rows.map(r=>r.table_name);console.log(JSON.stringify({ready:tables.every(t=>present.includes(t)),mode:apply?'applied-schema':'read-only-preview',project:'njaasgcfgjismpmzoncb',schema:'ttnava_stage',tables:present,missing:tables.filter(t=>!present.includes(t)),no_user_events_created:true}));
}catch(error){console.error(JSON.stringify({ready:false,code:error.code||error.name,message:'Access history schema preparation failed; private connection details omitted.'}));process.exitCode=1;}finally{await db.close();}
