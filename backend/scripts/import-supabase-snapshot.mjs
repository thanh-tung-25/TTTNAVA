// Stage an independently verified XAMPP snapshot in a private Supabase schema.
// Default: validate DDL in a transaction and ROLLBACK. --apply imports atomically.
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import {schemaPlan,ident,isJsonColumn,utcTimestamp} from './lib/postgres-snapshot-schema.mjs';

const backendRoot=fileURLToPath(new URL('../',import.meta.url));
if(!process.argv[2]||process.argv[2].startsWith('--'))throw Error('Provide the snapshot directory');
const directory=path.resolve(process.argv[2]);
const manifestText=await fs.readFile(path.join(directory,'manifest.json'),'utf8');
const manifest=JSON.parse(manifestText),plan=schemaPlan(manifest),apply=process.argv.includes('--apply');
const sourceHash=createHash('sha256').update(manifestText).digest('hex');
const config=dotenv.parse(await fs.readFile(path.join(backendRoot,'.env.supabase'),'utf8'));
if(config.SUPABASE_PROJECT_REF!=='njaasgcfgjismpmzoncb')throw Error('Unexpected Supabase project');
if(config.PGUSER!=='postgres.'+config.SUPABASE_PROJECT_REF)throw Error('Use the configured project session pooler');
if(!/^[a-z0-9.-]+$/i.test(config.PGHOST)||config.PGPORT!=='5432'||!config.PGPASSWORD||!config.PGSSLROOTCERT)throw Error('Incomplete secure session-pooler settings');
const client=new pg.Client({host:config.PGHOST,port:5432,database:config.PGDATABASE,
  user:config.PGUSER,password:config.PGPASSWORD,
  ssl:{rejectUnauthorized:true,ca:await fs.readFile(path.resolve(backendRoot,config.PGSSLROOTCERT),'utf8')},
  connectionTimeoutMillis:15000,statement_timeout:120000,
  application_name:'ttnava-private-snapshot-migration',
  types:{getTypeParser(oid,format){return [1082,1114,1184].includes(oid)?v=>v:pg.types.getTypeParser(oid,format);}},
});

function sorted(value){
  if(Array.isArray(value))return value.map(sorted);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])]));
  return value;
}
function normalize(column,value){
  if(value===null)return null;
  if(/blob|binary/.test(column.dataType)){
    const bytes=Buffer.isBuffer(value)?value:Buffer.from(value.$binary,'base64');
    return {$sha256:createHash('sha256').update(bytes).digest('hex')};
  }
  if(isJsonColumn(manifest,column))return sorted(typeof value==='string'?JSON.parse(value):value);
  if(['tinyint','smallint','int','integer','bigint'].includes(column.dataType))return BigInt(value).toString();
  if(column.dataType==='decimal')return String(value);
  if(['datetime','timestamp'].includes(column.dataType)){
    return utcTimestamp(value);
  }
  return column.dataType==='char'?String(value).trimEnd():value;
}
function normalizedRow(columns,row){return JSON.stringify(columns.map(c=>normalize(c,row[c.name])))+'\n';}
function inputValue(column,value){
  if(value===null)return null;
  if(/blob|binary/.test(column.dataType))return Buffer.from(value.$binary,'base64');
  if(['datetime','timestamp'].includes(column.dataType))return String(value).replace(' ','T')+'Z';
  return value;
}
async function* sourceRows(table){
  if(table.file!==table.name+'.jsonl')throw Error('Unexpected source filename');
  const lines=createInterface({input:createReadStream(path.join(directory,table.file)),crlfDelay:Infinity});
  for await(const line of lines)yield JSON.parse(line);
}

