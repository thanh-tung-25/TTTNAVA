// Local XAMPP only: insert missing default content, preserve all teacher edits.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import mysql from 'mysql2';
import env from '../src/config/env.js';
import {query,withTransaction,closePool} from '../src/config/db.js';
import {defaultStreetLesson} from '../src/data/chinese-street-missions.js';
import {streetSettingsSchema} from '../src/services/chinese-street.js';

if(env.db.driver!=='mysql'||!['127.0.0.1','localhost','::1'].includes(env.db.host)||env.db.database!=='kids_learning'){
 throw Error('Script này chỉ dành cho MySQL XAMPP local, database kids_learning.');
}
try{
 const result=await withTransaction(async c=>{
  const run=async(sql,params=[]) =>(await c.query(sql,params))[0];
  const lessons=await run("SELECT * FROM chinese_lessons WHERE level_id=1 AND status='published' ORDER BY position,title FOR UPDATE");
  const rows=[];let inserted=0,preserved=0;
  for(const lesson of lessons){
   const defaults=defaultStreetLesson(lesson);if(!defaults)continue;
   streetSettingsSchema.parse({...defaults,revision:0});
   const [old]=await run('SELECT data FROM chinese_street_lessons WHERE lesson_id=? FOR UPDATE',[lesson.id]);
   const data=old?(typeof old.data==='string'?JSON.parse(old.data):old.data):defaults;
   if(old)preserved++;
   else{await run('INSERT INTO chinese_street_lessons(lesson_id,data,revision) VALUES (?,?,1)',[lesson.id,JSON.stringify(data)]);inserted++;}
   rows.push({lesson_id:lesson.id,title:lesson.title,missions:data.missions.length,data});
  }
  return {rows,inserted,preserved};
 });
 const directory=new URL('../../tai-lieu/pho-tieng-trung/',import.meta.url);
 await mkdir(directory,{recursive:true});
 const schema=await readFile(new URL('../sql/migrations/036_chinese_street.sql',import.meta.url),'utf8');
 const statements=result.rows.map(row=>`-- ${row.title.replace(/[\r\n]/g,' ')}\nINSERT INTO chinese_street_lessons(lesson_id,data,revision)\nSELECT ${mysql.escape(row.lesson_id)},${mysql.escape(JSON.stringify(row.data))},1\nWHERE NOT EXISTS (SELECT 1 FROM chinese_street_lessons WHERE lesson_id=${mysql.escape(row.lesson_id)});`);
 await writeFile(new URL('pho-tieng-trung-xampp.sql',directory),`-- TTNAVA: Phố tiếng Trung, MySQL/MariaDB local only.\n-- Create missing tables and insert missing lesson content; never overwrite teacher edits.\n-- No student accounts, grades, recordings or API keys in this file.\nSET NAMES utf8mb4;\nUSE kids_learning;\n\n${schema}\nSTART TRANSACTION;\n${statements.join('\n\n')}\nCOMMIT;\n`,'utf8');
 const [total]=await query('SELECT COUNT(*) total FROM chinese_street_lessons');
 console.log(JSON.stringify({database:env.db.database,host:env.db.host,inserted:result.inserted,preserved:result.preserved,prepared_lessons:result.rows.length,prepared_missions:result.rows.reduce((n,r)=>n+r.missions,0),content_rows:Number(total.total),sql_file:'tai-lieu/pho-tieng-trung/pho-tieng-trung-xampp.sql',lessons:result.rows.map(({data,...row})=>row)},null,2));
}finally{await closePool();}
