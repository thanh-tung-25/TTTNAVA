CREATE TABLE IF NOT EXISTS chinese_street_lessons (
 lesson_id CHAR(36) PRIMARY KEY,
 data JSON NOT NULL,revision INT UNSIGNED NOT NULL DEFAULT 1,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(lesson_id) REFERENCES chinese_lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_street_progress (
 student_id CHAR(36) NOT NULL,lesson_id CHAR(36) NOT NULL,
 mission_id VARCHAR(50) NOT NULL,content_hash CHAR(64) NOT NULL,
 wrong_count INT UNSIGNED NOT NULL DEFAULT 0,best_stars TINYINT UNSIGNED NOT NULL DEFAULT 0,
 last_request CHAR(36) NULL,last_choice VARCHAR(50) NULL,last_response JSON NULL,
 completed_at DATETIME(3) NULL,updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(student_id,lesson_id,mission_id,content_hash),
 INDEX street_recent(updated_at),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(lesson_id) REFERENCES chinese_lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
