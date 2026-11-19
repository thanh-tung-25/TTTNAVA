export const adminLabels = { super:'Admin tổng', chinese:'Admin Tiếng Trung', primary:'Admin Tiểu học', secondary:'Admin THCS', highschool:'Admin THPT' };
export const adminScope = profile => profile?.adminScope || 'super';
export const isSuperAdmin = profile => profile?.role === 'admin' && adminScope(profile) === 'super';
export const canViewStudentEmail = profile => profile?.role === 'admin' && ['super','chinese'].includes(adminScope(profile));
export function adminGrades(profile) {
  const scope=adminScope(profile);
  return scope==='primary'?[1,2,3,4,5]:scope==='secondary'?[6,7,8,9]:scope==='highschool'?[10,11,12]:Array.from({length:12},(_,i)=>i+1);
}
export function adminHome(profile) {
  return adminScope(profile)==='chinese'?'/pages/admin/chinese/':['primary','secondary','highschool'].includes(adminScope(profile))?'/pages/admin/questions/':'/pages/admin/students/';
}
export function adminSections(profile) {
  return adminScope(profile)==='chinese'?['chinese','students','access-history','feedback','assignments','courses']:['primary','secondary','highschool'].includes(adminScope(profile))?['questions','students','access-history','stats','feedback','assignments']:['courses','chinese','students','access-history','questions','stats','team','deployment','feedback','assignments'];
}
