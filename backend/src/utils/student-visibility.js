import {query} from '../config/db.js';
import {notFound} from './errors.js';
import {adminScopeOf} from './admin-permissions.js';

// Explicit management assignments take precedence without changing creation provenance.
// Unassigned legacy accounts stay private; enrollments never grant management access.
export function studentManagementScope(profile){
 return profile?.student_management_scope??profile?.student_creator_scope??null;
}
export function studentVisibleCondition(viewer,alias='p'){
 if(!/^[a-z][a-z0-9_]*$/i.test(alias))throw Error('Invalid profile alias');
 return adminScopeOf(viewer)==='chinese'
  ?`(${alias}.role<>'student' OR COALESCE(${alias}.student_management_scope,${alias}.student_creator_scope)='chinese')`:'1=1';
}
export function isProfileVisible(viewer,target){
 return Boolean(target)&&(adminScopeOf(viewer)!=='chinese'||target.role!=='student'||studentManagementScope(target)==='chinese');
}
export function canProfilesInteract(a,b){
 return Boolean(a&&b)&&isProfileVisible(a,b)&&isProfileVisible(b,a);
}
export async function assertProfilesCanInteract(aId,bId,run=query){
 const rows=await run('SELECT id,role,admin_scope,student_creator_scope,student_management_scope FROM profiles WHERE id IN (?,?)',[aId,bId]);
 const a=rows.find(p=>p.id===aId),b=rows.find(p=>p.id===bId);
 if(!canProfilesInteract(a,b))throw notFound();
 return {a,b};
}
