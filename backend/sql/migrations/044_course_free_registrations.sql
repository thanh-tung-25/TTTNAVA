-- One receipt per learner and free registration period. Existing rights stay intact.
CREATE TABLE IF NOT EXISTS course_free_registrations (
 student_id CHAR(36) NOT NULL, period_id CHAR(36) NOT NULL,
 registered_at DATETIME(3) NOT NULL, ends_at DATETIME(3) NOT NULL,
 PRIMARY KEY(student_id,period_id),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(period_id) REFERENCES course_free_periods(id),
 CHECK(ends_at>registered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO course_free_registrations(student_id,period_id,registered_at,ends_at)
SELECT g.student_id,f.id,g.starts_at,g.ends_at FROM course_free_grants g
JOIN course_free_periods f ON f.course_id=g.course_id AND f.starts_at<=g.starts_at AND f.ends_at>g.starts_at
WHERE g.note='Đăng ký trong đợt miễn phí · 1 năm từ ngày đăng ký tài khoản'
AND (f.cancelled_at IS NULL OR f.cancelled_at>g.starts_at);
