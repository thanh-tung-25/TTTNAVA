-- One receipt per learner and free registration period. Existing rights stay intact.
CREATE TABLE IF NOT EXISTS course_free_registrations (
 student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 period_id CHAR(36) NOT NULL REFERENCES course_free_periods(id),
 registered_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(student_id,period_id), CHECK(ends_at>registered_at)
);
INSERT INTO course_free_registrations(student_id,period_id,registered_at,ends_at)
SELECT g.student_id,f.id,g.starts_at,g.ends_at FROM course_free_grants g
JOIN course_free_periods f ON f.course_id=g.course_id AND f.starts_at<=g.starts_at AND f.ends_at>g.starts_at
WHERE g.note='Đăng ký trong đợt miễn phí · 1 năm từ ngày đăng ký tài khoản'
AND (f.cancelled_at IS NULL OR f.cancelled_at>g.starts_at)
ON CONFLICT(student_id,period_id) DO NOTHING;
