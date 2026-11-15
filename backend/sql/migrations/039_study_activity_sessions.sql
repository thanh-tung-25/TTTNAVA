CREATE TABLE study_activity_sessions (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL,
 activity VARCHAR(24) NOT NULL,
 source_id VARCHAR(80) NOT NULL,
 unit_key VARCHAR(30) NOT NULL,
 snapshot JSON NOT NULL,
 result JSON NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 completed_at DATETIME(3) NULL,
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id),
 INDEX study_activity_owner(profile_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
