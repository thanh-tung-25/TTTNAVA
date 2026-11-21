import {query,dialectSql} from '../config/db.js';
let checkedAt=0,available=false;
// Existing deployments keep serving their old question bank until the additive
// exam metadata migration has been applied separately.
export async function worksheetExamsAvailable(){
 if(Date.now()-checkedAt<30000)return available;
 const rows=await query(dialectSql("SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='worksheets' AND column_name='exam_config'","SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='worksheets' AND column_name='exam_config'"));
 available=rows.length>0;checkedAt=Date.now();return available;
}
