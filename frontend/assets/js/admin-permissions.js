export const adminLabels = { super:'Admin tổng', chinese:'Admin Tiếng Trung', primary:'Admin Tiểu học', secondary:'Admin THCS' };
export const adminScope = profile => profile?.adminScope || 'super';
export const isSuperAdmin = profile => profile?.role === 'admin' && adminScope(profile) === 'super';
export function adminGrades(profile) {
  const scope=adminScope(profile);
  return scope==='primary'?[1,2,3,4,5]:scope==='secondary'?[6,7,8,9]:Array.from({length:9},(_,i)=>i+1);
}
export function adminHome(profile) {
  return adminScope(profile)==='chinese'?'/pages/admin/chinese/':['primary','secondary'].includes(adminScope(profile))?'/pages/admin/questions/':'/pages/admin/students/';
}
export function adminSections(profile) {
  return adminScope(profile)==='chinese'?['chinese','students','feedback']:['primary','secondary'].includes(adminScope(profile))?['questions','students','stats','feedback']:['courses','chinese','students','questions','stats','team','deployment','feedback'];
}
