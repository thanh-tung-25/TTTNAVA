import {query} from '../config/db.js';
import {notFound} from './errors.js';
import {adminScopeOf} from './admin-permissions.js';

// Public self-registration is shared with both administrators. Other accounts use
// explicit management or verified creation provenance; enrollments never grant access.
export function studentManagementScope(profile){
 return profile?.student_management_scope??profile?.student_creator_scope??null;
}
export function isSharedStudent(profile){
 return profile?.role==='student'&&profile.registration_source==='self';
}
export function studentVisibleCondition(viewer,alias='p'){
 if(!/^[a-z][a-z0-9_]*$/i.test(alias))throw Error('Invalid profile alias');
 return adminScopeOf(viewer)==='chinese'
  ?`(${alias}.role<>'student' OR ${alias}.registration_source='self' OR COALESCE(${alias}.student_management_scope,${alias}.student_creator_scope)='chinese')`:'1=1';
}
export function isProfileVisible(viewer,target){
 return Boolean(target)&&(adminScopeOf(viewer)!=='chinese'||target.role!=='student'||isSharedStudent(target)||studentManagementScope(target)==='chinese');
}
export function canProfilesInteract(a,b){
 return Boolean(a&&b)&&isProfileVisible(a,b)&&isProfileVisible(b,a);
}
export async function assertProfilesCanInteract(aId,bId,run=query){
 const rows=await run('SELECT id,role,admin_scope,student_creator_scope,student_management_scope,registration_source,deleted_at FROM profiles WHERE id IN (?,?)',[aId,bId]);
 const a=rows.find(p=>p.id===aId),b=rows.find(p=>p.id===bId);
 if(a?.deleted_at||b?.deleted_at||!canProfilesInteract(a,b))throw notFound();
 return {a,b};
}
