import {query,dialectSql} from '../config/db.js';
import {notFound} from '../utils/errors.js';
let checkedAt=0,available=false;
export async function worksheetSolutionImagesAvailable(){
 if(Date.now()-checkedAt<30000)return available;
 const rows=await query(dialectSql("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='worksheet_solution_images'","SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='worksheet_solution_images'"));
 available=rows.length>0;checkedAt=Date.now();return available;
}
export function snapshotIncludesSolution(snapshot,id){
 const data=typeof snapshot==='string'?JSON.parse(snapshot):snapshot;
 return Boolean(data?.items?.some(item=>item.solutionImageIds?.includes(id)));
}
export async function requireSolutionImageSubmission(user,image,run=query){
 if(user.role==='admin'||!(image.is_solution===true||Number(image.is_solution)===1))return;
 const attempts=await run("SELECT snapshot FROM worksheet_attempts WHERE worksheet_id=? AND student_id=? AND submitted_at IS NOT NULL AND status IN ('completed','pending_review')",[image.worksheet_id,user.id]);
 if(!attempts.some(attempt=>snapshotIncludesSolution(attempt.snapshot,image.id)))throw notFound();
}
