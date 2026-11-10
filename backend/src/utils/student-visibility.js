import {query} from '../config/db.js';
import {notFound} from './errors.js';
import {adminScopeOf} from './admin-permissions.js';

// Unknown legacy origins stay private until an authenticated creation audit proves provenance.
// Use the immutable creation scope, never a creator's current permissions or an enrollment.
export function studentVisibleCondition(viewer,alias='p'){
 if(!/^[a-z][a-z0-9_]*$/i.test(alias))throw Error('Invalid profile alias');
 return adminScopeOf(viewer)==='chinese'
  ?`(${alias}.role<>'student' OR ${alias}.student_creator_scope='chinese')`:'1=1';
}
export function isProfileVisible(viewer,target){
 return Boolean(target)&&(adminScopeOf(viewer)!=='chinese'||target.role!=='student'||target.student_creator_scope==='chinese');
}
export function canProfilesInteract(a,b){
 return Boolean(a&&b)&&isProfileVisible(a,b)&&isProfileVisible(b,a);
}
export async function assertProfilesCanInteract(aId,bId,run=query){
 const rows=await run('SELECT id,role,admin_scope,student_creator_scope FROM profiles WHERE id IN (?,?)',[aId,bId]);
 const a=rows.find(p=>p.id===aId),b=rows.find(p=>p.id===bId);
 if(!canProfilesInteract(a,b))throw notFound();
 return {a,b};
}
