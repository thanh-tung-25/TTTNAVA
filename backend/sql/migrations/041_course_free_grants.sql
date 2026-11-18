-- Individual gifts are independent of paid entitlements and existing learning data.
CREATE TABLE IF NOT EXISTS course_free_grants (
 id CHAR(36) PRIMARY KEY, student_id CHAR(36) NOT NULL, course_id VARCHAR(32) NOT NULL,
 starts_at DATETIME(3) NOT NULL, ends_at DATETIME(3) NOT NULL,
 granted_by CHAR(36) NULL, note VARCHAR(500) NOT NULL DEFAULT '', revoked_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY course_free_grant_student(student_id,course_id),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id),
 FOREIGN KEY(granted_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
