-- Audio is never stored. Short text context is cleared on finish/expiry.
CREATE TABLE IF NOT EXISTS chinese_ai_chat_settings (
 lesson_id CHAR(36) PRIMARY KEY,
 data JSON NOT NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(lesson_id) REFERENCES chinese_lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_ai_chat_sessions (
 id CHAR(36) PRIMARY KEY,
 student_id CHAR(36) NOT NULL,
 lesson_id CHAR(36) NULL,
 level_id TINYINT UNSIGNED NOT NULL,
 lesson_title VARCHAR(255) NOT NULL,
 is_preview TINYINT UNSIGNED NOT NULL DEFAULT 0,
 status VARCHAR(16) NOT NULL DEFAULT 'active',
 turn_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 settings JSON NOT NULL,
 context JSON NULL,
 summary JSON NULL,
 last_request CHAR(36) NULL,
 last_hash CHAR(64) NULL,
 last_response JSON NULL,
 lease_id CHAR(36) NULL,
 lease_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 expires_at DATETIME(3) NOT NULL,
 completed_at DATETIME(3) NULL,
 INDEX ai_chat_student_day(student_id,created_at),
 INDEX ai_chat_expiry(status,expires_at),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(lesson_id) REFERENCES chinese_lessons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
