// Shared aliases: c=course, e=original enrollment, a=paid origin,
// r=registration-year policy, g=individual free grant. Read-only predicates.
export const activeEnrollment=`e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP(3) AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP(3))`;
export const effectiveEnrollment=`(${activeEnrollment} AND (r.student_id IS NULL OR a.origin='momo'))`;
export const activeFreeGrant=`g.revoked_at IS NULL AND g.starts_at<=CURRENT_TIMESTAMP(3) AND g.ends_at>CURRENT_TIMESTAMP(3)`;
export const courseAccessCondition=`c.active=1 AND ((e.student_id IS NOT NULL AND ${effectiveEnrollment}) OR (${activeFreeGrant}))`;
