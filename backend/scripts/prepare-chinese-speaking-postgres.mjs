// Add only the nullable speaking settings column; existing content is preserved.
import {query,closePool,isPostgres} from '../src/config/db.js';
try{
 if(!isPostgres)throw Error('Use the normal MySQL migration runner for local databases.');
 let rows=await query("SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='chinese_sets' AND column_name='speaking_settings'");
 if(!rows.length&&process.argv.includes('--apply')){
  await query('ALTER TABLE chinese_sets ADD COLUMN IF NOT EXISTS speaking_settings JSONB NULL');
  rows=await query("SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='chinese_sets' AND column_name='speaking_settings'");
 }
 const ready=rows[0]?.data_type==='jsonb';console.log(JSON.stringify({ready,column:'chinese_sets.speaking_settings',existing_content_changed:false}));if(!ready)process.exitCode=1;
}catch(error){console.error(JSON.stringify({ready:false,error:error.message}));process.exitCode=1;}finally{await closePool();}
