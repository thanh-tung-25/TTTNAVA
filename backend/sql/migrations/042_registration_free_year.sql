-- A separate policy record; do not edit profiles, enrollments, orders or learning tables.
CREATE TABLE IF NOT EXISTS course_registration_free (
 student_id CHAR(36) NOT NULL, course_id VARCHAR(32) NOT NULL,
 registered_at DATETIME(3) NOT NULL, ends_at DATETIME(3) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(student_id,course_id),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