let phase='preflight',currentTable=null,inTransaction=false;
try{
  for(const table of manifest.tables){
    const hash=createHash('sha256');for await(const bytes of createReadStream(path.join(directory,table.file)))hash.update(bytes);
    if(hash.digest('hex')!==table.sha256)throw Error('Source checksum mismatch');
  }
  await client.connect();
  const {rows:existing}=await client.query('SELECT nspname FROM pg_namespace WHERE nspname=$1',[plan.schema]);
  if(existing.length)throw Error('Target staging schema already exists; refusing to overwrite');
  await client.query('BEGIN');inTransaction=true;
  await client.query("SET LOCAL TIME ZONE 'UTC'");
  await client.query("SET LOCAL lock_timeout='5s'");
  phase='schema';for(const sql of plan.before)await client.query(sql);
  if(!apply){
    for(const sql of [...plan.after,...plan.security])await client.query(sql);
    await client.query('ROLLBACK');inTransaction=false;
    console.log(JSON.stringify({ok:true,mode:'schema-validation-rolled-back',tables:manifest.tables.length,foreignKeys:plan.after.length,persistentChanges:false}));
  }else{
    const verified=[];
    for(const table of manifest.tables){
      phase='data-import';currentTable=table.name;
      const columns=manifest.columns.filter(c=>c.tableName===table.name);
      const names=columns.map(c=>ident(c.name)).join(',');
      const sourceDigest=createHash('sha256');let batch=[],batchBytes=0,count=0;
      const hasBinary=columns.some(c=>/blob|binary/.test(c.dataType));
      const maxBatch=Math.min(hasBinary?50:1000,Math.floor(60000/columns.length));
      async function flush(){
        if(!batch.length)return;const params=[];
        const tuples=batch.map(row=>'('+columns.map(c=>{params.push(inputValue(c,row[c.name]));return '$'+params.length;}).join(',')+')');
        await client.query('INSERT INTO '+plan.full(table.name)+' ('+names+') VALUES '+tuples.join(','),params);batch=[];batchBytes=0;
      }
      for await(const row of sourceRows(table)){
        sourceDigest.update(normalizedRow(columns,row));batch.push(row);count++;
        if(hasBinary)batchBytes+=Object.values(row).reduce((n,v)=>n+(v?.$binary?.length||0),0);
        if(batch.length>=maxBatch||batchBytes>=4*1024*1024)await flush();
      }
      await flush();if(count!==table.rows)throw Error('Source count mismatch');
      phase='data-verification';
      const targetDigest=createHash('sha256');let targetCount=0,verifyBatch=[],verifyBytes=0;
      // MySQL and PostgreSQL collations order text differently. Verify rows
      // by the original primary keys, using parameterized exact lookups.
      const keyColumns=table.primaryKey.map(k=>columns.find(c=>c.name===k));
      const keyOf=row=>JSON.stringify(keyColumns.map(c=>normalize(c,row[c.name])));
      async function verifyRows(){
        if(!verifyBatch.length)return;const params=[];
        const where=verifyBatch.map(original=>'('+table.primaryKey.map(k=>{params.push(original[k]);return ident(k)+'=$'+params.length;}).join(' AND ')+')').join(' OR ');
        const {rows}=await client.query('SELECT * FROM '+plan.full(table.name)+' WHERE '+where,params);
        if(rows.length!==verifyBatch.length)throw Error('Transferred row count mismatch');
        const byKey=new Map(rows.map(row=>[keyOf(row),row]));
        for(const original of verifyBatch){
          const row=byKey.get(keyOf(original));
          if(!row||normalizedRow(columns,row)!==normalizedRow(columns,original))throw Error('Transferred row mismatch');
          targetDigest.update(normalizedRow(columns,row));targetCount++;
        }
        verifyBatch=[];verifyBytes=0;
      }
      for await(const original of sourceRows(table)){
        verifyBatch.push(original);
        if(hasBinary)verifyBytes+=Object.values(original).reduce((n,v)=>n+(v?.$binary?.length||0),0);
        if(verifyBatch.length>=maxBatch||verifyBytes>=4*1024*1024)await verifyRows();
      }
      await verifyRows();
      if(targetCount!==count||sourceDigest.digest('hex')!==targetDigest.digest('hex'))throw Error('Transferred table mismatch');
      for(const c of columns.filter(c=>c.extra.includes('auto_increment'))){
        await client.query('SELECT setval(pg_get_serial_sequence($1,$2),COALESCE(MAX('+ident(c.name)+'),1),COUNT(*)>0) FROM '+plan.full(table.name),[plan.schema+'.'+table.name,c.name]);
      }
      verified.push({table:table.name,rows:count});console.log(JSON.stringify({verifiedTable:table.name,rows:count,completed:verified.length,total:manifest.tables.length}));
    }
    phase='foreign-keys';for(const sql of plan.after)await client.query(sql);
    phase='security';for(const sql of plan.security)await client.query(sql);
    const {rows:[security]}=await client.query("SELECT COUNT(*)::int tables,COUNT(*) FILTER(WHERE c.relrowsecurity)::int rls_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind='r'",[plan.schema]);
    if(security.tables!==manifest.tables.length||security.rls_tables!==manifest.tables.length)throw Error('RLS verification failed');
    const report={ok:true,project:config.SUPABASE_PROJECT_REF,schema:plan.schema,sourceManifestSha256:sourceHash,verified,security,
      fileBytesPreserved:true,sourceUnchanged:true,applicationSwitched:false,at:new Date().toISOString()};
    await client.query('COMMENT ON SCHEMA '+ident(plan.schema)+' IS '+"'"+JSON.stringify({sourceHash,complete:true}).replaceAll("'","''")+"'");
    phase='commit';await client.query('COMMIT');inTransaction=false;
    await fs.writeFile(path.join(directory,'supabase-import-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({ok:true,mode:'imported-to-private-staging',schema:plan.schema,tables:verified.length,rows:verified.reduce((n,t)=>n+t.rows,0),applicationSwitched:false}));
  }
}catch(error){
  if(inTransaction)await client.query('ROLLBACK').catch(()=>{});
  console.error(JSON.stringify({ok:false,phase,table:currentTable,code:error.code||'MIGRATION_CHECK_FAILED',errorType:error.name,constraint:error.constraint||null,rolledBack:inTransaction}));
  process.exitCode=1;
}finally{await client.end().catch(()=>{});}
