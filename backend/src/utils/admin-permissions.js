import { AppError } from './errors.js';

export const ADMIN_SCOPES = ['super', 'chinese', 'primary'];
export function adminScopeOf(user) {
  if (user?.role !== 'admin') return null;
  const scope = user.admin_scope ?? 'super';
  return ADMIN_SCOPES.includes(scope) ? scope : null;
}
export function canManage(user, scope) {
  const assigned = adminScopeOf(user);
  return assigned === 'super' || assigned === scope;
}
export function adminHome(user) {
  const scope = adminScopeOf(user);
  return scope === 'chinese' ? '/pages/admin/chinese/' : scope === 'primary' ? '/pages/admin/questions/' : '/pages/admin/students/';
}
export function requireAdminScope(scope) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập.'));
    if (!canManage(req.user, scope)) return next(new AppError(403, 'ADMIN_SCOPE_FORBIDDEN', 'Bạn không có quyền quản lý phần này.'));
    next();
  };
}
export const requireSuperAdmin = requireAdminScope('super');
export function adminPageScope(req, res, next) {
  const scope = adminScopeOf(req.user);
  if (scope === 'super') return next();
  const section = req.path.split('/').filter(Boolean)[0];
  const allowed = scope === 'chinese' ? ['chinese', 'students'] : scope === 'primary' ? ['questions', 'worksheets', 'students', 'stats'] : [];
  if (!allowed.includes(section)) return res.redirect(adminHome(req.user));
  next();
}

// A learner can belong to both programs regardless of their profile grade.
// Include past enrollments/orders to keep historical progress visible.
export function studentProgramCondition(alias, scope) {
  if (!['primary', 'chinese'].includes(scope) || !/^[a-z]+$/.test(alias)) throw Error('Invalid program scope');
  const legacy = scope === 'chinese' ? `${alias}.grade IS NULL` : `${alias}.grade IS NOT NULL`;
  return `(EXISTS(SELECT 1 FROM course_enrollments pe JOIN courses pc ON pc.id=pe.course_id WHERE pe.student_id=${alias}.id AND pc.kind='${scope}')
    OR EXISTS(SELECT 1 FROM course_orders po JOIN courses pc ON pc.id=po.course_id WHERE po.student_id=${alias}.id AND pc.kind='${scope}')
    OR (NOT EXISTS(SELECT 1 FROM course_enrollments pe WHERE pe.student_id=${alias}.id) AND NOT EXISTS(SELECT 1 FROM course_orders po WHERE po.student_id=${alias}.id) AND ${legacy}))`;
}
