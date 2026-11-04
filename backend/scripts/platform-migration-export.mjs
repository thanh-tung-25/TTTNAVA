// Read-only, consistent snapshot for the MySQL -> Supabase migration.
// Files contain private application data and stay under ignored backups/.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';

const backendRoot=fileURLToPath(new URL('../',import.meta.url));
const exportData=process.argv.includes('--export');
const destination=path.join(backendRoot,'backups','platform-migration',new Date().toISOString().replace(/[:.]/g,'-'));
const identifier=value=>{
  if(!/^[a-zA-Z0-9_]+$/.test(value))throw Error('Unsupported SQL identifier');
  return '`'+value+'`';
};
const connection=await mysql.createConnection({
  host:env.db.host,port:env.db.port,user:env.db.user,password:env.db.password,database:env.db.database,
  charset:'utf8mb4',timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,
  ssl:env.db.ssl?{ca:await fs.readFile(env.db.caPath,'utf8'),rejectUnauthorized:true}:undefined,
});
try{
  await connection.query("SET time_zone = '+00:00'");
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('SET TRANSACTION READ ONLY');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  const [tables]=await connection.query("SELECT TABLE_NAME name,ENGINE engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  if(tables.some(t=>t.engine!=='InnoDB'))throw Error('A non-transactional table prevents a consistent snapshot');
  const [columns]=await connection.query(`SELECT TABLE_NAME tableName,COLUMN_NAME name,DATA_TYPE dataType,COLUMN_TYPE columnType,
    IS_NULLABLE isNullable,COLUMN_DEFAULT defaultValue,EXTRA extra,ORDINAL_POSITION position
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION`);
  const [keys]=await connection.query(`SELECT TABLE_NAME tableName,COLUMN_NAME columnName,CONSTRAINT_NAME constraintName,
    ORDINAL_POSITION position,REFERENCED_TABLE_NAME referencedTable,REFERENCED_COLUMN_NAME referencedColumn
    FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION`);
  const [indexes]=await connection.query(`SELECT TABLE_NAME tableName,INDEX_NAME name,NON_UNIQUE nonUnique,COLUMN_NAME columnName,SEQ_IN_INDEX position
    FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX`);
  const [foreignKeyRules]=await connection.query(`SELECT TABLE_NAME tableName,CONSTRAINT_NAME name,UPDATE_RULE updateRule,DELETE_RULE deleteRule
    FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME`);
  const [checkMetadata]=await connection.query("SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='information_schema' AND TABLE_NAME='CHECK_CONSTRAINTS'");
  const tableField=checkMetadata.some(c=>c.name==='TABLE_NAME')?'TABLE_NAME tableName,':'';
  const [checks]=await connection.query(`SELECT ${tableField}CONSTRAINT_NAME name,CHECK_CLAUSE expression
    FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() ORDER BY CONSTRAINT_NAME`);
  const manifest={format:'ttnava-mysql-snapshot-v1',createdAt:new Date().toISOString(),source:'local-configured-database',
    encoding:'UTF-8 JSONL; binary columns are {$binary:base64}; timestamps UTC; BIGINT/DECIMAL preserved as strings',
    complete:false,tables:[],columns,keys,indexes,foreignKeyRules,checks};
  if(exportData)await fs.mkdir(destination,{recursive:true,mode:0o700});
  for(const table of tables){
    const [{n}]=(await connection.query('SELECT COUNT(*) n FROM '+identifier(table.name)))[0];
    const primary=keys.filter(k=>k.tableName===table.name&&k.constraintName==='PRIMARY').map(k=>k.columnName);
    const entry={name:table.name,rows:Number(n),primaryKey:primary};
    if(exportData){
      if(!primary.length&&Number(n))throw Error('Missing primary key: '+table.name);
      const filename=table.name+'.jsonl';const handle=await fs.open(path.join(destination,filename),'wx');
      const hash=createHash('sha256');let exported=0,last=null;
      const batchSize=columns.some(c=>c.tableName===table.name&&/blob|binary/.test(c.dataType))?1:500;
      try{
        while(primary.length){
          // MySQL orders ENUM columns by declaration position; compare and
          // order them as text so the cursor uses the same ordering in both.
          const fields=primary.map(key=>{
            const type=columns.find(c=>c.tableName===table.name&&c.name===key)?.dataType;
            return ['enum','set'].includes(type)?'CAST('+identifier(key)+' AS CHAR)':identifier(key);
          }).join(',');
          const where=last?' WHERE ('+fields+') > ('+primary.map(()=>'?').join(',')+')':'';
          // Blob tables use one row to bound memory for existing 20 MB files.
          const [rows]=await connection.query('SELECT * FROM '+identifier(table.name)+where+' ORDER BY '+fields+' LIMIT '+batchSize,last||[]);
          if(!rows.length)break;
          last=primary.map(k=>rows.at(-1)[k]);
          const lines=[];
          for(const row of rows){
            for(const [key,value] of Object.entries(row))if(Buffer.isBuffer(value))row[key]={$binary:value.toString('base64')};
            lines.push(JSON.stringify(row)+'\n');exported++;
          }
          const chunk=lines.join('');await handle.writeFile(chunk);hash.update(chunk);
        }
      }finally{await handle.close();}
      if(exported!==entry.rows)throw Error('Snapshot row count mismatch: '+table.name);
      entry.file=filename;entry.sha256=hash.digest('hex');entry.bytes=(await fs.stat(path.join(destination,filename))).size;
    }
    manifest.tables.push(entry);
    if(exportData)console.log(JSON.stringify({table:entry.name,rows:entry.rows}));
  }
  await connection.commit();
  manifest.complete=true;
  if(exportData){
    // Re-read every byte from disk so a finished export is verifiable independently.
    for(const table of manifest.tables){
      const data=await fs.readFile(path.join(destination,table.file));
      if(createHash('sha256').update(data).digest('hex')!==table.sha256)throw Error('Export checksum mismatch: '+table.name);
    }
    const schema=JSON.stringify(manifest,null,2)+'\n';await fs.writeFile(path.join(destination,'manifest.json'),schema,{flag:'wx',mode:0o600});
  }
  console.log(JSON.stringify({mode:exportData?'export':'inventory',tables:manifest.tables.length,
    rows:manifest.tables.reduce((s,t)=>s+t.rows,0),binaryColumns:columns.filter(c=>/blob|binary/.test(c.dataType)).map(c=>c.tableName+'.'+c.name),
    ...(exportData?{destination,checksumsVerified:true}:{counts:manifest.tables.map(t=>({table:t.name,rows:t.rows}))})}));
}catch(error){await connection.rollback();throw error;}
finally{await connection.end();}
