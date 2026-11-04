export const adminLabels = { super:'Admin tổng', chinese:'Admin Tiếng Trung', primary:'Admin Tiểu học' };
export const adminScope = profile => profile?.adminScope || 'super';
export const isSuperAdmin = profile => profile?.role === 'admin' && adminScope(profile) === 'super';
export function adminHome(profile) {
  return adminScope(profile)==='chinese'?'/pages/admin/chinese/':adminScope(profile)==='primary'?'/pages/admin/questions/':'/pages/admin/students/';
}
export function adminSections(profile) {
  return adminScope(profile)==='chinese'?['chinese','students']:adminScope(profile)==='primary'?['questions','students','stats']:['courses','chinese','students','questions','stats','team'];
}
